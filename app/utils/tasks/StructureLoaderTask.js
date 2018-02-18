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
        JdxDatabase.get(args.root).then(db => {
            let definition = args.typeDefinition;

            this.progress(0, 1, 'Removing old data...');

            db[definition.id].clear().then(() => {

                this.progress(0, 1, 'Fetching files...');

                // Filter on known path info
                let sourceData = db[definition.sourceType.id];
                if (definition.sourceType.pathPrefix) {
                    sourceData = sourceData.where('path').startsWith(definition.sourceType.pathPrefix.replace('{type.id}', definition.id));
                }
                if (definition.sourceType.pathPattern) {
                    sourceData = sourceData.filter(sourceItem => minimatch(sourceItem.path, definition.sourceType.pathPattern.replace('{type.id}', definition.id)));
                }

                // Iterate over all found data items
                sourceData.toArray(rawSourceItems => {
                    let sourceItems = _(rawSourceItems);

                    let result = {items: [], relations: []};

                    if (this['sourceTransformBy'+ _.upperFirst(definition.sourceTransform.type)]) {
                        result = this['sourceTransformBy'+ _.upperFirst(definition.sourceTransform.type)](sourceItems, definition);
                    }
                    else {
                        console.warn('Unknown sourceTransform type `'+  definition.sourceTransform.type +'`.');
                    }

                    // Add any additional relations defined
                    result = this.processAdditionalRelations(result, definition);


                    // Save them all to DB
                    Promise.all([
                        this.saveChunked(result.items, db[definition.id], 0, 100),
                        this.saveChunked(result.relations, db.relations, 0, 100),
                    ]).then(result => {
                        this.finish(result);
                    }).catch(reason => {
                        this.fail(reason.toString())
                    });
                });
            });
        });
    }

    sourceTransformByKeyValues(sourceItems, definition)
    {
        let items = [];
        let relations = [];
        sourceItems.forEach(sourceItem => {
            _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value, key) => {
                items.push({
                    [definition.sourceTransform.keyName]: key,
                    [definition.sourceTransform.valueName]: value,
                });
                relations.push(this.addRelationId({
                    fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
                    fromType: definition.id,
                    fromId: key,
                    toKey: definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
                    toType: definition.sourceType.id,
                    toId: sourceItem.path,
                }));
            });
        });
        return {items, relations};
    }

    sourceTransformByKeyKeyValues(sourceItems, definition)
    {
        let items = [];
        let relations = [];

        sourceItems.forEach(sourceItem => {
            _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value, key) => {
                _.forOwn(value, (value2, key2) => {
                    if (definition.sourceTransform.requiredProperty && value2[definition.sourceTransform.requiredProperty] === undefined) {
                        return;
                    }
                    items.push({
                        [definition.sourceTransform.keyName]: key2,
                        [definition.sourceTransform.valueName]: value2,
                    });
                    relations.push(this.addRelationId({
                        fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
                        fromType: definition.id,
                        fromId: key2,
                        toKey: definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
                        toType: definition.sourceType.id,
                        toId: sourceItem.path,
                    }));
                    if (definition.sourceTransform.parentRelationType) {
                        relations.push(this.addRelationId({
                            fromKey: definition.id,
                            fromType: definition.id,
                            fromId: key2,
                            toKey: definition.sourceTransform.parentRelationKey,
                            toType: definition.sourceTransform.parentRelationType,
                            toId: key,
                        }));
                    }
                })
            });
        });

        return {items, relations};
    }

    sourceTransformByNamespacedTypes(sourceItems, definition)
    {
        let items = [];
        let relations = [];

        sourceItems.forEach(sourceItem => {
            let namespaceValues = {}
            _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value) => {
                if (_.includes(definition.sourceTransform.types, value.name)) {
                    items.push({
                        namespace: namespaceValues,
                        comments: value.comments.join("\n"),
                        id: value.data.id,
                        type: value.name,
                        data: value.data,
                    });
                    relations.push(this.addRelationId({
                        fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
                        fromType: definition.id,
                        fromId: value.data.id,
                        toKey: definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
                        toType: definition.sourceType.id,
                        toId: sourceItem.path,
                    }));
                }
                else {
                    namespaceValues[value.name] = value.data;
                }
            });
        });

        return {items, relations};
    }

    sourceTransformByFileData(sourceItems, definition)
    {
        let items = [];
        let relations = [];

        sourceItems.forEach(sourceItem => {
            let item = {};
            if (definition.sourceTransform.filenamePattern) {
                let found = sourceItem.path.match(new RegExp(definition.sourceTransform.filenamePattern));
                if (found) {
                    item[definition.sourceTransform.filenamePatternKey] = found[1];
                }
            }
            item.path = sourceItem.path;
            item.data = definition.sourceTransform.dataPath ? _.get(sourceItem.data, definition.sourceTransform.dataPath) : sourceItem.data;
            items.push(item);

            relations.push(this.addRelationId({
                fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
                fromType: definition.id,
                fromId: item[definition.primaryKey],
                toKey: definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
                toType: definition.sourceType.id,
                toId: sourceItem.path,
            }));
        });

        return {items, relations};
    }

    processAdditionalRelations(result, definition)
    {
        if (definition.relations) {
            definition.relations.forEach(relation => {
                result.items.forEach(item => {
                    if (relation.type === 'byPath') {
                        result.relations.push(this.addRelationId({
                            fromKey: relation.fromName,
                            fromType: definition.id,
                            fromId: item[definition.primaryKey],
                            toKey: relation.toName,
                            toType: relation.toType,
                            toId: relation.pathPrefix + item[relation.property],
                        }));
                    }
                    else if (relation.type === 'valueByPath') {
                        let value = _.get(item, relation.dataPath);
                        if (value) {
                            result.relations.push(this.addRelationId({
                                fromKey: relation.fromName,
                                fromType: definition.id,
                                fromId: item[definition.primaryKey],
                                toKey: relation.toName,
                                toType: relation.toType,
                                toId: value,
                            }));
                        }
                    }
                    else if (relation.type === 'arrayValuesByPath') {
                        _.get(item, relation.dataPath).forEach(relationValue => {
                            result.relations.push(this.addRelationId({
                                fromKey: relation.fromName,
                                fromType: definition.id,
                                fromId: item[definition.primaryKey],
                                toKey: relation.toName,
                                toType: relation.toType,
                                toId: relationValue,
                            }));
                        });
                    }
                });
            });
        }
        return result;
    }
}