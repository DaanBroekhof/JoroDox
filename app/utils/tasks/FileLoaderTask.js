import Dexie from "dexie/dist/dexie";
import BackgroundTask from "./BackgroundTask";

const jetpack = require('electron').remote.require('fs-jetpack');


export default class FileLoaderTask extends BackgroundTask {

    static getTaskType() {
        return 'FileLoaderTask';
    }

    execute(args) {

        this.progress(0, 2, 'Reading directory data...')

        let db = new Dexie("StructureDB");
        db.version(1).stores({ files: "++name,file,type,data" });

        let localJetpack = jetpack.cwd(args.root);
        let files = _(localJetpack.find('.', {
            matching: '*',
            recursive: true,
            files: true,
            directories: false
        }));

        this.progress(0, files.size(), 'Adding file meta data...');

        let nr = 0;
        let filesRemapped = files.map(file => {

            //nr += 1;
            //if (nr % 1000 === 0)
            //    this.progress(nr, files.size(), 'Adding file meta data...');

            return {
                name: file,
                info: [],//localJetpack.inspect(file, {times: true})
            };
        });

        this.progress(0, filesRemapped.size(), 'Writing to DB...');

        let progress = 0;
        db.files.clear().then(result => {

            /*
            let fullFiles = filesRemapped.value();
            this.progress(0, fullFiles.length, 'Writing to DB...');
            for (let i = 0; i < fullFiles.length; i += 1000) {
                db.files.bulkAdd(fullFiles.slice(i, 1000));
                this.progress(i, fullFiles.length, 'Writing to DB...');
            }
            */

            /*
            filesRemapped.forEach(file => {
                db.files.add(file);
                progress++;
            });
            */

            /*

            let chunks = filesRemapped.chunk(1000).value();
            let chunkNr = 0;
            let writeChunk = (chunkNr, maxChunk) => {
                db.files.bulkAdd(chunks[chunkNr]).then(lastkey => {
                    progress += chunks[chunkNr].length;
                    this.progress(progress, filesRemapped.size(), 'Writing to DB...');
                    if (chunkNr < chunks.length - 1 && chunkNr < maxChunk) {
                        writeChunk(chunkNr + 1)
                    }
                    else {
                        this.finish(lastkey);
                    }
                }).catch(reason => {
                    this.error(reason.toString())
                }).catch(Dexie.BulkError, (e) => {
                    this.error(e.toString())
                });
            };
            writeChunk(0, chunks.length);
            //writeChunk(Math.floor(chunks.length / 2), chunks.length);
            */

            db.files.bulkPut(filesRemapped.value()).then(lastkey => {
                this.progress(filesRemapped.size(), filesRemapped.size(), 'Writing to DB...');
                this.finish(lastkey);
            }).catch(reason => {
                this.error(reason.toString())
            }).catch(Dexie.BulkError, (e) => {
                this.error(e.toString())
            });
        }).catch(reason => {
            this.error(reason.toString());
        });
    }
}