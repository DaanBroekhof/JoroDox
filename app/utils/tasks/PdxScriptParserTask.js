import BackgroundTask from "./BackgroundTask";
import JdxDatabase from "../JdxDatabase";
import PdxScript from "../PdxScript";
import Dexie from "dexie/dist/dexie";
import FileView from "../../components/FileView";
import * as iconv from "iconv-lite";
import DbBackgroundTask from "./DbBackgroundTask";
const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');
const minimatch = require("minimatch");

export default class PdxScriptParserTask extends DbBackgroundTask {

    static getTaskType() {
        return 'PdxScriptParserTask';
    }

    execute(args) {
        JdxDatabase.get(args.root).then(db => {
            this.progress(0, 1, 'Finding PDX scripts...');

            let patterns = [];
            let prefixes = [];
            _(args.definition.types).forOwn((typeDefinition) => {
                if (args.filterTypes && !_.includes(args.filterTypes, typeDefinition.id))
                    return;
                if (typeDefinition.sourceType && typeDefinition.sourceType.format === "pdxScript" && typeDefinition.sourceType.pathPattern) {
                    patterns.push(typeDefinition.sourceType.pathPattern);
                    prefixes.push(typeDefinition.sourceType.pathPrefix);
                }
            });

            db.files.where('path').startsWithAnyOf(prefixes).filter(file => _(patterns).some(pattern => minimatch(file.path, pattern))).toArray(files => {

                let filesList = _(files);

                let scripts = [];
                let relations = [];
                filesList.each(file => {
                    let parser = new PdxScript();
                    let data = parser.readFile(iconv.decode(jetpack.read(args.root + syspath.sep + file.path.replace(new RegExp('/', 'g'), syspath.sep), 'buffer'), 'win1252'));

                    if (scripts.length % 500 === 0)
                        this.progress(scripts.length, filesList.size(), 'Parsing ' + filesList.size() + ' PDX scripts...');

                    scripts.push({path: file.path, data: data});
                    relations.push(this.addRelationId({
                        fromKey: 'pdxScript',
                        fromType: 'pdxScripts',
                        fromId: file.path,
                        toKey: 'file',
                        toType: 'files',
                        toId: file.path
                    }));
                });

                Promise.all([
                    this.saveChunked(scripts, db.pdxScripts, 0, 500),
                    this.saveChunked(relations, db.relations, 0, 500),
                ]).then(result => {
                    this.finish(result);
                }).catch(reason => {
                    this.fail(reason.toString())
                });
            });
        });
    }
}