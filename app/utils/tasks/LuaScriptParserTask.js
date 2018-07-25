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

      const data = this.convertAstTree(luaAST.body[0], luaAST.comments);

      if (scripts.length % 500 === 0) {
        this.progress(scripts.length, filesList.size(), `Parsing ${filesList.size()} LUA scripts...`);
      }

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

    // Delete not found file data
    await this.deleteMissing(scripts, db.lua_scripts, definition.types, 'lua_scripts', args.filterTypes, args.paths);

    await this.saveChunked(scripts, db.lua_scripts, 0, 500);
    await this.saveChunked(relations, db.relations, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'lua_scripts');
  }

  convertAstTree(node, comments) {
    if (node.type === 'AssignmentStatement') {
      const name = node.variables[0].name;

      return {[name]: this.convertAstTree(node.init[0], comments)};
    }
    if (node.type === 'TableConstructorExpression') {
      let values = {};
      const arrayValues = [];
      node.fields.forEach(field => {
        if (field.type === 'TableValue') {
          arrayValues.push(field.value.value);
        } else {
          values[field.key.name] = this.convertAstTree(field.value, comments);
        }
      });
      if (arrayValues.length) {
        values = arrayValues;
      }
      return values;
    }
    if (node.type === 'TableKeyString') {
      return {
        [node.key.name]: node.value.value,
      };
    }
    if (node.type === 'StringKeyLiteral') {
      return node.value;
    }
    if (node.type === 'UnaryExpression') {
      const argument = this.convertAstTree(node.argument, comments);

      if (node.operator === '-') {
        argument.value = -argument.value;
        return argument;
      } else if (node.operator === '+') {
        return argument;
      }
    }
    if (node.type === 'NumericLiteral') {
      const comment = comments.find(x => x.loc.start.line === node.loc.start.line);

      return {
        value: node.value,
        comment: comment ? comment.value.trim() : null,
      };
    }
    if (node.type === 'StringLiteral') {
      const comment = comments.find(x => x.loc.start.line === node.loc.start.line);
      return {
        value: node.value,
        comment: comment ? comment.value.trim() : null,
      };
    }

    console.error(node);

    return {};
  }
}
