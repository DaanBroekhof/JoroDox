import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const minimatch = require('minimatch');

export default class StructureLoaderTask extends DbBackgroundTask {
  static getTaskType() {
    return 'StructureLoaderTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = args.typeDefinition;
    const relationStorage = definition.sourceTransform.relationsStorage ? definition.sourceTransform.relationsStorage : 'relations';

    this.project = args.project;

    if (!args.paths) {
      this.progress(0, 1, 'Removing old data...');

      await db[definition.id].clear();
      this.progress(0, 1, 'Removing old relations...');

      if (relationStorage === 'relations') {
        await this.deleteChunked(db[relationStorage].where('fromType').equals(definition.id));
      } else {
        await db[relationStorage].clear();
      }
    }

    this.progress(0, 3, 'Fetching files...');

    // Filter on known path info
    let sourceData = db[definition.sourceType.id];
    if (args.paths) {
      const paths = StructureLoaderTask.filterPaths(definition, args.paths);
      if (paths.length === 0) {
        return null;
      }
      sourceData = sourceData.where('path').anyOf(paths);
    } else {
      if (definition.sourceType.path) {
        sourceData = sourceData.where({path: definition.sourceType.path.replace('{type.id}', definition.id)});
      }
      if (definition.sourceType.pathPrefix) {
        sourceData = sourceData.where('path').startsWith(definition.sourceType.pathPrefix.replace('{type.id}', definition.id));
      }
      if (definition.sourceType.pathPattern) {
        sourceData = sourceData.filter(sourceItem => minimatch(sourceItem.path, definition.sourceType.pathPattern.replace('{type.id}', definition.id)));
      }
    }

    // Iterate over all found data items
    const rawSourceItems = await sourceData.toArray();
    this.progress(0, 3, 'Parsing data...');

    const sourceItems = _(rawSourceItems);

    let result = {items: [], relations: []};

    if (definition.sourceTransform.type === 'keyValues') {
      result = this.sourceTransformByKeyValues(sourceItems, definition);
    } else if (definition.sourceTransform.type === 'keyKeyValues') {
      result = this.sourceTransformByKeyKeyValues(sourceItems, definition);
    } else if (definition.sourceTransform.type === 'fileData') {
      result = this.sourceTransformByFileData(sourceItems, definition);
    } else if (definition.sourceTransform.type === 'typesList') {
      result = this.sourceTransformByTypesList(sourceItems, definition);
    } else if (definition.sourceTransform.type === 'typesListData') {
      result = this.sourceTransformByTypesListData(sourceItems, definition);
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
    await this.saveChunked(result.items, db[definition.id], 0, chunkSize);
    await this.saveChunked(result.relations, db[relationStorage], 0, chunkSize);
  }

  sourceTransformByKeyValues(sourceItems, definition) {
    const items = [];
    const relations = [];
    sourceItems.forEach(sourceItem => {
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value, key) => {
        const item = {};

        if (definition.sourceTransform.keyName) {
          item[definition.sourceTransform.keyName] = key;
        }
        if (definition.sourceTransform.valueName) {
          item[definition.sourceTransform.valueName] = value;
        }

        if (definition.sourceTransform.customFields) {
          this.getCustomFields(item, definition.sourceTransform.customFields);
        }

        item[definition.primaryKey] = item[definition.primaryKey].toString();
        items.push(item);

        relations.push(this.addRelationId({
          fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
          fromType: definition.id,
          fromId: item[definition.primaryKey],
          toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
          toType: definition.sourceType.id,
          toId: sourceItem.path,
        }));
      });
    });
    return {items, relations};
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
          if (!match) {
            return;
          }

          definition.sourceTransform.valueRegexNames.forEach((valueName, index) => {
            if (valueName !== null) {
              item[valueName] = match[index];
            }
          });
        } else {
          item[definition.primaryKey] = value;
        }

        // No data == no item
        if (_.size(item) === 0) {
          return;
        }

        if (definition.sourceTransform.customFields) {
          this.getCustomFields(item, definition.sourceTransform.customFields);
        }
        item[definition.primaryKey] = item[definition.primaryKey].toString();

        items.push(item);

        relations.push(this.addRelationId({
          fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
          fromType: definition.id,
          fromId: item[definition.primaryKey],
          toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
          toType: definition.sourceType.id,
          toId: sourceItem.path,
        }));
      });
    });
    return {items, relations};
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
          const item = {};
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
            this.getCustomFields(item, definition.sourceTransform.customFields);
          }
          item[definition.primaryKey] = item[definition.primaryKey].toString();

          items.push(item);

          relations.push(this.addRelationId({
            fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
            fromType: definition.id,
            fromId: item[definition.primaryKey],
            toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
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

    return {items, relations};
  }

  sourceTransformByTypesList(sourceItems, definition) {
    const items = [];
    const relations = [];

    let nr = 0;
    sourceItems.forEach(sourceItem => {
      const namespaceValues = {};
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value) => {
        if (_.includes(definition.sourceTransform.types, value.name) || _.includes(definition.sourceTransform.types, '*')) {
          const item = {
            namespace: namespaceValues,
            comments: value.comments.join('\n').trim(),
            nr: nr.toString(),
            id: definition.sourceTransform.idPath ? _.get(value, definition.sourceTransform.idPath) : null,
            type: value.name,
            data: value.data,
          };

          if (definition.sourceTransform.idPath && item.id === undefined) {
            console.error('Could not find ID in item for data path `' + definition.sourceTransform.idPath.join('.') + '`.', item);
            JdxDatabase.addError(this.project, {
              message: 'Could not find ID in item for data path `' + definition.sourceTransform.idPath.join('.') + '`.',
              path: sourceItem.path,
              type: definition.id,
              typeId: null,
              severity: 'error',
              data: item,
            });
            return;
          }

          if (definition.sourceTransform.filenamePattern) {
            const found = sourceItem.path.match(new RegExp(definition.sourceTransform.filenamePattern));
            if (found) {
              item[definition.sourceTransform.filenamePatternKey] = found[1];
            }
          }

          if (definition.sourceTransform.customFields) {
            this.getCustomFields(item, definition.sourceTransform.customFields);
          }

          if (item[definition.primaryKey] !== undefined)
            item[definition.primaryKey] = item[definition.primaryKey].toString();
          items.push(item);

          nr += 1;
          relations.push(this.addRelationId({
            fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
            fromType: definition.id,
            fromId: item[definition.primaryKey],
            toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
            toType: definition.sourceType.id,
            toId: sourceItem.path,
          }));
        } else {
          if (!definition.sourceTransform.disableNamespace) {
            namespaceValues[value.name] = value.data;
          }
        }
      });
    });

    return {items, relations};
  }

  sourceTransformByTypesListData(sourceItems, definition) {
    const items = [];
    const relations = [];

    let nr = 0;
    sourceItems.forEach(sourceItem => {
      let itemSets = _.get(sourceItem, definition.sourceTransform.path);

      if (!_.isArray(itemSets)) {
        itemSets = [itemSets];
      }
      itemSets.forEach(itemSet => {
        _.forOwn(itemSet, (values, key) => {
          if (_.includes(definition.sourceTransform.types, key) || _.includes(definition.sourceTransform.types, '*')) {
            values = !_.isArray(values) ? [values] : values;

            values.forEach(value => {
              const item = {
                nr: nr.toString(),
                id: definition.sourceTransform.idPath ? _.get(value, definition.sourceTransform.idPath) : null,
                type: key,
                data: value,
              };

              if (definition.sourceTransform.idPath && item.id === undefined) {
                console.error('Could not find ID in item for data path `' + definition.sourceTransform.idPath.join('.') + '`.', item);
                JdxDatabase.addError(this.project, {
                  message: 'Could not find ID in item for data path `' + definition.sourceTransform.idPath.join('.') + '`.',
                  path: sourceItem.path,
                  type: definition.id,
                  typeId: null,
                  severity: 'error',
                  data: item,
                });
                return;
              }

              if (definition.sourceTransform.filenamePattern) {
                const found = sourceItem.path.match(new RegExp(definition.sourceTransform.filenamePattern));
                if (found) {
                  item[definition.sourceTransform.filenamePatternKey] = found[1];
                }
              }

              if (definition.sourceTransform.customFields) {
                this.getCustomFields(item, definition.sourceTransform.customFields);
              }

              if (item[definition.primaryKey] !== undefined)
                item[definition.primaryKey] = item[definition.primaryKey].toString();
              items.push(item);

              nr += 1;
              relations.push(this.addRelationId({
                fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
                fromType: definition.id,
                fromId: item[definition.primaryKey],
                toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
                toType: definition.sourceType.id,
                toId: sourceItem.path,
              }));
            });
          }
        });
      });
    });

    return {items, relations};
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

      if (definition.sourceTransform.customFields) {
        this.getCustomFields(item, definition.sourceTransform.customFields);
      }
      if (item[definition.primaryKey] === undefined) {
        console.error('Primary key `' + definition.primaryKey + '` not found.', item);
        JdxDatabase.addError(this.project, {
          message: 'Primary key `' + definition.primaryKey + '` not found in item.',
          path: sourceItem.path,
          type: definition.id,
          typeId: null,
          severity: 'error',
          data: item,
        });
        return;
      }
      item[definition.primaryKey] = item[definition.primaryKey].toString();
      items.push(item);

      relations.push(this.addRelationId({
        fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
        fromType: definition.id,
        fromId: item[definition.primaryKey],
        toKey: 'source', //definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
        toType: definition.sourceType.id,
        toId: sourceItem.path,
      }));
    });

    return {items, relations};
  }

  processAdditionalRelations(result, definition) {
    if (definition.relations) {
      definition.relations.forEach(relation => {
        result.items.forEach(item => {
          if (relation.type === 'byPath') {
            result.relations.push(this.addRelationId({
              fromKey: relation.fromName,
              fromType: definition.id,
              fromId: item[definition.primaryKey].toString(),
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
                fromId: item[definition.primaryKey].toString(),
                toKey: relation.toName,
                toType: relation.toType,
                toId: value.toString(),
              }));
            }
          } else if (relation.type === 'arrayValuesByPath') {
            const values = _.get(item, relation.path);
            if (values) {
              if (!_.isArray(values)) {
                console.error('Relation path is not an array: ', item, relation.path);
                JdxDatabase.addError(this.project, {
                  message: 'Relation path is not an array: ',
                  path: null,
                  type: definition.id,
                  typeId: item[definition.primaryKey].toString(),
                  severity: 'warning',
                  data: [item, relation.path],
                });
                return;
              }

              values.forEach(relationValue => {
                result.relations.push(this.addRelationId({
                  fromKey: relation.fromName,
                  fromType: definition.id,
                  fromId: item[definition.primaryKey].toString(),
                  toKey: relation.toName,
                  toType: relation.toType,
                  toId: relationValue.toString(),
                }));
              });
            }
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
      } else if (fieldDef.type === 'get') {
        item[fieldName] = _.get(item, fieldDef.fields);
      } else {
        console.warn(`Unknown custom config field \`${fieldDef.type}\`.`, fieldDef);
      }
    });

    return item;
  }
}
