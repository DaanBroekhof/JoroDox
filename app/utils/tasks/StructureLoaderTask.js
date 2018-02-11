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
            if (definition.sourceTransform.type === 'keyValues') {
                sourceItems.forEach(sourceItem => {

                    _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value, key) => {
                        items.push({
                            [definition.sourceTransform.keyName]: key,
                            [definition.sourceTransform.valueName]: value,
                        });
                        relations.push(this.addRelationId({
                            fromKey: definition.sourceTransform.relationsFromName,
                            fromType: definition.id,
                            fromId: key,
                            toKey: definition.sourceTransform.relationsToName,
                            toType: definition.sourceType.id,
                            toId: sourceItem.path,
                        }));
                    });
                });
            }
            else if (definition.sourceTransform.type === 'fileData') {
                sourceItems.forEach(sourceItem => {
                    items.push({
                        path: sourceItem.path,
                        data: definition.sourceTransform.dataPath ? _.get(sourceItem.data, definition.sourceTransform.dataPath): sourceItem.data,
                    });
                    relations.push(this.addRelationId({
                        fromKey: definition.sourceTransform.relationsFromName,
                        fromType: definition.id,
                        fromId: sourceItem.path,
                        toKey: definition.sourceTransform.relationsToName,
                        toType: definition.sourceType.id,
                        toId: sourceItem.path,
                    }));
                });
            }

            if (definition.relations) {
                definition.relations.forEach(relation => {
                    items.forEach(item => {
                        if (relation.type === 'byPath') {
                            relations.push(this.addRelationId({
                                fromKey: relation.fromName,
                                fromType: definition.id,
                                fromId: item[definition.primaryKey],
                                toKey: relation.toName,
                                toType: relation.targetType,
                                toId: relation.pathPrefix + item[relation.property],
                            }));
                        }
                    });
                });
            }

            Promise.all([
                this.saveChunked(items, db[definition.id], 0, 100),
                this.saveChunked(relations, db.relations, 0, 100),
            ]).then(result => {
                this.finish(result);
            }).catch(reason => {
                this.fail(reason.toString())
            });
        });
    }
}