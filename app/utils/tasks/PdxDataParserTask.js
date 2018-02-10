import JdxDatabase from "../JdxDatabase";
import PdxData from "../PdxData";
import DbBackgroundTask from "./DbBackgroundTask";
const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');
const minimatch = require("minimatch");

export default class PdxDataParserTask extends DbBackgroundTask {

    static getTaskType() {
        return 'PdxDataParserTask';
    }

    execute(args) {
        let db = JdxDatabase.get(args.root);

        this.progress(0, 1, 'Finding PDX data files...');

        let patterns = [];
        _(args.definition.types).forOwn((typeDefinition) => {
            if (typeDefinition.sourceType && typeDefinition.sourceType.format === "pdxData" && typeDefinition.sourceType.pathPattern) {
                patterns.push(typeDefinition.sourceType.pathPattern);
            }
        });

        db.files.filter(file => _(patterns).some(pattern => minimatch(file.path, pattern))).toArray(files => {

            let filesList = _(files);

            this.progress(0, filesList.size(), 'Parsing '+ filesList.size() +' PDX binary data files...');

            let datafiles = [];
            let relations = [];
            filesList.each(file => {
                let parser = new PdxData();
                let data = parser.readFromBuffer(new Uint8Array(jetpack.read(args.root + syspath.sep + file.path.replace(new RegExp('/', 'g'), syspath.sep), 'buffer')).buffer);

                if (datafiles.length % 50 === 0)
                    this.progress(datafiles.length, filesList.size(), 'Parsing '+ filesList.size() +' PDX binary data objects...');

                datafiles.push({path: file.path, data: data});
                relations.push({fromKey: 'pdxData', fromType: 'pdxData', fromId: file.path, toKey: 'file', toType: 'file', toId: file.path})
            });

            Promise.all([
                this.saveChunked(datafiles, db.pdxData, 0, 500),
                this.saveChunked(relations, db.relations, 0, 500),
            ]).then(result => {
                this.finish(result);
            }).catch(reason => {
                this.fail(reason.toString())
            });
        });
    }

    static parseFile(root, path)
    {
        let parser = new PdxData();
        let data = parser.readFromBuffer(new Uint8Array(jetpack.read(root + syspath.sep + path.replace(new RegExp('/', 'g'), syspath.sep), 'buffer')).buffer);

        return {path: path, data: data};
    }
}