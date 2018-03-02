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
const csvparser = require('electron').remote.require('node-csv-parse')

export default class CsvFileParserTask extends DbBackgroundTask {

    static getTaskType() {
        return 'CsvFileParserTask';
    }

    execute(args) {
        JdxDatabase.get(args.root).then(db => {
            this.progress(0, 1, 'Finding CSV files...');

            let patterns = [];
            let prefixes = [];
            _(args.definition.types).forOwn((typeDefinition) => {
                if (args.filterTypes && !_.includes(args.filterTypes, typeDefinition.id))
                    return;
                if (typeDefinition.sourceType && typeDefinition.sourceType.id === "csv_files" && typeDefinition.sourceType.pathPattern) {
                    patterns.push(typeDefinition.sourceType.pathPattern.replace('{type.id}', typeDefinition.id));
                    prefixes.push(typeDefinition.sourceType.pathPrefix.replace('{type.id}', typeDefinition.id));
                }
            });

            db.files.where('path').startsWithAnyOf(prefixes).filter(file => _(patterns).some(pattern => minimatch(file.path, pattern))).toArray(files => {

                let filesList = _(files);

                let csvResults = [];
                let relations = [];
                filesList.each(file => {
                    let csvData = csvparser(jetpack.read(args.root + syspath.sep + file.path.replace(new RegExp('/', 'g'), syspath.sep)), ";").asObjects();

                    if (csvResults.length % 500 === 0)
                        this.progress(csvResults.length, filesList.size(), 'Parsing ' + filesList.size() + ' CSV files...');

                    csvResults.push({path: file.path, data: csvData});
                    relations.push(this.addRelationId({
                        fromKey: 'csv_files',
                        fromType: 'csv_files',
                        fromId: file.path,
                        toKey: 'file',
                        toType: 'files',
                        toId: file.path
                    }));
                });

                Promise.all([
                    this.saveChunked(csvResults, db.csv_files, 0, 500),
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