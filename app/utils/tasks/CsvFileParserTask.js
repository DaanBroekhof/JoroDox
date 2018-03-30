import BackgroundTask from './BackgroundTask';
import JdxDatabase from '../JdxDatabase';
import PdxScript from '../PdxScript';
import Dexie from 'dexie/dist/dexie';
import FileView from '../../components/FileView';
import * as iconv from 'iconv-lite';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');
const minimatch = require('minimatch');
const csvparser = require('electron').remote.require('csv-parse');

export default class CsvFileParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'CsvFileParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.root);

    this.progress(0, 1, 'Finding CSV files...');

    const files = await this.filterFilesByPath(db.files, args.definition.types, 'csv_files', args.filterTypes);
    const filesList = _(files);

    const csvResults = [];
    const relations = [];
    for (const file of filesList) {
      const fullPath = args.root + syspath.sep + file.path.replace(new RegExp('/', 'g'), syspath.sep);
      const csvData = await new Promise((resolve, reject) => {
        csvparser(iconv.decode(jetpack.read(fullPath, 'buffer'), 'win1252'), {
          delimiter: ';',
          skip_empty_lines: true,
          relax_column_count: true,
        }, (error, data) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        });
      });

      const uniqueColumns = [];
      csvData[0].forEach(column => {
        let nr = 0;
        let newColumn = column;
        while (_.includes(uniqueColumns, newColumn)) {
          nr += 1;
          newColumn = column + '_' + nr;
        }
        uniqueColumns.push(newColumn);
      });
      const csvDataObject = _.map(csvData.slice(1), (row) => _.zipObject(uniqueColumns, row));

      if (csvResults.length % 500 === 0) {
        this.progress(csvResults.length, filesList.size(), `Parsing ${filesList.size()} CSV files...`);
      }

      csvResults.push({path: file.path, data: csvDataObject});
      relations.push(this.addRelationId({
        fromKey: 'csv_files',
        fromType: 'csv_files',
        fromId: file.path,
        toKey: 'file',
        toType: 'files',
        toId: file.path
      }));
    }

    await this.saveChunked(csvResults, db.csv_files, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);
  }
}
