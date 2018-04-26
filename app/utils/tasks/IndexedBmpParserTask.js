import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';
import IndexedBmpParserForkTask from './IndexedBmpParserForkTask';

const syspath = require('electron').remote.require('path');
const _ = require('lodash');

export default class IndexedBmpParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'IndexedBmpParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.root);
    this.progress(0, 1, 'Finding indexed BMP data files...');

    const files = await this.filterFilesByPath(db.files, args.definition.types, 'indexed_bmps', args.filterTypes, args.paths);

    this.progress(0, files.length, `Parsing ${files.length} indexed BMP data files...`);

    const datafiles = [];
    const relations = [];
    for (const path of files) {
      const fullPath = args.root + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep);
      const dataString = await IndexedBmpParserForkTask.start({path: fullPath});
      const data = JSON.parse(dataString);

      if (datafiles.length % 50 === 0) {
        this.progress(datafiles.length, files.length, `Parsing ${files.length} indexed BMP data objects...`);
      }

      datafiles.push({path, data});
      relations.push(this.addRelationId({
        fromKey: 'indexed_bmps', fromType: 'indexed_bmps', fromId: path, toKey: 'source', toType: 'files', toId: path
      }));
    }

    await this.saveChunked(datafiles, db.indexed_bmps, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);
  }
}
