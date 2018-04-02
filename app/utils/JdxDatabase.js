import Dexie from 'dexie/dist/dexie';
import crypto from 'crypto';
import _ from 'lodash';
import async from 'async';
import Eu4Definition from '../definitions/eu4';
import StructureLoaderTask from './tasks/StructureLoaderTask';
import FileLoaderTask from './tasks/FileLoaderTask';
import PdxScriptParserTask from './tasks/PdxScriptParserTask';
import PdxDataParserTask from './tasks/PdxDataParserTask';
import LuaScriptParserTask from './tasks/LuaScriptParserTask';
import CsvFileParserTask from './tasks/CsvFileParserTask';
import PdxYmlFileParserTask from './tasks/PdxYmlFileParserTask';
import DeleteRelatedTask from './tasks/DeleteRelatedTask';
import DbBackgroundTask from './tasks/DbBackgroundTask';

export default class JdxDatabase {
  static db;

  static parserToTask = {
    StructureLoader: StructureLoaderTask,
    FileLoader: FileLoaderTask,
    PdxScriptParser: PdxScriptParserTask,
    PdxDataParser: PdxDataParserTask,
    LuaScriptParser: LuaScriptParserTask,
    CsvFileParser: CsvFileParserTask,
    PdxYmlFileParser: PdxYmlFileParserTask,
    DeleteRelated: DeleteRelatedTask,
  };

  static async get(root, definition) {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    if (!root) {
      throw new Error(`Empty root dir '${root}'`);
    }

    /* eslint-disable no-param-reassign */
    if (!definition) {
      definition = Eu4Definition;
    }
    /* eslint-enable no-param-reassign */

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

    const rootHash = crypto.createHash('md5').update(`${definition.name}||${root}`).digest('hex').substring(0, 8);
    const db = new Dexie(`JdxDatabase-${rootHash}`, {allowEmptyDB: true});

    // Hacky way to allow empty DB editing
    /* eslint no-underscore-dangle: ["error", { "allow": ["db", "_allowEmptyDB"] }] */
    db._allowEmptyDB = true;

    const currentStores = [];
    let currentVerNo = 0;

    await db.open();
    currentVerNo = db.verno;
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

    this.db = db;

    return db.open();
  }

  static async loadTypeFiles(root, typeId) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    return FileLoaderTask.start({
      root,
      typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
      searchPattern: type.sourceType.path ? type.sourceType.path.replace('{type.id}', type.id) : type.sourceType.pathPattern.replace('{type.id}', type.id),
      searchPath: type.sourceType.path ? type.sourceType.path.replace('{type.id}', type.id) : type.sourceType.pathPrefix.replace('{type.id}', type.id),
    });
  }

  static async loadPdxScriptFiles(root, typeId) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    return PdxScriptParserTask.start({
      root,
      definition: Eu4Definition,
      filterTypes: [type.id],
    });
  }

  static async loadByPaths(root, paths, types) {
    let result = null;
    if (paths === null) {
      result = await FileLoaderTask.start({root, searchPath: '.', typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files')});
    } else {
      result = await FileLoaderTask.start({root, exactPaths: paths, typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files')});
    }

    if (result.deleted.length || result.changed.length) {
      const deleted = await DeleteRelatedTask.start({
        rootDir: root,
        type: 'files',
        typeIds: [...result.deleted, ...result.changed].map(x => x.path),
      });
      console.log(deleted + ' deleted');
    }

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
      for (const type in updateByType) {
        if (!updateByType[type].source) {
          await this.reloadTypePaths(root, type, updateByType[type].paths);
        }
      }
      for (const type in updateByType) {
        if (updateByType[type].source) {
          await this.reloadTypePaths(root, type, updateByType[type].paths);
        }
      }
    }
  }

  static async reloadTypePaths(root, typeId, paths) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    if (this.parserToTask[type.reader]) {
      return this.parserToTask[type.reader].start({
        root,
        definition: type,
        typeDefinition: type,
        paths,
      });
    }

    return Promise.reject(new Error(`Unknown reader: ${type.reader}`));
  }

  static async reloadTypeById(root, typeId, filterTypes) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    if (type.reader === 'StructureLoader') {
      await this.loadTypeFiles(root, typeId);
      if (type.sourceType.id !== 'files') {
        await this.reloadTypeById(root, type.sourceType.id, [typeId]);
      }
      return StructureLoaderTask.start({root, typeDefinition: type});
    } else if (this.parserToTask[type.reader]) {
      return this.parserToTask[type.reader].start({
        root,
        definition: Eu4Definition,
        filterTypes,
      });
    }

    return Promise.reject(new Error(`Unknown reader: ${type.reader}`));
  }

  static async reloadAll(root) {
    const db = await JdxDatabase.get(root);

    await db.relations.clear();

    await FileLoaderTask.start({
      root,
      typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
    }, (progress, total, message) => console.log(`[${progress}/${total}] ${message}`));

    await PdxDataParserTask.start({
      root,
      definition: Eu4Definition,
    }, (progress, total, message) => console.log(`[${progress}/${total}] ${message}`));

    await PdxScriptParserTask.start({
      root,
      definition: Eu4Definition,
    }, (progress, total, message) => console.log(`[${progress}/${total}] ${message}`));

    const promises = [];
    _(Eu4Definition.types).forEach(type => {
      if (type.sourceType) {
        promises.push(StructureLoaderTask.start(
          {root, typeDefinition: type},
          (progress, total, message) => console.log(`[${progress}/${total}] ${message}`)
        ));
      }
    });
    return Promise.all(promises);
  }
}
