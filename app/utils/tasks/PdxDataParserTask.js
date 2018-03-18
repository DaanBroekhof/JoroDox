import JdxDatabase from '../JdxDatabase';
import PdxData from '../PdxData';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');
const minimatch = require('minimatch');

export default class PdxDataParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'PdxDataParserTask';
  }

  execute(args) {
    JdxDatabase.get(args.root).then(db => {
      this.progress(0, 1, 'Finding PDX data files...');

      const patterns = [];
      _(args.definition.types).forOwn((typeDefinition) => {
        if (typeDefinition.sourceType && typeDefinition.sourceType.id === 'pdx_data' && typeDefinition.sourceType.pathPattern) {
          patterns.push(typeDefinition.sourceType.pathPattern);
        }
      });

      db.files.filter(file => _(patterns).some(pattern => minimatch(file.path, pattern))).primaryKeys(files => {
        const filesList = _(files);

        this.progress(0, filesList.size(), `Parsing ${filesList.size()} PDX binary data files...`);

        const datafiles = [];
        const relations = [];
        filesList.each(filePath => {
          const parser = new PdxData();
          const data = parser.readFromBuffer(new Uint8Array(jetpack.read(args.root + syspath.sep + filePath.replace(new RegExp('/', 'g'), syspath.sep), 'buffer')).buffer);

          if (datafiles.length % 50 === 0) { this.progress(datafiles.length, filesList.size(), `Parsing ${filesList.size()} PDX binary data objects...`); }

          datafiles.push({path: filePath, data});
          relations.push(this.addRelationId({
            fromKey: 'pdxData', fromType: 'pdxData', fromId: filePath, toKey: 'file', toType: 'files', toId: filePath
          }));
        });

        Promise.all([
          this.saveChunked(datafiles, db.pdx_data, 0, 500),
          this.saveChunked(relations, db.relations, 0, 500),
        ]).then(result => {
          this.finish(result);
        }).catch(reason => {
          this.fail(reason.toString());
        });
      });
    });
  }

  static parseFile(root, path) {
    const parser = new PdxData();
    const data = parser.readFromBuffer(new Uint8Array(jetpack.read(root + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep), 'buffer')).buffer);

    return {path, data};
  }
}
