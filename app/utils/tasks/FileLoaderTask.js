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

            //let progress = 0;
            db.files.clear().then(() => {


                let totalCount = 0;
                let saveChunk = (data, chunkNr, chunkSize) => {
                    let slice = data.slice(chunkNr*chunkSize, (chunkNr+1)*chunkSize);
                    db.files.bulkPut(slice).then(lastkey => {
                        totalCount += slice.length;
                        this.progress(totalCount, data.length, 'Saving file data to DB...');
                        if (totalCount >= data.length || chunkNr*chunkSize >= data.length)
                            this.finish(lastkey);
                        else
                            saveChunk(data, chunkNr+1, chunkSize);
                    }).catch(reason => {
                        this.fail(reason.toString())
                    }).catch(Dexie.BulkError, (e) => {
                        this.fail(e.toString())
                    });
                };

                saveChunk(files, 0, 1000);
            }).catch(reason => {
                this.fail(reason.toString());
            });
        });
    }
}