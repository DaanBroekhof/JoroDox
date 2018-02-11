import BackgroundTask from "./BackgroundTask";
import Dexie from "dexie";
const hash = require('object-hash');

export default class DbBackgroundTask extends BackgroundTask {
    saveChunked(data, store, chunkNr, chunkSize)
    {
        let slice = data.slice(chunkNr*chunkSize, (chunkNr+1)*chunkSize);

        let task = this;
        return new Promise((resolve, reject) => {
            store.bulkPut(slice).then(lastkey => {
                this.progress(Math.min(data.length, chunkNr*chunkSize), data.length, 'Saving '+ data.length +' '+ store.name +' data to DB...');
                if (chunkNr*chunkSize >= data.length)
                    resolve(lastkey);
                else
                    task.saveChunked(data, store, chunkNr+1, chunkSize).then(result => resolve(result)).catch(reason => reject(reason));
            }).catch(reason => {
                reject(reason);
            }).catch(Dexie.BulkError, (e) => {
                reject(e);
            });
        });
    };

    addRelationId(relationData) {
        relationData.id = hash(relationData);
        return relationData;
    }
}