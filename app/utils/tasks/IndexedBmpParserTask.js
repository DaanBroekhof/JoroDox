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
    const db = await JdxDatabase.get(args.project);
    const definition = JdxDatabase.getDefinition(args.project.gameType);
    this.progress(0, 1, 'Finding indexed BMP data files...');

    const files = _.keys(await this.filterFilesByPath(db.files, definition.types, 'indexed_bmps', args.filterTypes, args.paths));

    this.progress(0, files.length, `Parsing ${files.length} indexed BMP data files...`);

    const datafiles = [];
    const relations = [];
    for (const path of files) {
      const fullPath = args.project.rootPath + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep);
      const dataString = await IndexedBmpParserForkTask.start({path: fullPath});
      const data = JSON.parse(dataString);

      if (datafiles.length % Math.floor(files.length / this.progressReportRate) === 0) {
        this.progress(datafiles.length, files.length, `Parsing ${files.length} indexed BMP data objects...`);
      }

      datafiles.push({path, data});
      relations.push(this.addRelationId({
        fromKey: 'indexed_bmps', fromType: 'indexed_bmps', fromId: path, toKey: 'source', toType: 'files', toId: path
      }));
    }

    // Delete not found file data
    await this.deleteMissing(datafiles, db.indexed_bmps, definition.types, 'indexed_bmps', args.filterTypes, args.paths);

    await this.saveChunked(datafiles, db.indexed_bmps, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'indexed_bmps');
  }
}
