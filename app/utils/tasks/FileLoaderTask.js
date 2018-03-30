import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');
const minimatch = require('minimatch');

export default class FileLoaderTask extends DbBackgroundTask {
  static getFileType(info) {
    const fileTypeRegexes = {
      pdxScript: [
        /\.(asset|gfx|txt|gui)$/i
      ],
      pdxMesh: [
        /\.mesh$/i
      ],
      pdxAnim: [
        /\.anim$/i
      ],
      image: [
        /\.(png|jpg|bmp|tga)$/i
      ],
      collada: [
        /\.(dea)$/i
      ],
    };

    let type = '_unknown_';
    _(fileTypeRegexes).forOwn((patterns, patternType) => {
      if (_(patterns).find(p => p.test(info.name))) {
        type = patternType;
      }
    });

    return type;
  }

  static getTaskType() {
    return 'FileLoaderTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.root);

    this.progress(0, 1, 'Reading directory data...');

    const localJetpack = jetpack.cwd(args.root);

    const typeDefinition = args.typeDefinition;

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

    let files = [];
    if (type === 'file') {
      files = [searchPath];
    } else if (type === 'dir') {
      files = await localJetpack.findAsync(searchPath, {
        matching: searchPattern,
        recursive: true,
        files: true,
        directories: true
      });
    }

    let filesList = _(files).filter(file => !typeDefinition.readerFileIgnore.some(x => minimatch(file, x)));

    if (args.fileFilters) {
      filesList = filesList.filter(file => args.fileFilters.some(x => minimatch(file, x)));
    }

    this.progress(0, filesList.size(), `Adding ${filesList.size()} file meta data items...`);

    let nr = 0;
    const filesRemapped = filesList.map(file => {
      nr += 1;
      if (nr % 1000 === 0) {
        this.progress(nr, filesList.size(), `Adding ${filesList.size()} file meta data items...`);
      }

      // TODO: Make this async as well!
      const info = localJetpack.inspect(file, {times: true});

      return {
        path: file.replace(new RegExp(`\\${syspath.sep}`, 'g'), '/'),
        info,
        // type: FileLoaderTask.getFileType(info),
      };
    });

    await this.saveChunked(filesRemapped.value(), db.files, 0, 500);
  }
}
