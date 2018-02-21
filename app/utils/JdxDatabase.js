import Dexie from "dexie/dist/dexie";
import crypto from "crypto";
import _ from 'lodash';
import Eu4Definition from '../definitions/eu4';
import StructureLoaderTask from "./tasks/StructureLoaderTask";
import FileLoaderTask from "./tasks/FileLoaderTask";
import PdxScriptParserTask from "./tasks/PdxScriptParserTask";
import PdxDataParserTask from "./tasks/PdxDataParserTask";
import LuaScriptParserTask from "./tasks/LuaScriptParserTask";

export default class JdxDatabase {

    static db;

    static get(root, definition) {

        if (this.db)
            return Promise.resolve(this.db);

        if (!definition)
            definition = Eu4Definition;

        let stores = {
            settings: '++key',
        };
        _(definition.types).forEach(type => {
            stores[type.id] = '++'+ type.primaryKey + (type.indexedKeys ? ','+ type.indexedKeys.join(',') : '');
        });

        stores['relations'] = '++id,fromType,fromKey,[fromType+fromId],[fromType+fromId+fromKey],toType,toKey,[toType+toId],[toType+toId+toKey]';

        stores = _(stores).mapValues(x => x.split(',').sort().join(',')).value();

        let rootHash = crypto.createHash('md5').update(definition.name +'||'+ root).digest("hex").substring(0, 8);
        let db = new Dexie("JdxDatabase-"+ rootHash, {allowEmptyDB: true});

        db._allowEmptyDB = true;

        let currentStores = [];
        let currentVerNo = 0;

        return db.open().then(() => {
            currentVerNo = db.verno;
            db.tables.forEach(table => {
                let primKeyAndIndexes = [table.schema.primKey].concat(table.schema.indexes);
                let schemaSyntax = primKeyAndIndexes.map(index => index.src).join(',');
                currentStores[table.name] = schemaSyntax.split(',').sort().join(',');
            });

            db.close();

            let newStores = {};
            let deleteStores = {};
            _(stores).forOwn((v, k) => {
                if (!currentStores[k]) {
                    newStores[k] = v;
                }
                else if (currentStores[k] !== v) {
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
                db.version(++currentVerNo).stores(deleteStores);
                console.log('Deleting stores:', deleteStores);
            }
            if (_(newStores).size()) {
                db.version(++currentVerNo).stores(newStores);
                console.log('Creating stores:', newStores);
            }

            this.db = db;

            return db.open();
        });
    }

    static loadTypeFiles(root, typeId) {
        let type = _(Eu4Definition.types).find(x => x.id === typeId);

        return new Promise((resolve, reject) => {
            FileLoaderTask.start(
                {
                    root: root,
                    typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
                    searchPattern: type.sourceType.pathPattern.replace('{type.id}', type.id),
                    searchPath: type.sourceType.pathPrefix.replace('{type.id}', type.id),
                },
                (progress, total, message) => {},
                (result) => {resolve(result);},
                (error) => {reject(error);},
            );
        });
    }

    static loadPdxScriptFiles(root, typeId) {
        let type = _(Eu4Definition.types).find(x => x.id === typeId);

        return new Promise((resolve, reject) => {
            PdxScriptParserTask.start({
                    root: root,
                    definition: Eu4Definition,
                    filterTypes: [type.id],
                },
                (progress, total, message) => {},
                (result) => {resolve(result);},
                (error) => {reject(error);},
            );
        });
    }

    static reloadTypeById(root, typeId) {
        let type = _(Eu4Definition.types).find(x => x.id === typeId);

        if (type.reader === 'StructureLoader') {
            return new Promise((resolve, reject) => {
                this.loadTypeFiles(root, typeId).then(() => {
                    return this.loadPdxScriptFiles(root, typeId);
                }).then(() => {
                    StructureLoaderTask.start({root: root, typeDefinition: type},
                        (progress, total, message) => {},
                        (result) => {resolve(result);},
                        (error) => {reject(error);},
                    );
                });
            });
        }
        else if (type.reader === 'PdxScriptParser') {
            return new Promise((resolve, reject) => {
                PdxScriptParserTask.start({
                        root: root,
                        definition: Eu4Definition,
                    },
                    (progress, total, message) => {},
                    (result) => {resolve(result);},
                    (error) => {reject(error);},
                );
            })
        }
        else if (type.reader === 'LuaScriptParser') {
            return new Promise((resolve, reject) => {
                LuaScriptParserTask.start({
                        root: root,
                        definition: Eu4Definition,
                    },
                    (progress, total, message) => {},
                    (result) => {resolve(result);},
                    (error) => {reject(error);},
                );
            })
        }
        else if (type.reader === 'PdxDataParser') {
            return new Promise((resolve, reject) => {
                PdxDataParserTask.start({
                        root: root,
                        definition: Eu4Definition,
                    },
                    (progress, total, message) => {},
                    (result) => {resolve(result);},
                    (error) => {reject(error);},
                );
            })
        }
        else if (type.reader === 'FileLoader') {
            return new Promise((resolve, reject) => {
                FileLoaderTask.start(
                    {
                        root: root,
                        typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
                    },
                    (progress, total, message) => {},
                    (result) => {resolve(result);},
                    (error) => {reject(error);},
                );
            });
        }
        else {
            return Promise.reject('Unknown reader: '+ type.reader);
        }
    }

    static reloadAll(root) {
        JdxDatabase.get(root).then(db => {
            return db.relations.clear();
        }).then( () => {
            return new Promise((resolve, reject) => {
                FileLoaderTask.start(
                    {
                        root: root,
                        typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
                    },
                    (progress, total, message) => console.log('[' + progress + '/' + total + '] ' + message),
                    (result) => {resolve(result);},
                    (error) => {reject(error);},
                )
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                PdxDataParserTask.start({
                        root: root,
                        definition: Eu4Definition,
                    },
                    (progress, total, message) => console.log('[' + progress + '/' + total + '] ' + message),
                    (result) => {resolve(result);},
                    (error) => {reject(error);},
                );
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                PdxScriptParserTask.start({
                        root: root,
                        definition: Eu4Definition,
                    },
                    (progress, total, message) => console.log('[' + progress + '/' + total + '] ' + message),
                    (result) => {resolve(result);},
                    (error) => {reject(error);},
                );
            });
        }).then(() => {
            let promises = [];
            _(Eu4Definition.types).forEach(type => {
                if (type.sourceType) {
                    promises.push(new Promise((resolve, reject) => {
                        StructureLoaderTask.start({root: root, typeDefinition: type},
                            (progress, total, message) => console.log('[' + progress + '/' + total + '] ' + message),
                            (result) => {resolve(result);},
                            (error) => {reject(error);},
                        );
                    }));
                }
                return Promise.all(promises);
            });
        });
    }
}
