import BackgroundTask from "./BackgroundTask";
import JdxDatabase from "../JdxDatabase";
import PdxScript from "../PdxScript";
import Dexie from "dexie/dist/dexie";
import FileView from "../../components/FileView";
import PdxData from "../PdxData";
import * as iconv from "iconv-lite";
const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');

export default class PdxDataParserTask extends BackgroundTask {

    static getTaskType() {
        return 'PdxDataParserTask';
    }

    execute(args) {
        let db = JdxDatabase.get();

        let nr = 0;
        db.files.where('type').equals('pdx-mesh').toArray(files => {

            let filesList = _(files);

            this.progress(0, filesList.size(), 'Parsing PDX data files...');

            let datafiles = [];
            filesList.each(file => {
                let parser = new PdxScript();
                let data = parser.readFile(iconv.decode(jetpack.read(args.root + syspath.sep + file.name, 'buffer'), 'win1252'));

                if (datafiles.length % 50 === 0)
                    this.progress(datafiles.length, filesList.size(), 'Parsing PDX binary data objects...');

                datafiles.push({name: file.name, data: data});
            });

            return Promise.resolve(datafiles);
        }).then(datafiles => {
            db.pdxData.bulkPut(datafiles).then(lastkey => {
                this.progress(datafiles.length, datafiles.length, 'Saving PDX binary data to DB...');
                this.finish(lastkey);
            }).catch(reason => {
                //console.trace(reason.toString());
                this.fail(reason.toString())
            }).catch(Dexie.BulkError, (e) => {
                //console.trace(reason.toString());
                this.fail(e.toString())
            });
        });
    }
}