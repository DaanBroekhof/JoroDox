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

export default class PdxYmlFileParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'PdxYmlFileParserTask';
  }

  execute(args) {
    JdxDatabase.get(args.root).then(db => {
      this.progress(0, 1, 'Finding Paradox YML files...');

      const patterns = [];
      const prefixes = [];
      _(args.definition.types).forOwn((typeDefinition) => {
        if (args.filterTypes && !_.includes(args.filterTypes, typeDefinition.id)) { return; }
        if (typeDefinition.sourceType && typeDefinition.sourceType.id === 'pdxyml_files' && typeDefinition.sourceType.pathPattern) {
          patterns.push(typeDefinition.sourceType.pathPattern.replace('{type.id}', typeDefinition.id));
          prefixes.push(typeDefinition.sourceType.pathPrefix.replace('{type.id}', typeDefinition.id));
        }
      });

      db.files.where('path').startsWithAnyOf(prefixes).filter(file => _(patterns).some(pattern => minimatch(file.path, pattern))).toArray(files => {
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

        Promise.all([
          this.saveChunked(results, db.pdxyml_files, 0, 5000),
          this.saveChunked(relations, db.relations, 0, 5000),
        ]).then(result => {
          this.finish(result);
        }).catch(reason => {
          this.fail(reason.toString());
        });
      });
    });
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
