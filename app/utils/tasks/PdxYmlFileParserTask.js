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
    const db = await JdxDatabase.get(args.project);
    const definition = JdxDatabase.getDefinition(args.project.gameType);
    this.progress(0, 1, 'Finding Paradox YML files...');

    const files = await this.filterFilesByPath(db.files, definition.types, 'pdxyml_files', args.filterTypes, args.paths);
    const filesList = _(files);

    const results = [];
    const relations = [];
    filesList.each(path => {
      const filePath = args.project.rootPath + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep);
      const fileData = jetpack.read(filePath);
      const pdxYmlData = this.parsePdxYml(fileData, filePath);

      if (results.length % 500 === 0) {
        this.progress(results.length, filesList.size(), `Parsing ${filesList.size()} Paradox YML files...`);
      }

      results.push({path, data: pdxYmlData});
      relations.push(this.addRelationId({
        fromKey: 'pdxyml_files',
        fromType: 'pdxyml_files',
        fromId: path,
        toKey: 'source',
        toType: 'files',
        toId: path
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

    const entryRegex = /^\s(.+):([0-9]+)?\s*"(.*)"(\s*#\s*(.*))?\s*$/;
    const entryRegexNoEndQuote = /^\s(.+):([0-9]+)?\s*"(.*)[^"]\s*$/;

    // Remove UTF8 BOM >:(
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }

    data.split('\n').forEach((line, lineNr) => {
      // empty line (with a comment perhaps)
      if (line.match(/^\s*(#\s*(.*))?\s*$/u)) {
        return;
      }

      // Entry line (with optional comment)
      let entryMatch = line.match(entryRegex);
      // No match? try detecting regex without ending quote
      if (!entryMatch) {
        entryMatch = line.match(entryRegexNoEndQuote);
      }

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
        console.error(`Error parsing file \`${filePath}\`, line ${lineNr + 1}: could not parse line`);
        console.log(line);
      }
    });

    return result;
  }
}
