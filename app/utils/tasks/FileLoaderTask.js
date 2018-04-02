import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');
const minimatch = require('minimatch');

export default class FileLoaderTask extends DbBackgroundTask {
  static getTaskType() {
    return 'FileLoaderTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.root);
    const localJetpack = jetpack.cwd(args.root);

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
        filesList = _([searchPath]);
      } else {
        filesList = _(await localJetpack.findAsync(searchPath, {
          matching: searchPattern,
          recursive: true,
          files: true,
          directories: true
        }));
      }
    } else if (args.exactPaths) {
      filesList = _(args.exactPaths);
    }

    filesList = filesList.map(x => x.replace(/\\/g, '/'));

    if (args.typeDefinition) {
      filesList = filesList.filter(file => !args.typeDefinition.readerFileIgnore.some(x => minimatch(file, x)));
    }

    if (args.fileFilters) {
      filesList = filesList.filter(file => args.fileFilters.some(x => minimatch(file, x)));
    }

    const storedFileData = await db.files.where('path').startsWithAnyOf(filesList.value()).toArray();
    const storedFiles = _.keyBy(storedFileData, 'path');

    const filesMetaData = this.getFilesMetaData(args.root, filesList);

    const filesDiff = {
      changed: [],
      added: [],
      deleted: [],
    };

    filesMetaData.forEach(fileMetaData => {
      const storedFile = storedFiles[fileMetaData.path];
      if (!storedFile && fileMetaData.info) {
        filesDiff.added.push(fileMetaData);
      } else if (storedFile) {
        if (!fileMetaData.info) {
          filesDiff.deleted.push(fileMetaData);
          filesDiff.deleted.push(...storedFileData.filter(x => _.startsWith(x.path, fileMetaData.path + '/')));
        } else if (!_.eq(storedFile.info, fileMetaData.info)) {
          filesDiff.changed.push(fileMetaData);
        }
      }
    });

    const deletePaths = filesDiff.deleted.map(x => x.path);

    await this.deleteChunked(db.files.where('path').anyOf(deletePaths));

    await this.saveChunked(filesDiff.added, db.files, 0, 500);
    await this.saveChunked(filesDiff.changed, db.files, 0, 500);

    return filesDiff;
  }

  getFilesMetaData(root, filesList) {
    const localJetpack = jetpack.cwd(root);

    this.progress(0, filesList.size(), `Reading ${filesList.size()} file meta entries...`);

    let nr = 0;
    const filesMetaData = filesList.map(file => {
      nr += 1;
      if (nr % 1000 === 0) {
        this.progress(nr, filesList.size(), `Reading ${filesList.size()} file meta entries...`);
      }

      // TODO: Make this async as well!
      const info = localJetpack.inspect(file, {times: true});

      return {
        path: file.replace(new RegExp(`\\${syspath.sep}`, 'g'), '/'),
        info,
        // type: FileLoaderTask.getFileType(info),
      };
    });

    return filesMetaData;
  }
}
