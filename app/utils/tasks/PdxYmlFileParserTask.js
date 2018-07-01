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
      const pdxYmlData = this.parsePdxYml(args.project, fileData, filePath);

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

    JdxDatabase.updateTypeIdentifiers(args.project, 'pdx_data');
  }

  // The .yml files are not quite YAML
  // - Added version number after the key ` KEY:VERSION_NR "VALUE"`
  // - Double quotes need not be escaped
  // - Backslashes need to be escaped (\\)
  // - Missing " at end allowed
  async parsePdxYml(project, data, filePath) {
    let type = null;
    const result = {};

    const entryRegex = /^\s(.+):([0-9]+)?\s*"(.*)"(\s*#\s*(.*))?\s*$/;
    const entryRegexNoEndQuote = /^\s(.+):([0-9]+)?\s*"(.*)[^"]\s*$/;

    // Remove UTF8 BOM >:(
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);

      await JdxDatabase.addError(project, {
        message: `UTF8 BOM detected in \`${filePath}\`.`,
        path: filePath,
        type: 'pdxyml_files',
        typeId: filePath,
        severity: 'warning',
      });
      this.sendResponse({errorsUpdate: true});
    }

    data.split('\n').forEach(async (line, lineNr) => {
      // empty line (with a comment perhaps)
      if (line.match(/^\s*(#\s*(.*))?\s*$/u)) {
        return;
      }

      // Entry line (with optional comment)
      let entryMatch = line.match(entryRegex);
      // No match? try detecting regex without ending quote
      if (!entryMatch) {
        await JdxDatabase.addError(project, {
          message: `Warning: Missing end quote in file \`${filePath}\`, line ${lineNr + 1}`,
          path: filePath,
          type: 'pdxyml_files',
          typeId: filePath,
          severity: 'warning',
        });
        this.sendResponse({errorsUpdate: true});
        entryMatch = line.match(entryRegexNoEndQuote);
      }

      if (entryMatch) {
        if (!type) {
          await JdxDatabase.addError(project, {
            message: `Error parsing file \`${filePath}\`, line ${lineNr + 1}: No type found before this line`,
            path: filePath,
            type: 'pdxyml_files',
            typeId: filePath,
            severity: 'warning',
          });
          this.sendResponse({errorsUpdate: true});
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
        await JdxDatabase.addError(project, {
          message: `Error parsing file \`${filePath}\`, line ${lineNr + 1}: could not parse line`,
          path: filePath,
          type: 'pdxyml_files',
          typeId: filePath,
          severity: 'error',
        });
        this.sendResponse({errorsUpdate: true});
      }
    });

    return result;
  }
}
