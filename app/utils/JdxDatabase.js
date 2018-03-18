import Dexie from 'dexie/dist/dexie';
import crypto from 'crypto';
import _ from 'lodash';
import Eu4Definition from '../definitions/eu4';
import StructureLoaderTask from './tasks/StructureLoaderTask';
import FileLoaderTask from './tasks/FileLoaderTask';
import PdxScriptParserTask from './tasks/PdxScriptParserTask';
import PdxDataParserTask from './tasks/PdxDataParserTask';
import LuaScriptParserTask from './tasks/LuaScriptParserTask';
import CsvFileParserTask from './tasks/CsvFileParserTask';
import PdxYmlFileParserTask from './tasks/PdxYmlFileParserTask';

export default class JdxDatabase {
  static db;

  static get(root, definition) {
    if (this.db) { return Promise.resolve(this.db); }

    /* eslint-disable no-param-reassign */
    if (!definition) { definition = Eu4Definition; }
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

    return db.open().then(() => {
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
    }).catch(e => {
      console.error(e);
    });
  }

  static loadTypeFiles(root, typeId) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      FileLoaderTask.start(
        {
          root,
          typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
          searchPattern: type.sourceType.pathPattern.replace('{type.id}', type.id),
          searchPath: type.sourceType.pathPrefix.replace('{type.id}', type.id),
        },
        (/* progress, total, message */) => {},
        (result) => { resolve(result); },
        (error) => { reject(error); },
      );
    });
  }

  static loadPdxScriptFiles(root, typeId) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      PdxScriptParserTask.start(
        {
          root,
          definition: Eu4Definition,
          filterTypes: [type.id],
        },
        (/* progress, total, message */) => {},
        (result) => { resolve(result); },
        (error) => { reject(error); },
      );
    });
  }

  static reloadTypeById(root, typeId, filterTypes) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    if (type.reader === 'StructureLoader') {
      return new Promise((resolve, reject) => {
        return this.loadTypeFiles(root, typeId).then(() => {
          if (type.sourceType.id !== 'files') {
            return this.reloadTypeById(root, type.sourceType.id, [typeId]);
          }

          return null;
        }).then(() => {
          return StructureLoaderTask.start(
            {root, typeDefinition: type},
            (/* progress, total, message */) => {},
            (result) => { resolve(result); },
            (error) => { reject(error); },
          );
        });
      });
    } else if (type.reader === 'PdxScriptParser') {
      return new Promise((resolve, reject) => {
        PdxScriptParserTask.start(
          {
            root,
            definition: Eu4Definition,
            filterTypes,
          },
          (/* progress, total, message */) => {},
          (result) => { resolve(result); },
          (error) => { reject(error); },
        );
      });
    } else if (type.reader === 'LuaScriptParser') {
      return new Promise((resolve, reject) => {
        LuaScriptParserTask.start(
          {
            root,
            definition: Eu4Definition,
            filterTypes,
          },
          (/* progress, total, message */) => {},
          (result) => { resolve(result); },
          (error) => { reject(error); },
        );
      });
    } else if (type.reader === 'PdxDataParser') {
      return new Promise((resolve, reject) => {
        PdxDataParserTask.start(
          {
            root,
            definition: Eu4Definition,
            filterTypes,
          },
          (/* progress, total, message */) => {},
          (result) => { resolve(result); },
          (error) => { reject(error); },
        );
      });
    } else if (type.reader === 'CsvFileParser') {
      return new Promise((resolve, reject) => {
        CsvFileParserTask.start(
          {
            root,
            definition: Eu4Definition,
            filterTypes,
          },
          (/* progress, total, message */) => {},
          (result) => { resolve(result); },
          (error) => { reject(error); },
        );
      });
    } else if (type.reader === 'PdxYmlFileParser') {
      return new Promise((resolve, reject) => {
        PdxYmlFileParserTask.start(
          {
            root,
            definition: Eu4Definition,
            filterTypes,
          },
          (/* progress, total, message */) => {},
          (result) => { resolve(result); },
          (error) => { reject(error); },
        );
      });
    } else if (type.reader === 'FileLoader') {
      return new Promise((resolve, reject) => {
        FileLoaderTask.start(
          {
            root,
            typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
          },
          (/* progress, total, message */) => {},
          (result) => { resolve(result); },
          (error) => { reject(error); },
        );
      });
    }

    return Promise.reject(new Error(`Unknown reader: ${type.reader}`));
  }

  static reloadAll(root) {
    return JdxDatabase.get(root).then(db => db.relations.clear()).then(() => new Promise((resolve, reject) => {
      FileLoaderTask.start(
        {
          root,
          typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
        },
        (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
        (result) => { resolve(result); },
        (error) => { reject(error); },
      );
    })).then(() => new Promise((resolve, reject) => {
      PdxDataParserTask.start(
        {
          root,
          definition: Eu4Definition,
        },
        (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
        (result) => { resolve(result); },
        (error) => { reject(error); },
      );
    }))
      .then(() => new Promise((resolve, reject) => {
        PdxScriptParserTask.start(
          {
            root,
            definition: Eu4Definition,
          },
          (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
          (result) => { resolve(result); },
          (error) => { reject(error); },
        );
      }))
      .then(() => {
        const promises = [];
        return _(Eu4Definition.types).forEach(type => {
          if (type.sourceType) {
            promises.push(new Promise((resolve, reject) => {
              StructureLoaderTask.start(
                {root, typeDefinition: type},
                (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
                (result) => { resolve(result); },
                (error) => { reject(error); },
              );
            }));
          }
          return Promise.all(promises);
        });
      });
  }
}
