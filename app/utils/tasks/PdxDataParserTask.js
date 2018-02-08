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
                let parser = new PdxData();
                let data = parser.readFromBuffer(new Uint8Array(jetpack.read(args.root + syspath.sep + file.name, 'buffer')).buffer);

                if (datafiles.length % 50 === 0)
                    this.progress(datafiles.length, filesList.size(), 'Parsing PDX binary data objects...');

                datafiles.push({name: file.name, data: data});
            });

            return Promise.resolve(datafiles);
        }).then(datafiles => {
            let totalCount = 0;

            let saveChunk = (data, chunkNr, chunkSize) => {
                let slice = data.slice(chunkNr*chunkSize, (chunkNr+1)*chunkSize);
                db.pdxData.bulkPut(slice).then(lastkey => {
                    totalCount += slice.length;
                    this.progress(totalCount, data.length, 'Saving PDX binary data to DB...');
                    if (totalCount >= data.length || chunkNr*chunkSize >= data.length)
                        this.finish(lastkey);
                    else
                        saveChunk(data, chunkNr+1, chunkSize);
                }).catch(reason => {
                    //console.trace(reason.toString());
                    this.fail(reason.toString())
                }).catch(Dexie.BulkError, (e) => {
                    //console.trace(reason.toString());
                    this.fail(e.toString())
                });
            };

            saveChunk(datafiles, 0, 100);
        });
    }
}