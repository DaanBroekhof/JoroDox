import Dexie from 'dexie/dist/dexie';
import crypto from 'crypto';
import _ from 'lodash';
import StructureLoaderTask from './tasks/StructureLoaderTask';
import FileLoaderTask from './tasks/FileLoaderTask';
import PdxScriptParserTask from './tasks/PdxScriptParserTask';
import PdxDataParserTask from './tasks/PdxDataParserTask';
import LuaScriptParserTask from './tasks/LuaScriptParserTask';
import CsvFileParserTask from './tasks/CsvFileParserTask';
import PdxYmlFileParserTask from './tasks/PdxYmlFileParserTask';
import IndexedBmpParserTask from './tasks/IndexedBmpParserTask';
import DeleteRelatedTask from './tasks/DeleteRelatedTask';
import DbBackgroundTask from './tasks/DbBackgroundTask';
import Eu4Definition from '../definitions/eu4';
import StellarisDefinition from '../definitions/stellaris';

export default class JdxDatabase {
  static db = {};

  static parserToTask = {
    StructureLoader: StructureLoaderTask,
    FileLoader: FileLoaderTask,
    PdxScriptParser: PdxScriptParserTask,
    PdxDataParser: PdxDataParserTask,
    LuaScriptParser: LuaScriptParserTask,
    CsvFileParser: CsvFileParserTask,
    PdxYmlFileParser: PdxYmlFileParserTask,
    IndexedBmpParser: IndexedBmpParserTask,
    DeleteRelated: DeleteRelatedTask,
  };

  static projectToDbName(project) {
    const rootHash = crypto.createHash('md5').update(`${project.rootPath}`).digest('hex').substring(0, 8);

    return `JdxDatabase-${rootHash}`;
  }

  static async get(project) {
    if (this.db[project.rootPath] && this.db[project.rootPath].isOpen()) {
      return Promise.resolve(this.db[project.rootPath]);
    }
    const root = project.rootPath;
    const definition = this.getDefinition(project.definitionType);

    if (!root) {
      throw new Error(`Empty root dir '${root}'`);
    }

    const relationDefinition = _.join([
      '++id', 'fromType', 'fromKey', '[fromType+fromId]',
      '[fromType+fromId+fromKey]', 'toType', 'toKey', '[toType+toId]', '[toType+toId+toKey]'
    ], ',');

    let stores = {
      settings: '++key',
    };
    _(definition.types).forEach(type => {
      stores[type.id] = `++${type.primaryKey}${type.indexedKeys ? `,${type.indexedKeys.join(',')}` : ''}`;
      if (type.sourceTransform && type.sourceTransform.relationsStorage) {
        stores[type.sourceTransform.relationsStorage] = relationDefinition;
      }
    });

    stores.relations = relationDefinition;

    stores = _(stores).mapValues(x => x.split(',').sort().join(',')).value();

    const dbName = this.projectToDbName(project);
    const db = new Dexie(dbName, {allowEmptyDB: true});
    console.log('Loading DB `'+ dbName +'`');

    // Hacky way to allow empty DB editing
    /* eslint no-underscore-dangle: ["error", { "allow": ["db", "_allowEmptyDB"] }] */
    db._allowEmptyDB = true;

    const currentStores = [];

    await db.open();
    let currentVerNo = db.verno;
    db.tables.forEach(table => {
      const primKeyAndIndexes = [table.schema.primKey].concat(table.schema.indexes);
      const schemaSyntax = primKeyAndIndexes.map(index => index.src).join(',');
      currentStores[table.name] = schemaSyntax.split(',').sort().join(',');
    });

    db.close();

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

    /*
      console.log(currentStores);
      console.log(stores);
      console.log(deleteStores);
      console.log(newStores);
    */

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

    this.db[project.rootPath] = db;

    return db.open();
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
    const definition = this.getDefinition(project.definitionType);

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
    const definition = this.getDefinition(project.definitionType);

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
    const definition = this.getDefinition(project.definitionType);

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
        }
      }
      for (const type in updateByType) {
        if (updateByType[type].source) {
          await this.reloadTypePaths(project, type, updateByType[type].paths);
        }
      }
    }
  }

  static async reloadTypePaths(project, typeId, paths, taskTitle) {
    const definition = this.getDefinition(project.definitionType);
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

  static async reloadTypeById(project, typeId, filterTypes, taskTitle) {
    const definition = this.getDefinition(project.definitionType);
    const type = _(definition.types).find(x => x.id === typeId);

    if (!taskTitle) {
      taskTitle = 'Loading `' + typeId + '`';
    }

    if (type.reader === 'StructureLoader') {
      await this.loadTypeFiles(project, typeId, taskTitle);
      if (type.sourceType.id !== 'files') {
        await this.reloadTypeById(project, type.sourceType.id, [typeId], taskTitle);
      }
      return StructureLoaderTask.start({taskTitle, project, typeDefinition: type});
    } else if (this.parserToTask[type.reader]) {
      if (type.sourceType && type.sourceType.id !== 'files') {
        await this.reloadTypeById(project, type.sourceType.id, [typeId], taskTitle);
      }
      return this.parserToTask[type.reader].start({
        taskTitle,
        project,
        filterTypes,
      });
    }

    return Promise.reject(new Error(`Unknown reader: ${type.reader}`));
  }

  static async reloadAll(project) {
    const definition = this.getDefinition(project.definitionType);
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

  static definitions = {
    eu4: Eu4Definition,
    stellaris: StellarisDefinition,
  };

  static getDefinitions() {
    return this.definitions;
  }

  static getDefinition(id) {
    if (!this.definitions[id]) {
      throw new Error('Unknown project definition type: `' + id + '`.');
    }
    return this.definitions[id];
  }

  static async loadRelations(project, type, id) {
    const definition = this.getDefinition(project.definitionType);

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

    const definition = this.getDefinition(project.definitionType);

    const pathTypeIds = definition.types.filter(x => x.primaryKey === 'path').map(x => x.id);

    const fileRelation = relationsFrom.find(x => pathTypeIds.indexOf(x.toType) !== -1 );

    if (fileRelation) {
      return `${project.rootPath}/${fileRelation.toId}`;
    }

    return false;
  }

  static findTypeDefinition(project, type) {
    const definition = this.getDefinition(project.definitionType);

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
}
