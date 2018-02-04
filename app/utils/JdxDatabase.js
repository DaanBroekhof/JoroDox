import Dexie from "dexie/dist/dexie";

export default class JdxDatabase {

    static get() {
        let db = new Dexie("JdxDatabase");

        db.version(1).stores({
            settings: "++key,value",
            files: "++name,file,type,data",
            pdxScripts: "++name,data",
            pdxData: "++name,data",
        });

        return db;
    }
}
