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

    const files = await this.filterFilesByPath(db.files, definition.types, 'pdx_data', args.filterTypes, args.paths);
    const filesList = _(files);

    this.progress(0, filesList.size(), `Parsing ${filesList.size()} PDX binary data files...`);

    const datafiles = [];
    const relations = [];
    filesList.each(async path => {
      const parser = new PdxData();

      const fullPath = args.project.rootPath + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep);
      const data = parser.readFromBuffer(new Uint8Array(jetpack.read(fullPath, 'buffer')).buffer);

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

      if (datafiles.length % 50 === 0) {
        this.progress(datafiles.length, filesList.size(), `Parsing ${filesList.size()} PDX binary data objects...`);
      }

      datafiles.push({path, data});
      relations.push(this.addRelationId({
        fromKey: 'pdx_data', fromType: 'pdx_data', fromId: path, toKey: 'source', toType: 'files', toId: path
      }));
    });

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
