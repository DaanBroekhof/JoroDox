import Dexie from "dexie/dist/dexie";
import BackgroundTask from "./BackgroundTask";
import JdxDatabase from "../JdxDatabase";

const jetpack = require('electron').remote.require('fs-jetpack');


export default class FileLoaderTask extends BackgroundTask {

    static getFileType(info) {

        let fileTypeRegexes = {
            'pdx-script': [
                /\.(asset|gfx|txt|gui)$/i
            ],
            'pdx-mesh': [
                /\.mesh$/i
            ],
            'pdx-anim': [
                /\.anim$/i
            ],
            'image': [
                /\.(png|jpg|bmp|tga)$/i
            ],
            'collada': [
                /\.(dea)$/i
            ],
        };

        let type = '_unknown_';
        _(fileTypeRegexes).forOwn((patterns, patternType) => {
            if (_(patterns).find(p => p.test(info.name))) {
                type = patternType
            }
        });

        return type;
    }

    static getTaskType() {
        return 'FileLoaderTask';
    }

    execute(args) {
        let db = JdxDatabase.get();

        this.progress(0, 2, 'Reading directory data...')

        let localJetpack = jetpack.cwd(args.root);

        localJetpack.findAsync('.', {
            matching: '*',
            recursive: true,
            files: true,
            directories: true
        }).then(files => {
            let filesList = _(files);
            this.progress(0, filesList.size(), 'Adding file meta data...');

            let nr = 0;
            let filesRemapped = filesList.map(file => {

                nr += 1;
                if (nr % 2000 === 0)
                    this.progress(nr, filesList.size(), 'Adding file meta data...');

                //TODO: Make this async as well!
                let info = localJetpack.inspect(file, {times: true});

                return {
                    name: file,
                    info: info,
                    type: FileLoaderTask.getFileType(info),
                };
            });

            return Promise.resolve(filesRemapped.value());
        }).then(files => {
            this.progress(0, files.length, 'Writing to DB...');

            let progress = 0;
            db.files.clear().then(() => {

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

                db.files.bulkPut(files).then(lastkey => {
                    this.progress(files.length, files.length, 'Saving file data to DB...');
                    this.finish(lastkey);
                }).catch(reason => {
                    this.fail(reason.toString())
                }).catch(Dexie.BulkError, (e) => {
                    this.fail(e.toString())
                });
            }).catch(reason => {
                this.fail(reason.toString());
            });
        });
    }
}