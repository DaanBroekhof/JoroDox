import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');

export default class PdxYmlFileParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'PdxYmlFileParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.root);
    this.progress(0, 1, 'Finding Paradox YML files...');

    const files = await this.filterFilesByPath(db.files, args.definition.types, 'pdxyml_files', args.filterTypes);
    const filesList = _(files);

    const results = [];
    const relations = [];
    filesList.each(file => {
      const filePath = args.root + syspath.sep + file.path.replace(new RegExp('/', 'g'), syspath.sep);
      const fileData = jetpack.read(filePath);
      const pdxYmlData = this.parsePdxYml(fileData, filePath);

      if (results.length % 500 === 0) { this.progress(results.length, filesList.size(), `Parsing ${filesList.size()} Paradox YML files...`); }

      results.push({path: file.path, data: pdxYmlData});
      relations.push(this.addRelationId({
        fromKey: 'pdxyml_files',
        fromType: 'pdxyml_files',
        fromId: file.path,
        toKey: 'file',
        toType: 'files',
        toId: file.path
      }));
    });

    await this.saveChunked(results, db.pdxyml_files, 0, 5000);
    await this.saveChunked(relations, db.relations, 0, 5000);
  }

  // The .yml files are not quite YAML
  // - Added version number after the key ` KEY:VERSION_NR "VALUE"`
  // - Double quotes need not be escaped
  // - Backslashes need to be escaped (\\)
  // - Missing " at end allowed
  parsePdxYml(data, filePath) {
    let type = null;
    const result = {};

    const entryRegex = /^\s(.+):([0-9]+)?\s*"(.*)("|[^"]$)(\s#\s*(.*))?$/;

    data.split('\n').forEach((line, lineNr) => {
      // empty line (with a comment perhaps)
      if (line.match(/^\s*(#\s*(.*))?$/u)) { return; }

      // Entry line (with optional comment)
      const entryMatch = line.match(entryRegex);
      if (entryMatch) {
        if (!type) {
          console.log(`Error parsing file \`${filePath}\`, line ${lineNr + 1}: No type found before this line`);
          return;
        }

        result[type][entryMatch[1]] = {
          version: +entryMatch[2],
          value: entryMatch[3].replace('\\n', '\n').replace('\\\\', '\\'),
          comment: entryMatch[6],
        };
      }

      // Collection start line
      const typeMatch = line.match(/^(.+):\s*(#\s*(.*))?$/u);
      if (typeMatch) {
        type = typeMatch[1];
        result[type] = {};
        return;
      }
      if (!entryMatch) {
        console.log(`Error parsing file \`${filePath}\`, line ${lineNr + 1}: could not parse line`);
      }
    });

    return result;
  }
}
