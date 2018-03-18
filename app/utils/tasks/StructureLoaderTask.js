import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const minimatch = require('minimatch');

export default class StructureLoaderTask extends DbBackgroundTask {
  static getTaskType() {
    return 'StructureLoaderTask';
  }

  execute(args) {
    const relationStorage = args.typeDefinition.sourceTransform.relationsStorage ? args.typeDefinition.sourceTransform.relationsStorage : 'relations';

    JdxDatabase.get(args.root).then(db => {
      const definition = args.typeDefinition;

      this.progress(0, 1, 'Removing old data...');

      db[definition.id].clear().then(() => {
        this.progress(0, 1, 'Removing old relations...');

        if (relationStorage === 'relations') {
          let nrDelete = 0;
          const task = this;

          function delChunk() {
            return db[relationStorage].where('fromType').equals(definition.id).limit(1000).delete()
              .then((deleted) => {
                task.progress(0, 1, `Removing old relations ${nrDelete}...`);
                nrDelete++;
                if (deleted !== 0) {
                  return delChunk();
                }
              });
          }

          return delChunk();
        }

        return db[relationStorage].clear();
      }).then(() => {
        this.progress(0, 3, 'Fetching files...');

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
          this.progress(0, 3, 'Parsing data...');

          const sourceItems = _(rawSourceItems);

          let result = { items: [], relations: [] };

          if (definition.sourceTransform.type === 'keyValues') {
            result = this.sourceTransformByKeyValues(sourceItems, definition);
          } else if (definition.sourceTransform.type === 'keyKeyValues') {
            result = this.sourceTransformByKeyKeyValues(sourceItems, definition);
          } else if (definition.sourceTransform.type === 'fileData') {
            result = this.sourceTransformByFileData(sourceItems, definition);
          } else if (definition.sourceTransform.type === 'typesList') {
            result = this.sourceTransformByTypesList(sourceItems, definition);
          } else if (definition.sourceTransform.type === 'stringValues') {
            result = this.sourceTransformByStringValues(sourceItems, definition);
          } else {
            console.warn(`Unknown sourceTransform type \`${definition.sourceTransform.type}\`.`);
          }

          this.progress(0, 3, 'Adding additional relations...');

          // Add any additional relations defined
          result = this.processAdditionalRelations(result, definition);

          this.progress(0, 3, 'Saving data...');

          const chunkSize = definition.sourceTransform.saveChunkSize ? definition.sourceTransform.saveChunkSize : 100;

          // Save everything to DB
          this.saveChunked(result.items, db[definition.id], 0, chunkSize).then(() => this.saveChunked(result.relations, db[relationStorage], 0, chunkSize)).then(result => {
            this.finish(result);
          }).catch(reason => {
            this.fail(reason.toString());
          });
        });
      }).catch(e => {
        console.error(e);
      });
    });
  }

  sourceTransformByKeyValues(sourceItems, definition) {
    const items = [];
    const relations = [];
    sourceItems.forEach(sourceItem => {
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value, key) => {
        const item = {};

        if (definition.sourceTransform.keyName) { item[definition.sourceTransform.keyName] = key; }
        if (definition.sourceTransform.valueName) { item[definition.sourceTransform.valueName] = value; }

        items.push(item);

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
    return { items, relations };
  }

  sourceTransformByStringValues(sourceItems, definition) {
    const items = [];
    const relations = [];
    sourceItems.forEach(sourceItem => {
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value) => {
        const item = {};

        if (definition.sourceTransform.valueRegex !== undefined) {
          // Chop the string up via a regular expression
          const match = value.toString().match(new RegExp(definition.sourceTransform.valueRegex, definition.sourceTransform.valueRegexFlags));

          // No matches == no item
          if (!match) { return; }

          definition.sourceTransform.valueRegexNames.forEach((valueName, index) => {
            if (valueName !== null) { item[valueName] = match[index]; }
          });
        } else {
          item[definition.primaryKey] = value;
        }

        // No data == no item
        if (_.size(item) === 0) { return; }

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
    });
    return { items, relations };
  }


  sourceTransformByKeyKeyValues(sourceItems, definition) {
    const items = [];
    const relations = [];

    sourceItems.forEach(sourceItem => {
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value, key) => {
        _.forOwn(value, (value2, key2) => {
          if (definition.sourceTransform.requiredProperty && value2[definition.sourceTransform.requiredProperty] === undefined) {
            return;
          }
          let item = {};
          if (definition.sourceTransform.keyName) { item[definition.sourceTransform.keyName] = key2; }
          if (definition.sourceTransform.parentKeyName) { item[definition.sourceTransform.parentKeyName] = key; }
          if (definition.sourceTransform.valueName) { item[definition.sourceTransform.valueName] = value2; }
          if (definition.sourceTransform.filenamePattern) {
            const found = sourceItem.path.match(new RegExp(definition.sourceTransform.filenamePattern));
            if (found) {
              item[definition.sourceTransform.filenamePatternKey] = found[1];
            }
          }

          if (definition.sourceTransform.customFields) {
            item = this.getCustomFields(item, definition.sourceTransform.customFields);
          }

          items.push(item);

          relations.push(this.addRelationId({
            fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
            fromType: definition.id,
            fromId: item[definition.primaryKey],
            toKey: definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
            toType: definition.sourceType.id,
            toId: sourceItem.path,
          }));
          if (definition.sourceTransform.parentRelationType) {
            relations.push(this.addRelationId({
              fromKey: definition.id,
              fromType: definition.id,
              fromId: item[definition.primaryKey],
              toKey: definition.sourceTransform.parentKeyName,
              toType: definition.sourceTransform.parentRelationType,
              toId: item[definition.sourceTransform.parentKeyName],
            }));
          }
        });
      });
    });

    return { items, relations };
  }

  sourceTransformByTypesList(sourceItems, definition) {
    const items = [];
    const relations = [];

    let nr = 0;
    sourceItems.forEach(sourceItem => {
      const namespaceValues = {};
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value) => {
        if (_.includes(definition.sourceTransform.types, value.name)) {
          const item = {
            namespace: namespaceValues,
            comments: value.comments.join('\n'),
            nr: nr.toString(),
            id: definition.sourceTransform.idPath ? _.get(value, definition.sourceTransform.idPath) : null,
            type: value.name,
            data: value.data,
          };
          if (definition.sourceTransform.filenamePattern) {
            const found = sourceItem.path.match(new RegExp(definition.sourceTransform.filenamePattern));
            if (found) {
              item[definition.sourceTransform.filenamePatternKey] = found[1];
            }
          }
          items.push(item);
          nr += 1;
          relations.push(this.addRelationId({
            fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
            fromType: definition.id,
            fromId: item[definition.primaryKey],
            toKey: definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
            toType: definition.sourceType.id,
            toId: sourceItem.path,
          }));
        } else {
          namespaceValues[value.name] = value.data;
        }
      });
    });

    return { items, relations };
  }

  sourceTransformByFileData(sourceItems, definition) {
    const items = [];
    const relations = [];

    sourceItems.forEach(sourceItem => {
      const item = {};
      if (definition.sourceTransform.filenamePattern) {
        const found = sourceItem.path.match(new RegExp(definition.sourceTransform.filenamePattern));
        if (found) {
          item[definition.sourceTransform.filenamePatternKey] = found[1];
        }
      }
      item.path = sourceItem.path;
      item.data = definition.sourceTransform.path !== undefined ? _.get(sourceItem, definition.sourceTransform.path) : sourceItem.data;
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

    return { items, relations };
  }

  processAdditionalRelations(result, definition) {
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
          } else if (relation.type === 'valueByPath') {
            const value = _.get(item, relation.path);
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
          } else if (relation.type === 'arrayValuesByPath') {
            _.get(item, relation.path).forEach(relationValue => {
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

  getCustomFields(item, fields) {
    _.forOwn(fields, (fieldDef, fieldName) => {
      if (fieldDef.type === 'concat') {
        item[fieldName] = fieldDef.fields.map(x => _.get(item, x)).join(fieldDef.separator ? fieldDef.separator : '.');
      } else {
        console.warn(`Unknown custom config field \`${fieldDef.type}\`.`, fieldDef);
      }
    });

    return item;
  }
}
