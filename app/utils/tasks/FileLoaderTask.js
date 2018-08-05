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
    const localJetpack = jetpack.cwd(args.project.rootPath);

    this.progress(0, 1, 'Reading directory data...');

    let filesList = [];

    if (args.filterType) {
      const type = JdxDatabase.getDefinition(args.project.gameType).types.find(x => x.id === args.filterType);

      if (type.sourceType.path) {
        args.searchPath = type.sourceType.path.replace('{type.id}', type.id);
      }
      if (type.sourceType.pathPrefix) {
        args.searchPath = type.sourceType.pathPrefix.replace('{type.id}', type.id);
      }
      if (type.sourceType.pathPattern) {
        args.searchPattern = type.sourceType.pathPattern.replace('{type.id}', type.id);
      }
    }
    if (args.filterTypes) {
      const definition = JdxDatabase.getDefinition(args.project.gameType);

      args.searchPattern = '*';
      args.searchPath = '.';
      args.fileFilters = [];

      definition.types.filter(x => args.filterTypes.includes(x.id)).forEach((type) => {
        if (type.sourceType.path) {
          args.fileFilters.push(type.sourceType.path.replace('{type.id}', type.id));
        }
        if (type.sourceType.pathPattern) {
          args.fileFilters.push(type.sourceType.pathPattern.replace('{type.id}', type.id));
        }
      });
    }

    if (args.searchPattern || args.searchPath) {
      let searchPattern = '*';
      if (args.searchPattern) {
        searchPattern = args.searchPattern;
      }
      let searchPath = '.';
      if (args.searchPath) {
        searchPath = args.searchPath;
        searchPattern = searchPattern.replace(new RegExp(`^${_.escapeRegExp(searchPath)}`), '');
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
      filesList = args.exactPaths;
    }

    filesList = filesList.map(x => x.replace(/\\/g, '/'));

    if (args.typeDefinition) {
      filesList = filesList.filter(file => !args.typeDefinition.readerFileIgnore.some(x => minimatch(file, x)));
    }

    if (args.fileFilters) {
      filesList = filesList.filter(file => args.fileFilters.some(x => minimatch(file, x)));
    }

    const storedFilesMap = new Map();

    if (args.searchPath) {
      const storedFileData = await db.files.where('path').startsWithAnyOf(args.searchPath).toArray();

      storedFileData.forEach(f => {
        if (!args.searchPattern || minimatch(f.path, args.searchPattern)) {
          storedFilesMap.set(f.path, f.info.modifyTime);
        }
      });
    } else if (args.exactPaths) {
      const storedFileData = await db.files.where('path').startsWithAnyOf(filesList).toArray();

      storedFileData.forEach(f => {
        storedFilesMap.set(f.path, f.info.modifyTime);
      });
    }

    this.progress(0, 1, 'Getting file meta data...');

    const filesMetaData = JSON.parse(await fsutils.getFilesMetaData(args.project.rootPath, filesList));

    const filesDiff = {
      changed: [],
      added: [],
      deleted: [],
    };

    // Compare existing files with files in DB
    for (const fileMetaData of filesMetaData) {
      const storedFileModified = storedFilesMap.get(fileMetaData.path);
      if (!storedFileModified && fileMetaData.info) {
        filesDiff.added.push(fileMetaData);
      } else if (storedFileModified) {
        if (!fileMetaData.info || !fileMetaData.info.modifyTime) {
          filesDiff.deleted.push(fileMetaData.path);
        } else if (storedFileModified !== fileMetaData.info.modifyTime.toString()) {
          filesDiff.changed.push(fileMetaData);
        }
        storedFilesMap.delete(fileMetaData.path);
      }
    }

    // All files left are not found and thus deleted
    filesDiff.deleted.push(...storedFilesMap.keys());

    this.progress(0, 1, 'Saving file data...');

    await this.deleteChunked(db.files.where('path').anyOf(filesDiff.deleted));

    await this.saveChunked(filesDiff.added, db.files, 0, 500);
    await this.saveChunked(filesDiff.changed, db.files, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'files');

    return filesDiff;
  }
}
