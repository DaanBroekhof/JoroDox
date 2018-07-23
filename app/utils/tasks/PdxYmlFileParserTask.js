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
    for (const path of files) {
      const filePath = args.project.rootPath + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep);
      const fileData = jetpack.read(filePath);
      const pdxYmlData = await this.parsePdxYml(args.project, fileData, path);

      if (results.length % 50 === 0) {
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
    }

    await this.saveChunked(results, db.pdxyml_files, 0, 5000);
    await this.saveChunked(relations, db.relations, 0, 5000);

    JdxDatabase.updateTypeIdentifiers(args.project, 'pdxyml_files');
  }

  // The .yml files are not quite YAML
  // - Added version number after the key ` KEY:VERSION_NR "VALUE"`
  // - Double quotes need not be escaped
  // - Backslashes need to be escaped (\\)
  // - Missing " at end allowed
  async parsePdxYml(project, data, path) {
    let currentCollection = null;
    const result = {};

    const entryRegex = /^\s(.+):([0-9]+)?\s*"(.*)"(\s*#\s*(.*))?\s*$/;
    const entryRegexNoEndQuote = /^\s(.+):([0-9]+)?\s*"(.*)[^"]\s*$/;

    // Remove UTF8 BOM >:(
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);

      /*
      // Not actually a warning or error?
      await JdxDatabase.addError(project, {
        message: `Unnecessary UTF8 BOM detected in \`${path}\`.`,
        path,
        errorType: 'YML_UNNECESSARY_UTF8_BOM',
        type: 'pdxyml_files',
        typeId: path,
        severity: 'warning',
      });
      this.sendResponse({errorsUpdate: true});
      */
    }

    const lines = data.split('\n');
    for (let lineNr = 0; lineNr < lines.length; lineNr += 1) {
      const line = lines[lineNr];
      let noEndQuote = false;
      // empty line (with a comment perhaps)
      if (line.match(/^\s*(#\s*(.*))?\s*$/u)) {
        continue;
      }

      // Entry line (with optional comment)
      let entryMatch = line.match(entryRegex);
      // No match? try detecting regex without ending quote
      if (!entryMatch) {
        noEndQuote = true;
        entryMatch = line.match(entryRegexNoEndQuote);
      }

      if (entryMatch) {
        if (!currentCollection) {
          await JdxDatabase.addError(project, {
            message: `Error parsing file \`${path}\`, line ${lineNr + 1}: No collection found before this line`,
            path,
            errorType: 'YML_NO_TYPE_BEFORE_LINE',
            type: 'pdxyml_files',
            typeId: path,
            severity: 'warning',
          });
          this.sendResponse({errorsUpdate: true});
          continue;
        }
        if (noEndQuote) {
          await JdxDatabase.addError(project, {
            message: `Warning: Missing end quote in file \`${path}\`, line ${lineNr + 1}`,
            path,
            errorType: 'YML_MISSING_END_QUOTE',
            type: 'pdxyml_files',
            typeId: path,
            severity: 'warning',
          });
          this.sendResponse({errorsUpdate: true});
        }

        result[currentCollection][entryMatch[1]] = {
          version: +entryMatch[2],
          value: entryMatch[3].replace('\\n', '\n').replace('\\\\', '\\'),
          comment: entryMatch[6],
        };
        continue;
      }

      // Collection start line
      const collectionMatch = line.match(/^(.+):\s*(#\s*(.*))?$/u);
      if (collectionMatch) {
        currentCollection = collectionMatch[1];
        result[currentCollection] = {};
        continue;
      }

      if (!entryMatch) {
        await JdxDatabase.addError(project, {
          message: `Error parsing file \`${path}\`, line ${lineNr + 1}: could not parse line`,
          path,
          errorType: 'YML_PARSE_ERROR',
          type: 'pdxyml_files',
          typeId: path,
          severity: 'error',
        });
        this.sendResponse({errorsUpdate: true});
      }
    }

    return result;
  }
}
