import Dexie from "dexie"

let db = new Dexie("StructureDB");
db.version(1).stores({ files: "++name,file,type,data" });

onmessage = (message) => {
    console.log(message);
    let action = message.data[1];
    if (action.type === 'bulkFiles') {
        db.files.bulkAdd(action.data).then(lastkey => {
            postMessage({success: true, lastkey: lastkey});
        }).catch(reason => {
            postMessage({success: false, reason: reason.toString()});
            console.log(reason);
        }).catch(Dexie.BulkError, (e) => {
            postMessage({success: false, reason: e.toString()});
            console.error("Some raindrops did not succeed. However, " +
                100000 - e.failures.length + " raindrops was added successfully");

        });
    }
};