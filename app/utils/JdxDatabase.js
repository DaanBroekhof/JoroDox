import Dexie from "dexie/dist/dexie";
import crypto from "crypto";
import _ from 'lodash';
import Eu4Definition from '../definitions/eu4';

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
        let db = new Dexie("JdxDatabase-"+ rootHash);

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

            console.log(currentStores);
            console.log(stores);
            console.log(deleteStores);
            console.log(newStores);

            db.version(currentVerNo).stores(currentStores);
            if (_(deleteStores).size()) {
                db.version(++currentVerNo).stores(deleteStores);
            }
            if (_(newStores).size()) {
                db.version(++currentVerNo).stores(newStores);
            }

            this.db = db;

            return db.open();
        });
    }
}
