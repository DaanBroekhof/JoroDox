import BackgroundTask from "./BackgroundTask";
import JdxDatabase from "../JdxDatabase";
import PdxScript from "../PdxScript";
import Dexie from "dexie/dist/dexie";
import FileView from "../../components/FileView";
import * as iconv from "iconv-lite";
const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');

export default class PdxScriptParserTask extends BackgroundTask {

    static getTaskType() {
        return 'PdxScriptParserTask';
    }

    execute(args) {
        let db = JdxDatabase.get();

        db.files.where('type').equals('pdx-script').toArray(files => {

            let filesList = _(files);

            let scripts = [];
            filesList.each(file => {
                let parser = new PdxScript();
                let data = parser.readFile(iconv.decode(jetpack.read(args.root + syspath.sep + file.name, 'buffer'), 'win1252'));

                if (scripts.length % 1000 === 0)
                    this.progress(scripts.length, filesList.size(), 'Parsing PDX scripts...');

                scripts.push({name: file.name, data: data});
            });

            return Promise.resolve(scripts);
        }).then(scripts => {
            this.progress(0, scripts.length, 'Saving PDX script data to DB...');
            db.pdxScripts.bulkPut(scripts).then(lastkey => {
                this.progress(scripts.length, scripts.length, 'Saving PDX script data to DB...');
                this.finish(lastkey);
            }).catch(reason => {
                console.trace(reason.toString());
                this.fail(reason.toString())
            }).catch(Dexie.BulkError, (e) => {
                console.trace(reason.toString());
                this.fail(e.toString())
            });
        });
    }
}