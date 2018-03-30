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

export default class PdxScriptParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'PdxScriptParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.root);
    this.progress(0, 1, 'Finding PDX scripts...');

    const files = await this.filterFilesByPath(db.files, args.definition.types, 'pdx_scripts', args.filterTypes);
    const filesList = _(files);

    const scripts = [];
    const relations = [];
    filesList.each(file => {
      const parser = new PdxScript();
      const path = args.root + syspath.sep + file.path.replace(new RegExp('/', 'g'), syspath.sep);

      if (!jetpack.exists(path)) {
        return;
      }

      const data = parser.readFile(iconv.decode(jetpack.read(path, 'buffer'), 'win1252'));

      if (scripts.length % 500 === 0) {
        this.progress(scripts.length, filesList.size(), `Parsing ${filesList.size()} PDX scripts...`);
      }

      scripts.push({path: file.path, data});
      relations.push(this.addRelationId({
        fromKey: 'pdx_script',
        fromType: 'pdx_scripts',
        fromId: file.path,
        toKey: 'file',
        toType: 'files',
        toId: file.path
      }));
    });

    await this.saveChunked(scripts, db.pdx_scripts, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);
  }
}
