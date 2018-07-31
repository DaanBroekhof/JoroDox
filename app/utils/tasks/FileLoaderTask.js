import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const fsutils = require('electron').remote.require('./utils/FsUtils');

const _ = require('lodash');
const minimatch = require('minimatch');

export default class FileLoaderTask extends DbBackgroundTask {
  static getTaskType() {
    return 'FileLoaderTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);

    console.log('args', args)

    const roots = {
      _game_: args.project.rootPath,
      _user_: args.project.userPath,
    };

    const filesDiff = {
      changed: [],
      added: [],
      deleted: [],
    };

    for (const [rootName, rootPath] of Object.entries(roots)) {

      if (!rootPath) {
        continue;
      }

      const localJetpack = jetpack.cwd(rootPath);

      this.progress(0, 1, 'Reading directory data...');

      let filesList = [];

      let searchPattern = null;
      let searchPath = null;
      if ((args.searchPattern || args.searchPath)) {
        searchPattern = '*';
        if (args.searchPattern && _.startsWith(args.searchPattern, rootName + '/')) {
          searchPattern = args.searchPattern.substring((rootName + '/').length);
        }
        searchPath = '.';
        if (args.searchPath && _.startsWith(args.searchPath, rootName + '/')) {
          searchPath = args.searchPath.substring((rootName + '/').length);
          searchPattern = searchPattern.replace(new RegExp(`^${_.escapeRegExp(searchPath)}`), '');
        }

        // No searchPath or searchPattern specifically for these files
        if (searchPattern === '*' && searchPath === '.') {
          continue;
        }

        const type = localJetpack.exists(searchPath);
        if (!type || type === 'other') {
          this.finish([]);
        }

        if (type === 'file') {
          filesList = [searchPath];
        } else {
          if (searchPath !== '.' && !searchPath.endsWith('/') && searchPattern !== '') {
            throw new Error('Path prefix `' + searchPath + '` should end with a /.');
          }

          filesList = await localJetpack.findAsync(searchPath, {
            matching: searchPattern,
            recursive: true,
            files: true,
            directories: true
          });
        }
      } else if (args.exactPaths) {
        filesList = args.exactPaths.filter(x => _.startsWith(x, rootName + '/')).map(x => x.substring((rootName + '/').length));
      }

      filesList = filesList.map(x => x.replace(/\\/g, '/'));

      if (args.typeDefinition) {
        filesList = filesList.filter(file => !args.typeDefinition.readerFileIgnore.some(x => minimatch(file, x)));
      }

      if (args.readerFileIgnore) {
        filesList = filesList.filter(file => !args.readerFileIgnore.some(x => minimatch(file, x)));
      }

      if (args.fileFilters) {
        filesList = filesList.filter(file => args.fileFilters.some(x => minimatch(file, x)));
      }

      const storedFilesMap = new Map();

      if (searchPath) {
        const storedFileData = await db.files.where('path').startsWithAnyOf(rootName + '/' + searchPath).toArray();

        storedFileData.forEach(f => {
          if (!searchPattern || minimatch(f.path, args.searchPattern)) {
            storedFilesMap.set(f.path, f.info.modifyTime);
          }
        });
      } else if (filesList.length) {
        const storedFileData = await db.files.where('path').startsWithAnyOf(filesList.map(x => rootName + '/' + x)).toArray();

        storedFileData.forEach(f => {
          storedFilesMap.set(f.path, f.info.modifyTime);
        });
      }

      this.progress(0, 1, 'Getting `' + rootName + '` file meta data...');

      const filesMetaData = JSON.parse(await fsutils.getFilesMetaData(rootPath, filesList)).map(x => {
        x.path = rootName + '/' + x.path;
        x.rootName = rootName;
        return x;
      });

      // Compare existing files with files in DB
      for (const fileMetaData of filesMetaData) {
        const storedFileModified = storedFilesMap.get(fileMetaData.path);
        if (!storedFileModified && fileMetaData.info) {
          filesDiff.added.push(fileMetaData);
        } else if (storedFileModified) {
          if (!fileMetaData.info) {
            filesDiff.deleted.push(fileMetaData.path);
          } else if (storedFileModified !== fileMetaData.info.modifyTime.toString()) {
            filesDiff.changed.push(fileMetaData);
          }
          storedFilesMap.delete(fileMetaData.path);
        }
      }

      // All files left are not found and thus deleted
      filesDiff.deleted.push(...storedFilesMap.keys());
    }

    console.log(filesDiff);

    this.progress(0, 1, 'Saving file data...');

    await this.deleteChunked(db.files.where('path').anyOf(filesDiff.deleted));

    await this.saveChunked(filesDiff.added, db.files, 0, 500);
    await this.saveChunked(filesDiff.changed, db.files, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'files');

    return filesDiff;
  }
}
