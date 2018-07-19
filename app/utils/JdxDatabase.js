import Dexie from 'dexie';

import _ from 'lodash';
import StructureLoaderTask from './tasks/StructureLoaderTask';
import FileLoaderTask from './tasks/FileLoaderTask';
import PdxScriptParserTask from './tasks/PdxScriptParserTask';
import PdxDataParserTask from './tasks/PdxDataParserTask';
import LuaScriptParserTask from './tasks/LuaScriptParserTask';
import CsvFileParserTask from './tasks/CsvFileParserTask';
import PdxYmlFileParserTask from './tasks/PdxYmlFileParserTask';
import IndexedBmpParserTask from './tasks/IndexedBmpParserTask';
import DdsImageParserTask from './tasks/DdsImageParserTask';
import DeleteRelatedTask from './tasks/DeleteRelatedTask';
import DbBackgroundTask from './tasks/DbBackgroundTask';
import ForegroundTask from './tasks/ForegroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const {app, process} = require('electron').remote;

export default class JdxDatabase {
  static db = {};
  static globalDb = null;
  static allIdentifiersCache = {};

  static parserToTask = {
    StructureLoader: StructureLoaderTask,
    FileLoader: FileLoaderTask,
    PdxScriptParser: PdxScriptParserTask,
    PdxDataParser: PdxDataParserTask,
    LuaScriptParser: LuaScriptParserTask,
    CsvFileParser: CsvFileParserTask,
    PdxYmlFileParser: PdxYmlFileParserTask,
    IndexedBmpParser: IndexedBmpParserTask,
    DdsImageParser: DdsImageParserTask,
    DeleteRelated: DeleteRelatedTask,
  };


  static GLOBAL_DB_NAME = 'JdxGlobal';

  static async getGlobalDb() {
    if (JdxDatabase.globalDb) {
      return JdxDatabase.globalDb;
    }

    const globalStores = {
      projects: ['id', 'name'].join(','),
    };

    JdxDatabase.globalDb = await JdxDatabase.loadDbWithStores(JdxDatabase.GLOBAL_DB_NAME, globalStores);

    return JdxDatabase.globalDb;
  }

  static async clearProjectDatabases() {
    const dbNames = new Set(await Dexie.getDatabaseNames());
    const projects = await (await JdxDatabase.getProjects()).toArray();

    dbNames.delete(JdxDatabase.GLOBAL_DB_NAME);
    projects.forEach(project => {
      dbNames.delete(this.projectToDbName(project));
    });

    dbNames.forEach(dbName => {
      console.log('Deleting ' + dbName);
      Dexie.delete(dbName);
    });
  }

  static async getProjects() {
    const db = await JdxDatabase.getGlobalDb();
    return await db.projects;
  }

  static async getAllDatabases() {
    return Dexie.getDatabaseNames();
  }

  static projectToDbName(project) {
    const rootHash = project.id;

    return `JdxDatabase-${rootHash}`;
  }

  static async loadDbWithStores(dbName, stores) {

    const task = ForegroundTask.start({taskTitle: 'Initializing...'});

    task.progress(0, 1, 'Opening databases...');

    const db = new Dexie(dbName, {allowEmptyDB: true});
    console.log('Loading DB `' + dbName + '`');
    // Hacky way to allow empty DB editing
    /* eslint no-underscore-dangle: ["error", { "allow": ["db", "_allowEmptyDB"] }] */
    db._allowEmptyDB = true;

    // Gather current existing stores
    const currentStores = [];
    await db.open();

    let currentVerNo = db.verno;
    db.tables.forEach(table => {
      const primKeyAndIndexes = [table.schema.primKey].concat(table.schema.indexes);
      const schemaSyntax = primKeyAndIndexes.map(index => index.src).join(',');
      const primaryKey = schemaSyntax.split(',')[0];
      currentStores[table.name] = [primaryKey].concat(schemaSyntax.split(',').slice(1).sort()).join(',');
    });
    db.close();

    // Compare existing stores with desired stores
    const newStores = {};
    const deleteStores = {};
    _(stores).forOwn((v, k) => {
      if (!currentStores[k]) {
        newStores[k] = v;
      } else if (currentStores[k] !== v) {
        deleteStores[k] = null;
        newStores[k] = v;
      }
    });
    _(currentStores).forOwn((v, k) => {
      if (!stores[k]) {
        deleteStores[k] = null;
      }
    });

    // Remove/Delete stores that are changed
    db.version(currentVerNo).stores(currentStores);
    if (_(deleteStores).size()) {
      currentVerNo += 1;
      db.version(currentVerNo).stores(deleteStores);
      console.log('Deleting stores:', deleteStores);
    }
    if (_(newStores).size()) {
      currentVerNo += 1;
      db.version(currentVerNo).stores(newStores);
      console.log('Creating stores:', newStores);
    }
    console.log('Loaded DB `' + dbName + '`');

    return db.open().then((result) => {
      task.finish();

      return result;
    });
  }

  static async get(project) {
    if (this.db[project.id] && this.db[project.id].isOpen()) {
      return Promise.resolve(this.db[project.id]);
    }
    const root = project.rootPath;
    const definition = this.getDefinition(project.gameType);

    // Create all definitions
    const relationDefinition = _.join([
      '++id', 'fromType', 'fromKey', '[fromType+fromId]',
      '[fromType+fromId+fromKey]', 'toType', 'toKey', '[toType+toId]', '[toType+toId+toKey]'
    ], ',');

    // Default stores:
    let stores = {
      settings: '++key',
      relations: relationDefinition,
      jdx_errors: ['++id', 'creationTime', 'message', 'path', 'type', 'typeId', 'severity', '[type+typeId]'].join(','),
    };

    // Stores per definition type
    _(definition.types).forEach(type => {
      stores[type.id] = `++${type.primaryKey}${type.indexedKeys ? `,${type.indexedKeys.join(',')}` : ''}`;
      if (type.sourceTransform && type.sourceTransform.relationsStorage && type.sourceTransform.relationsStorage !== false) {
        // Relation table just for this type
        stores[type.sourceTransform.relationsStorage] = relationDefinition;
      }
    });
    // Clean up store definitions so index order does not matter
    stores = _(stores).mapValues(x => x.split(',').sort().join(',')).value();

    const dbName = this.projectToDbName(project);
    this.db[project.id] = await JdxDatabase.loadDbWithStores(dbName, stores);

    return this.db[project.id];
  }

  static async clearAll(project) {
    this.db = {};
    console.log(this.projectToDbName(project));
    return Dexie.delete(this.projectToDbName(project));
  }

  static getSourceTypePath(type, defaultPath) {
    if (type.sourceType && type.sourceType.path) {
      return type.sourceType.path.replace('{type.id}', type.id);
    } else {
      return defaultPath.replace('{type.id}', type.id);
    }
  }

  static async loadTypeFiles(project, typeId, taskTitle) {
    const definition = this.getDefinition(project.gameType);

    const type = _(definition.types).find(x => x.id === typeId);

    return FileLoaderTask.start({
      taskTitle,
      project,
      typeDefinition: _(definition.types).find(x => x.id === 'files'),
      searchPattern: this.getSourceTypePath(type, type.sourceType.pathPattern),
      searchPath: this.getSourceTypePath(type, type.sourceType.pathPrefix),
    });
  }

  static async loadPdxScriptFiles(project, typeId, taskTitle) {
    const type = _(project.definition.types).find(x => x.id === typeId);
    const root = project.rootPath;
    const definition = this.getDefinition(project.gameType);

    return PdxScriptParserTask.start({
      taskTitle,
      project,
      filterTypes: [type.id],
    });
  }

  static async loadByPaths(project, paths, typeIds, taskTitle) {
    if (!taskTitle) {
      taskTitle = 'Loading from paths...';
    }
    const definition = this.getDefinition(project.gameType);

    let result = null;
    if (paths === null) {
      result = await FileLoaderTask.start({taskTitle, project, searchPath: '.', typeDefinition: definition.types.find(x => x.id === 'files')});
    } else {
      result = await FileLoaderTask.start({taskTitle, project, exactPaths: paths, typeDefinition: definition.types.find(x => x.id === 'files')});
    }

    if (result.deleted.length || result.changed.length) {
      const deleted = await DeleteRelatedTask.start({
        taskTitle,
        project,
        type: 'files',
        typeIds: [...result.deleted, ...result.changed].map(x => x.path),
      });
      console.log(deleted + ' deleted');
    }

    const types = definition.types.filter(x => typeIds === null || typeIds.indexOf(x.id) !== -1);

    if (result.added.length || result.changed.length) {
      const updatePaths = [...result.added, ...result.changed];
      const updateByType = {};

      types.forEach((type) => {
        if (type.sourceType) {
          const typePaths = DbBackgroundTask.filterPaths(type, updatePaths.map(x => x.path));
          if (typePaths.length === 0) {
            return;
          }
          updateByType[type.id] = {
            paths: typePaths,
            executed: false,
            source: type.sourceType.id,
          };

          if (!updateByType[type.sourceType.id]) {
            updateByType[type.sourceType.id] = {
              paths: [],
              executed: false,
              source: false,
            };
          }
          updateByType[type.sourceType.id].paths = _.uniq(_.union(updateByType[type.sourceType.id].paths, typePaths));
        }
      });

      // Simple solution - only two stages of resolution :/ without-source and with-source
      // TODO: Fixme~ ^
      for (const type in updateByType) {
        if (!updateByType[type].source) {
          await this.reloadTypePaths(project, type, updateByType[type].paths);
          this.updateTypeIdentifiers(project, type);
        }
      }
      for (const type in updateByType) {
        if (updateByType[type].source) {
          await this.reloadTypePaths(project, type, updateByType[type].paths);
          this.updateTypeIdentifiers(project, type);
        }
      }

      return updateByType;
    }

    return {};
  }

  static async reloadTypePaths(project, typeId, paths, taskTitle) {
    const definition = this.getDefinition(project.gameType);
    const type = _(definition.types).find(x => x.id === typeId);

    if (!taskTitle) {
      taskTitle = 'Reload `' + typeId + '`';
    }

    if (this.parserToTask[type.reader]) {
      return this.parserToTask[type.reader].start({
        taskTitle,
        project,
        definition: type,
        typeDefinition: type,
        paths,
      });
    }

    return Promise.reject(new Error(`Unknown reader: ${type.reader}`));
  }

  static async reloadTypesByIds(project, types) {
    return types.reduce((promise, type) => promise.then(() => {
      console.log(`Starting ${type.id}`);
      return JdxDatabase.reloadTypeById(project, type.id).then(result => {
        console.log(`Loaded ${type.id}`);
        return result;
      });
    }), Promise.resolve());
  }

  static async reloadTypeById(project, typeId, filterTypes, taskTitle) {
    const definition = this.getDefinition(project.gameType);
    const type = _(definition.types).find(x => x.id === typeId);

    if (!taskTitle) {
      taskTitle = 'Loading `' + typeId + '`';
    }

    if (type.reader === 'StructureLoader') {
      await this.loadTypeFiles(project, typeId, taskTitle);
      if (type.sourceType.id !== 'files') {
        await this.reloadTypeById(project, type.sourceType.id, [typeId], taskTitle);
      }

      const result = await StructureLoaderTask.start({taskTitle, project, typeDefinition: type});

      await this.updateTypeIdentifiers(project, type.id);

      return result;
    } else if (this.parserToTask[type.reader]) {
      if (type.sourceType && type.sourceType.id !== 'files') {
        await this.reloadTypeById(project, type.sourceType.id, [typeId], taskTitle);
      }
      const result = await this.parserToTask[type.reader].start({
        taskTitle,
        project,
        filterTypes,
      });

      await this.updateTypeIdentifiers(project, type.id);

      return result;
    }

    return Promise.reject(new Error(`Unknown reader: ${type.reader}`));
  }

  static async reloadAll(project) {
    const definition = this.getDefinition(project.gameType);
    const db = await JdxDatabase.get(project);

    const taskTitle = 'Loading all...';

    await db.relations.clear();

    await FileLoaderTask.start({
      taskTitle,
      project,
      typeDefinition: _(definition.types).find(x => x.id === 'files'),
    }, (progress, total, message) => console.log(`[${progress}/${total}] ${message}`));

    await PdxDataParserTask.start({
      taskTitle,
      project,
    }, (progress, total, message) => console.log(`[${progress}/${total}] ${message}`));

    await PdxScriptParserTask.start({
      taskTitle,
      project,
    }, (progress, total, message) => console.log(`[${progress}/${total}] ${message}`));

    const promises = [];
    _(definition.types).forEach(type => {
      if (type.sourceType) {
        promises.push(StructureLoaderTask.start(
          {taskTitle, project, typeDefinition: type},
          (progress, total, message) => console.log(`[${progress}/${total}] ${message}`)
        ));
      }
    });
    return Promise.all(promises);
  }

  static definitions = {};

  static getDefinitions() {
    return this.definitions;
  }

  static getAppRootDir() {
    return process.env.NODE_ENV === 'development'
      ? process.cwd()
      : syspath.resolve(app.getAppPath(), '../../');
  }

  static getAppScriptDir() {
    return process.env.NODE_ENV === 'development'
      ? syspath.resolve(process.cwd(), 'app')
      : syspath.resolve(app.getAppPath(), '../../');
  }

  static loadDefinitions() {
    const baseDir = syspath.join(this.getAppRootDir(), 'definitions');

    jetpack.cwd(baseDir).find(
      '.',
      {
        matching: '*',
        directories: true,
        files: false,
        recursive: false,
      }
    ).forEach(definitionDir => {
      if (!jetpack.exists(syspath.join(baseDir, definitionDir, 'index.json'))) {
        console.error('Definition dir `' + definitionDir + '` has no index.json.');
        return;
      }
      const indexDataRaw = jetpack.read(syspath.join(baseDir, definitionDir, 'index.json'));

      let data = {};
      try {
        data = JSON.parse(indexDataRaw);
      } catch (exception) {
        console.error('File `' + syspath.join(baseDir, definitionDir, 'index.json') + '`: ' + exception.message);
        return;
      }

      if (!data || !data.id || !data.name) {
        console.error('Definition dir `' + definitionDir + '` missing `id` or `name` in index.json.');
        return;
      }

      this.definitions[data.id] = data;
      this.definitions[data.id].types = [];

      jetpack.cwd(syspath.join(baseDir, definitionDir, 'types')).find(
        '.',
        {matching: '*.json'}
      ).forEach(typeFile => {
        const typeDataRaw = jetpack.read(syspath.join(baseDir, definitionDir, 'types', typeFile));

        let typeData = {};
        try {
          typeData = JSON.parse(typeDataRaw);
        } catch (exception) {
          console.error('File `' + syspath.join(baseDir, definitionDir, 'types', typeFile) + '`: ' + exception.message);
          return;
        }

        if (!typeData || !_.isArray(typeData)) {
          console.error('Definition `' + definitionDir + '` type `' + typeFile + '` data missing or incorrect');
          return;
        }

        this.definitions[data.id].types = this.definitions[data.id].types.concat(typeData);
      });

      this.definitions[data.id].schemas = [];

      jetpack.cwd(syspath.join(baseDir, definitionDir, 'schemas')).find(
        '.',
        {matching: '*.json'}
      ).forEach(schemaFile => {
        const schemaDataRaw = jetpack.read(syspath.join(baseDir, definitionDir, 'schemas', schemaFile));

        let schemaData = {};
        try {
          schemaData = JSON.parse(schemaDataRaw);
        } catch (exception) {
          console.error('File `' + syspath.join(baseDir, definitionDir, 'schemas', schemaFile) + '`: ' + exception.message);
          return;
        }

        if (!schemaData || !_.isObject(schemaData)) {
          console.error('Definition `' + definitionDir + '` schema `' + schemaFile + '` data missing or incorrect');
          return;
        }

        this.definitions[data.id].schemas.push(schemaData);
      });
    });

    return this.definitions;
  }

  static getDefinition(id) {
    if (!this.definitions[id]) {
      throw new Error('Unknown project definition type: `' + id + '`.');
    }
    return this.definitions[id];
  }

  static getTypeDefinition(project, typeId) {
    const definition = this.getDefinition(project.gameType);

    return definition.types.find(x => x.id === typeId);
  }

  static async loadRelations(project, type, id) {
    const definition = this.getDefinition(project.gameType);

    const typeDefinition = definition.types.find(x => x.id === type);

    if (!typeDefinition) {
      throw new Error('Unknown type');
    }

    id = id.toString();

    const db = await JdxDatabase.get(project);

    const stores = _.uniq(definition.types.map(x => _.get(x, ['sourceTransform', 'relationsStorage'])).filter(x => x));
    stores.push('relations');

    const promisesFrom = [];
    const promisesTo = [];
    for (const store of stores) {
      promisesFrom.push(db[store].where(['fromType', 'fromId']).equals([typeDefinition.id, id]).toArray());
      promisesTo.push(db[store].where(['toType', 'toId']).equals([typeDefinition.id, id]).toArray());
    }
    return {
      relationsFrom: await Promise.all(promisesFrom).then((v) => [].concat(...v)).then((v) => _.sortBy(v, ['toKey', 'toType', 'toId'])),
      relationsTo: await Promise.all(promisesTo).then((v) => [].concat(...v)).then((v) => _.sortBy(v, ['fromKey', 'fromType', 'fromId'])),
    };
  }

  static getItemPath(project, item, relationsFrom) {
    if (item && item.path) {
      return `${project.rootPath}/${item.path}`;
    }

    const definition = this.getDefinition(project.gameType);

    const pathTypeIds = definition.types.filter(x => x.primaryKey === 'path').map(x => x.id);

    const fileRelation = relationsFrom.find(x => pathTypeIds.indexOf(x.toType) !== -1 );

    if (fileRelation) {
      return `${project.rootPath}/${fileRelation.toId}`;
    }

    return false;
  }

  static findTypeDefinition(project, type) {
    const definition = this.getDefinition(project.gameType);

    const typeDefinition = definition.types.find(x => x.id === type);

    if (!typeDefinition) {
      throw new Error('Unknown type definition `' + type + '`.');
    }

    return typeDefinition;
  }

  static async getItem(project, type, id) {
    const db = await JdxDatabase.get(project);
    const typeDefinition = this.findTypeDefinition(project, type);

    return db[typeDefinition.id].where({[typeDefinition.primaryKey]: id}).first();
  }

  static async getItems(project, type, ids) {
    const db = await JdxDatabase.get(project);
    const typeDefinition = this.findTypeDefinition(project, type);

    return db[typeDefinition.id].where(typeDefinition.primaryKey).anyOf(ids).toArray();
  }

  static async getAllIdentifiers(project) {
    if (this.allIdentifiersCache[project.id] && JdxDatabase.getDefinition(project.gameType).types.length === _.size(this.allIdentifiersCache[project.id])) {
      return this.allIdentifiersCache[project.id];
    }

    const db = await JdxDatabase.get(project);

    const task = ForegroundTask.start({taskTitle: 'Building cache:'});
    task.progress(0, 1, 'Fetching item counts...');

    const identifierCache = {};
    for (const typeDefinition of JdxDatabase.getDefinition(project.gameType).types) {
      if (!db[typeDefinition.id]) {
        continue;
      }

      if (false && typeDefinition.id === 'localisation') {
        identifierCache[typeDefinition.id] = new Set();
        continue;
      }

      identifierCache[typeDefinition.id] = new Set(await db[typeDefinition.id].toCollection().primaryKeys());
    }

    this.allIdentifiersCache[project.id] = identifierCache;

    task.finish();

    return identifierCache;
  }

  static async updateTypeIdentifiers(project, type) {
    if (!this.allIdentifiersCache[project.id]) {
      console.log('No CACHE', type);
      return;
    }

    this.allIdentifiersCache[project.id][type] = await this.getTypeIdentifiers(project, type, true);
    console.log('cache reread', type, this.allIdentifiersCache[project.id][type].size);
  }

  static async getTypeIdentifiers(project, type, refresh) {
    if (!this.allIdentifiersCache[project.id]) {
      this.allIdentifiersCache[project.id] = {};
    }

    if (!this.allIdentifiersCache[project.id][type] || refresh) {
      const db = await JdxDatabase.get(project);

      for (const typeDefinition of JdxDatabase.getDefinition(project.gameType).types) {
        if (!db[typeDefinition.id]) {
          continue;
        }

        if (typeDefinition.id === type) {
          this.allIdentifiersCache[project.id][type] = new Set(await db[typeDefinition.id].toCollection().primaryKeys());
          break;
        }
      }
      if (!this.allIdentifiersCache[project.id][type]) {
        this.allIdentifiersCache[project.id][type] = new Set();
      }
    }

    return this.allIdentifiersCache[project.id][type];
  }

  static async addError(project, error) {
    if (!error.creationTime) {
      error.creationTime = new Date();
    }
    if (!error.message) {
      error.message = '- no message -';
    }
    const db = await JdxDatabase.get(project);
    return db.jdx_errors.add(error);
  }

  static async addErrors(project, errors, task) {
    const db = await JdxDatabase.get(project);

    errors = errors.map((error) => {
      if (!error.creationTime) {
        error.creationTime = new Date();
      }
      if (!error.message) {
        error.message = '- no message -';
      }

      return error;
    });

    return task.saveChunked(errors, db.jdx_errors, 0, 500);
  }

  static async getErrors(project) {
    const db = await JdxDatabase.get(project);
    return db.jdx_errors;
  }

  static async deleteErrorsByPath(project, path) {
    const db = await JdxDatabase.get(project);
    return db.jdx_errors.where({path}).delete();
  }

  static async deleteAllErrors(project) {
    const db = await JdxDatabase.get(project);
    return db.jdx_errors.clear();
  }

  static async deleteErrorsByTypes(project, types) {
    const db = await JdxDatabase.get(project);
    return db.jdx_errors.where('path').anyOf(types.map(x => x.id)).delete();
  }
}
