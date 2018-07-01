import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');
const luaparser = require('luaparse');

export default class LuaScriptParserTask extends DbBackgroundTask {
  static getTaskType() {
    return 'LuaScriptParserTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = JdxDatabase.getDefinition(args.project.gameType);
    this.progress(0, 1, 'Finding LUA scripts...');

    const files = await this.filterFilesByPath(db.files, definition.types, 'lua_scripts', args.filterTypes, args.paths);

    const filesList = _(files);

    const scripts = [];
    const relations = [];
    filesList.each(path => {
      const luaAST = luaparser.parse(jetpack.read(args.project.rootPath + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep)), {locations: true});

      const data = this.convertAstTree(luaAST.body[0], '', luaAST.comments);

      if (scripts.length % 500 === 0) { this.progress(scripts.length, filesList.size(), `Parsing ${filesList.size()} LUA scripts...`); }

      scripts.push({path, data});
      relations.push(this.addRelationId({
        fromKey: 'lua_script',
        fromType: 'lua_scripts',
        fromId: path,
        toKey: 'source',
        toType: 'files',
        toId: path
      }));
    });


    await this.saveChunked(scripts, db.lua_scripts, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'lua_scripts');
  }

  convertAstTree(node, prefix, comments) {
    if (node.type === 'AssignmentStatement') {
      const name = node.variables[0].name;

      return this.convertAstTree(node.init[0], `${name}.`, comments);
    } else if (node.type === 'TableConstructorExpression') {
      const values = {};
      const arrayValues = [];
      node.fields.forEach(field => {
        if (field.type === 'TableValue') {
          arrayValues.push(field.value.value);
        } else {
          _.assign(values, this.convertAstTree(field.value, `${prefix + field.key.name}.`, comments));
        }
      });
      if (arrayValues) {
        values[_.trim(prefix, '.')] = arrayValues;
      }
      return values;
    } else if (node.type === 'TableKeyString') {
      return {
        [prefix + node.key.name]: node.value.value,
      };
    } else if (node.type === 'StringKeyLiteral') {
      return {
        [prefix]: node.value,
      };
    } else if (node.value) {
      const comment = comments.find(x => x.loc.start.line === node.loc.start.line);
      return {
        [prefix.substring(0, prefix.length - 1)]: {
          value: node.value,
          comment: comment ? comment.value : null,
        },
      };
    }

    return {};
  }
}
