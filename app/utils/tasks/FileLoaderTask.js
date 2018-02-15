import JdxDatabase from "../JdxDatabase";
import DbBackgroundTask from "./DbBackgroundTask";

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');
const minimatch = require("minimatch");

export default class FileLoaderTask extends DbBackgroundTask {

    static getFileType(info) {

        let fileTypeRegexes = {
            'pdxScript': [
                /\.(asset|gfx|txt|gui)$/i
            ],
            'pdxMesh': [
                /\.mesh$/i
            ],
            'pdxAnim': [
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
        JdxDatabase.get(args.root).then(db => {

            this.progress(0, 1, 'Reading directory data...');

            let localJetpack = jetpack.cwd(args.root);

            let typeDefinition = args.typeDefinition;

            localJetpack.findAsync('.', {
                matching: '*',
                recursive: true,
                files: true,
                directories: true
            }).then(files => {
                let filesList = _(files).filter(file => !typeDefinition.readerFileIgnore.some(x => minimatch(file, x)));

                this.progress(0, filesList.size(), 'Adding ' + filesList.size() + ' file meta data items...');

                let nr = 0;
                let filesRemapped = filesList.map(file => {

                    nr += 1;
                    if (nr % 1000 === 0)
                        this.progress(nr, filesList.size(), 'Adding ' + filesList.size() + ' file meta data items...');

                    //TODO: Make this async as well!
                    let info = localJetpack.inspect(file, {times: true});

                    return {
                        path: file.replace(new RegExp('\\' + syspath.sep, 'g'), '/'),
                        info: info,
                        //type: FileLoaderTask.getFileType(info),
                    };
                });

                Promise.all([
                    this.saveChunked(filesRemapped.value(), db.files, 0, 500),
                ]).then(result => {
                    this.finish(result);
                }).catch(reason => {
                    this.fail(reason.toString())
                });
            });
        });
    }
}