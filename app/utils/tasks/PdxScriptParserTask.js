import JdxDatabase from '../JdxDatabase';
import PdxScript from '../PdxScript';
import * as iconv from 'iconv-lite';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');

export default class PdxScriptParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'PdxScriptParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = JdxDatabase.getDefinition(args.project.gameType);
    this.progress(0, 1, 'Finding PDX scripts...');

    const files = _.keys(await this.filterFilesByPath(db.files, definition.types, 'pdx_scripts', args.filterTypes, args.paths));

    const scripts = [];
    const relations = [];
    for (const path of files) {
      const parser = new PdxScript();
      const fullPath = args.project.rootPath + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep);

      if (!jetpack.exists(fullPath)) {
        return;
      }

      const data = parser.readFile(iconv.decode(jetpack.read(fullPath, 'buffer'), 'win1252'));

      if (parser.errors && parser.errors.length > 0) {
        parser.errors.forEach(async (err) => {
          await JdxDatabase.addError(args.project, {
            message: err,
            path,
            type: 'pdx_scripts',
            typeId: path,
            severity: 'error',
          });
          this.sendResponse({errorsUpdate: true});
        });
        console.error(`"Error(s) parsing '${path}'`, parser.errors);
      }

      if (scripts.length % Math.floor(files.length / this.progressReportRate) === 0) {
        this.progress(scripts.length, files.length, `Parsing ${files.length} PDX scripts...`);
      }

      scripts.push({path, data});
      relations.push(this.addRelationId({
        fromKey: 'pdx_script',
        fromType: 'pdx_scripts',
        fromId: path,
        toKey: 'source',
        toType: 'files',
        toId: path
      }));
    }

    // Delete not found file data
    await this.deleteMissing(scripts, db.pdx_scripts, definition.types, 'pdx_scripts', args.filterTypes, args.paths);

    await this.saveChunked(scripts, db.pdx_scripts, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'pdx_scripts');
  }
}
