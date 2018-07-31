import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const _ = require('lodash');
const AdmZip = require('adm-zip');

export default class ZipParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'ZipParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = JdxDatabase.getDefinition(args.project.gameType);
    this.progress(0, 1, 'Finding Paradox ZIP files...');

    const files = await this.filterFilesByPath(db.files, definition.types, 'zips', args.filterTypes, args.paths);

    const results = [];
    const relations = [];
    for (const path of files) {
      const filePath = await JdxDatabase.makePathVirtual(args.project, path, true);
      const zip = new AdmZip(filePath);

      const zipData = {
        totalCompressed: 0,
        totalSize: 0,
        fileCount: 0,
        dirCount: 0,
        entries: [],
      };
      zip.getEntries().forEach(entry => {
        zipData.entries.push({
          path: entry.entryName,
          isDirectory: entry.isDirectory,
          compressedSize: entry.header.compressedSize,
          crc: entry.header.crc,
          size: entry.header.size,
          time: entry.header.time.toISOString()
        });

        zipData.totalCompressed += entry.header.compressedSize;
        zipData.totalSize += entry.header.size;
        zipData.fileCount += entry.isDirectory ? 0 : 1;
        zipData.dirCount += entry.isDirectory ? 1 : 0;
      });


      if (results.length % 50 === 0) {
        this.progress(results.length, files.length, `Parsing ${files.length} Zip files...`);
      }

      results.push({path, data: zipData});
      relations.push(this.addRelationId({
        fromKey: 'zips',
        fromType: 'zips',
        fromId: path,
        toKey: 'source',
        toType: 'files',
        toId: path
      }));
    }

    // Delete not found file data
    await this.deleteMissing(results, db.zips, definition.types, 'zips', args.filterTypes, args.paths);

    await this.saveChunked(results, db.zips, 0, 5000);
    await this.saveChunked(relations, db.relations, 0, 5000);

    JdxDatabase.updateTypeIdentifiers(args.project, 'zips');
  }
}
