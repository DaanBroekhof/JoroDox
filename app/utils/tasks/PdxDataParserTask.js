import JdxDatabase from '../JdxDatabase';
import PdxData from '../PdxData';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');

export default class PdxDataParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'PdxDataParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = JdxDatabase.getDefinition(args.project.gameType);
    this.progress(0, 1, 'Finding PDX data files...');

    const files = _.keys(await this.filterFilesByPath(db.files, definition.types, 'pdx_data', args.filterTypes, args.paths));

    this.progress(0, files.length, `Parsing ${files.length} PDX binary data files...`);

    const datafiles = [];
    const relations = [];
    const foundPaths = [];
    for (const path of files) {
      const parser = new PdxData();

      const fullPath = args.project.rootPath + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep);
      let data = null;
      try {
        data = parser.readFromBuffer(new Uint8Array(jetpack.read(fullPath, 'buffer')).buffer);
      } catch (e) {
        console.error(`"Error( parsing '${path}'`, e.toString());
        continue;
      }

      if (parser.errors && parser.errors.length > 0) {
        parser.errors.forEach(async (err) => {
          await JdxDatabase.addError(args.project, {
            message: err,
            path,
            type: 'pdx_data',
            typeId: path,
            severity: 'error',
          });
          this.sendResponse({errorsUpdate: true});
        });
        console.error(`"Error(s) parsing '${path}'`, parser.errors);
      }

      if (datafiles.length % Math.floor(files.length / this.progressReportRate) === 0) {
        this.progress(datafiles.length, files.length, `Parsing ${files.length} PDX binary data objects...`);
      }

      foundPaths.push(path);
      datafiles.push({path, data});
      relations.push(this.addRelationId({
        fromKey: 'pdx_data', fromType: 'pdx_data', fromId: path, toKey: 'source', toType: 'files', toId: path
      }));
    }

    // Delete not found file data
    await this.deleteMissing(datafiles, db.pdx_data, definition.types, 'pdx_data', args.filterTypes, args.paths);

    await this.saveChunked(datafiles, db.pdx_data, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'pdx_data');
  }

  static parseFile(root, path) {
    const parser = new PdxData();
    const data = parser.readFromBuffer(new Uint8Array(jetpack.read(root + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep), 'buffer')).buffer);

    return {path, data};
  }
}
