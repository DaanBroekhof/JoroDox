import Dexie from "dexie/dist/dexie";
import crypto from "crypto";
import _ from 'lodash';
import Eu4Definition from '../definitions/eu4';

export default class JdxDatabase {

    static db;

    static get(root, definition) {

        if (this.db)
            return this.db;

        if (!definition)
            definition = Eu4Definition;

        let rootHash = crypto.createHash('md5').update(definition.name +'||'+ root).digest("hex").substring(0, 8);

        let db = new Dexie("JdxDatabase-"+ rootHash);

        let stores = {
            settings: '++key',
        };
        _(definition.types).forEach(type => {
            stores[type.id] = '++'+ type.primaryKey + (type.indexedKeys ? ','+ type.indexedKeys.join(',') : '');
        });

        stores['relations'] = '++id,fromType,fromKey,[fromType+fromId],[fromType+fromId+fromKey],toType,toKey,[toType+toId],[toType+toId+toKey]';

        /*
        let versionNr = 1;
        db.settings.where({key: 'lastVersion'}).first(setting => {
            let currentStores = {};

            _(setting).value.forOwn(value, key => {
                db.version(++versionNr).stores(setting);
                currentStores[key] = value;
            });
        });
        */


        console.log(stores);

        db.version(1).stores(stores);

        this.db = db;

        return db;
    }
}
