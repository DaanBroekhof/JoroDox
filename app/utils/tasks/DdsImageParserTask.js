import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const _ = require('lodash');

export default class DdsImageParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'DdsImageParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = JdxDatabase.getDefinition(args.project.gameType);
    this.progress(0, 1, 'Finding DDS image files...');

    const files = await this.filterFilesByPath(db.files, definition.types, 'dds_images', args.filterTypes, args.paths);

    this.progress(0, files.length, `Parsing ${files.length} DDS image files...`);

    const datafiles = [];
    const relations = [];
    for (const path of files) {
      // TODO: add DDS info parsing (size, type, mipmaps, etc)
      const data = {};

      if (datafiles.length % Math.floor(files.length / this.progressReportRate) === 0) {
        this.progress(datafiles.length, files.length, `Parsing ${files.length} DDS images...`);
      }

      datafiles.push({path, data});
      relations.push(this.addRelationId({
        fromKey: 'dds_images', fromType: 'dds_images', fromId: path, toKey: 'source', toType: 'files', toId: path
      }));
    }

    // Delete not found file data
    await this.deleteMissing(datafiles, db.dds_images, definition.types, 'dds_images', args.filterTypes, args.paths);

    await this.saveChunked(datafiles, db.dds_images, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'dds_images');
  }
}
