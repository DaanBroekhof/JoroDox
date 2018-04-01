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
    const db = await JdxDatabase.get(args.root);
    this.progress(0, 1, 'Finding PDX data files...');

    const files = await this.filterFilesByPath(db.files, args.definition.types, 'pdx_data', args.filterTypes);
    const filesList = _(files);

    this.progress(0, filesList.size(), `Parsing ${filesList.size()} PDX binary data files...`);

    const datafiles = [];
    const relations = [];
    filesList.each(file => {
      const parser = new PdxData();

      const fullPath = args.root + syspath.sep + file.path.replace(new RegExp('/', 'g'), syspath.sep);
      const data = parser.readFromBuffer(new Uint8Array(jetpack.read(fullPath, 'buffer')).buffer);

      if (datafiles.length % 50 === 0) {
        this.progress(datafiles.length, filesList.size(), `Parsing ${filesList.size()} PDX binary data objects...`);
      }

      datafiles.push({path: file.path, data});
      relations.push(this.addRelationId({
        fromKey: 'pdxData', fromType: 'pdxData', fromId: file.path, toKey: 'file', toType: 'files', toId: file.path
      }));
    });

    await this.saveChunked(datafiles, db.pdx_data, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);
  }

  static parseFile(root, path) {
    const parser = new PdxData();
    const data = parser.readFromBuffer(new Uint8Array(jetpack.read(root + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep), 'buffer')).buffer);

    return {path, data};
  }
}
