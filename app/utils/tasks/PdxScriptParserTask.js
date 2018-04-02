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
    const db = await JdxDatabase.get(args.root);
    this.progress(0, 1, 'Finding PDX scripts...');

    const files = await this.filterFilesByPath(db.files, args.definition.types, 'pdx_scripts', args.filterTypes, args.paths);
    const filesList = _(files);

    const scripts = [];
    const relations = [];
    filesList.each(path => {
      const parser = new PdxScript();
      const fullPath = args.root + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep);

      if (!jetpack.exists(fullPath)) {
        return;
      }

      const data = parser.readFile(iconv.decode(jetpack.read(fullPath, 'buffer'), 'win1252'));

      if (scripts.length % 500 === 0) {
        this.progress(scripts.length, filesList.size(), `Parsing ${filesList.size()} PDX scripts...`);
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
    });

    await this.saveChunked(scripts, db.pdx_scripts, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);
  }
}
