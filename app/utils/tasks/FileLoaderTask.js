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

      if (args.exactPaths) {
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

    const storedFileData = await db.files.where('path').startsWithAnyOf(filesList).toArray();

    const storedFilesMap = new Map();
    storedFileData.forEach(f => {
      storedFilesMap.set(f.path, f.info.modifyTime);
    });

    this.progress(0, 1, 'Getting file meta data...');

    const filesMetaData = JSON.parse(await fsutils.getFilesMetaData(args.project.rootPath, filesList));

    const filesDiff = {
      changed: [],
      added: [],
      deleted: [],
    };

    for (const fileMetaData of filesMetaData) {
      const storedFileModified = storedFilesMap.get(fileMetaData.path);
      if (!storedFileModified && fileMetaData.info) {
        filesDiff.added.push(fileMetaData);
      } else if (storedFileModified) {
        if (!fileMetaData.info) {
          filesDiff.deleted.push(fileMetaData);
          filesDiff.deleted.push(...storedFileData.filter(x => _.startsWith(x.path, fileMetaData.path + '/')));
        } else if (storedFileModified !== fileMetaData.info.modifyTime.toString()) {
          filesDiff.changed.push(fileMetaData);
        }
      }
    }

    this.progress(0, 1, 'Saving file data...');

    const deletePaths = filesDiff.deleted.map(x => x.path);

    await this.deleteChunked(db.files.where('path').anyOf(deletePaths));

    await this.saveChunked(filesDiff.added, db.files, 0, 500);
    await this.saveChunked(filesDiff.changed, db.files, 0, 500);

    return filesDiff;
  }
}
