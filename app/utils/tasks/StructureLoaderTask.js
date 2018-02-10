import BackgroundTask from "./BackgroundTask";
import JdxDatabase from "../JdxDatabase";
import Dexie from "dexie/dist/dexie";
import DbBackgroundTask from "./DbBackgroundTask";

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const minimatch = require("minimatch");

export default class StructureLoaderTask extends DbBackgroundTask {

    static getTaskType() {
        return 'StructureLoaderTask';
    }

    execute(args) {
        let db = JdxDatabase.get(args.root);

        let definition = args.typeDefinition;

        this.progress(0, 1, 'Fetching files...');

        let sourceData = db[definition.sourceType.id];
        if (definition.sourceType.pathPrefix) {
            sourceData = sourceData.where('path').startsWith(definition.sourceType.pathPrefix);
        }
        if (definition.sourceType.pathPattern) {
            sourceData = sourceData.filter(sourceItem => minimatch(sourceItem.path, definition.sourceType.pathPattern));
        }

        sourceData.toArray(rawSourceItems => {
            let sourceItems = _(rawSourceItems);

            let items = [];
            let relations = [];
            if (definition.transform.type === 'keyValues') {
                sourceItems.forEach(sourceItem => {

                    _.forOwn(_.get(sourceItem, definition.transform.path), (value, key) => {
                        items.push({
                            [definition.transform.keyName]: key,
                            [definition.transform.valueName]: value,
                        });
                        relations.push({
                            fromKey: definition.transform.relationsFromName,
                            fromType: definition.id,
                            fromId: key,
                            toKey: definition.transform.relationsToName,
                            toType: definition.sourceType.id,
                            toId: sourceItem.path,
                        });
                    });
                });
            }
            else if (definition.transform.type === 'fileData') {
                sourceItems.forEach(sourceItem => {
                    items.push({
                        path: sourceItem.path,
                        data: sourceItem.data,
                    });
                    relations.push({
                        fromKey: definition.transform.relationsFromName,
                        fromType: definition.id,
                        fromId: sourceItem.path,
                        toKey: definition.transform.relationsToName,
                        toType: definition.sourceType.id,
                        toId: sourceItem.path,
                    });
                });
            }

            Promise.all([
                this.saveChunked(items, db[definition.id], 0, 1000),
                this.saveChunked(relations, db.relations, 0, 1000),
            ]).then(result => {
                this.finish(result);
            }).catch(reason => {
                this.fail(reason.toString())
            });
        });
    }
}