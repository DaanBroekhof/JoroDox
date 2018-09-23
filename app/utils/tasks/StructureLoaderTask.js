import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';
import _ from "lodash";

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
    const relationStorage = definition.sourceTransform.relationsStorage !== undefined ? definition.sourceTransform.relationsStorage : 'relations';

    this.project = args.project;

    if (!args.paths) {
      this.progress(0, 1, 'Removing old data...');

      await db[definition.id].clear();

      if (relationStorage) {
        this.progress(0, 1, 'Removing old relations...');

        if (relationStorage === 'relations') {
          await this.deleteChunked(db[relationStorage].where('fromType').equals(definition.id));
        } else {
          await db[relationStorage].clear();
        }
      }
    }

    this.progress(0, 3, 'Fetching files...');

    // Filter on known path info
    let sourceData = db[definition.sourceType.id];
    const sourceDefinition = JdxDatabase.getTypeDefinition(args.project, definition.sourceType.id);

    if (sourceDefinition.primaryKey === 'path') {
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
    }

    // Iterate over all found data items
    const rawSourceItems = await sourceData.toArray();
    this.progress(0, 3, 'Processing data...');

    const sourceItems = _(rawSourceItems);

    let result = {items: [], relations: []};

    if (definition.sourceTransform.type === 'keyValues') {
      result = await this.sourceTransformByKeyValues(sourceItems, definition, !relationStorage);
    } else if (definition.sourceTransform.type === 'keyKeyValues') {
      result = await this.sourceTransformByKeyKeyValues(sourceItems, definition, !relationStorage);
    } else if (definition.sourceTransform.type === 'fileData') {
      result = await this.sourceTransformByFileData(sourceItems, definition, !relationStorage);
    } else if (definition.sourceTransform.type === 'typesList') {
      result = await this.sourceTransformByTypesList(sourceItems, definition, !relationStorage);
    } else if (definition.sourceTransform.type === 'typesListData') {
      result = await this.sourceTransformByTypesListData(sourceItems, definition, !relationStorage);
    } else if (definition.sourceTransform.type === 'stringValues') {
      result = await this.sourceTransformByStringValues(sourceItems, definition, !relationStorage);
    } else {
      console.warn(`Unknown sourceTransform type \`${definition.sourceTransform.type}\`.`);
    }

    // Add any additional relations defined
    if (relationStorage) {
      this.progress(0, 3, 'Adding additional relations...');
      result = await this.processAdditionalRelations(result, definition);
    }

    this.progress(0, 3, 'Saving data...');

    const chunkSize = definition.sourceTransform.saveChunkSize ? definition.sourceTransform.saveChunkSize : 100;

    // Save everything to DB
    await this.saveChunked(result.items, db[definition.id], 0, chunkSize);
    if (relationStorage) {
      await this.saveChunked(result.relations, db[relationStorage], 0, chunkSize);
    }

    JdxDatabase.updateTypeIdentifiers(this.project, definition.id);
  }

  sourceTransformByKeyValues(sourceItems, definition, skipRelations) {
    const items = [];
    const relations = [];
    const localVariables = {};
    sourceItems.forEach(sourceItem => {
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value, key) => {
        if (this.hasFeature('global_variables') && key[0] === '@' && !definition.sourceTransform.storeVariables) {
          localVariables[key] = value;
          return;
        }

        const item = {};

        if (definition.sourceTransform.keyName) {
          item[definition.sourceTransform.keyName] = key;
        }
        if (definition.sourceTransform.valueName) {
          item[definition.sourceTransform.valueName] = value;
        }

        if (definition.sourceTransform.ignoreKeys && definition.sourceTransform.ignoreKeys.includes(key)) {
          return;
        }
        if (definition.sourceTransform.onlyKeys && !definition.sourceTransform.onlyKeys.includes(key)) {
          return;
        }

        if (definition.sourceTransform.onlyValueKeys) {
          item[definition.sourceTransform.valueName] = _.pick(item[definition.sourceTransform.valueName], definition.sourceTransform.onlyValueKeys);
        }

        this.doCommonItemOperations(item, definition, sourceItem.path, localVariables);

        items.push(item);

        if (!skipRelations) {
          relations.push(this.addRelationId({
            fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
            fromType: definition.id,
            fromId: item[definition.primaryKey],
            toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
            toType: definition.sourceType.id,
            toId: definition.sourceTransform.sourceIdKey ? sourceItem[definition.sourceTransform.sourceIdKey] : sourceItem.path,
          }));
        }
      });
    });
    return {items, relations};
  }

  sourceTransformByStringValues(sourceItems, definition, skipRelations) {
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

        this.doCommonItemOperations(item, definition, sourceItem.path);

        if (!this.validItem(item, definition)) {
          return;
        }

        items.push(item);

        if (!skipRelations) {
          relations.push(this.addRelationId({
            fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
            fromType: definition.id,
            fromId: item[definition.primaryKey],
            toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
            toType: definition.sourceType.id,
            toId: sourceItem.path,
          }));
        }
      });
    });
    return {items, relations};
  }


  sourceTransformByKeyKeyValues(sourceItems, definition, skipRelations) {
    const items = [];
    const relations = [];
    const localVariables = {};

    sourceItems.forEach(sourceItem => {
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), (value, key) => {
        if (this.hasFeature('global_variables') && key[0] === '@' && !definition.sourceTransform.storeVariables) {
          localVariables[key] = value;
          return;
        }

        if (definition.sourceTransform.parentSubPath) {
          value = _.get(value, definition.sourceTransform.parentSubPath);
        }
        _.forOwn(value, (value2, key2) => {
          if (definition.sourceTransform.requiredProperty && value2[definition.sourceTransform.requiredProperty] === undefined) {
            return;
          }
          if (definition.sourceTransform.ignoreKeys && definition.sourceTransform.ignoreKeys.includes(key2)) {
            return;
          }
          const item = {};
          if (definition.sourceTransform.keyName) {
            item[definition.sourceTransform.keyName] = key2;
          }
          if (definition.sourceTransform.parentKeyName) {
            item[definition.sourceTransform.parentKeyName] = key;
          }
          if (definition.sourceTransform.valueName) {
            item[definition.sourceTransform.valueName] = value2;
          }

          this.doCommonItemOperations(item, definition, sourceItem.path, localVariables);

          items.push(item);

          if (!skipRelations) {
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
          }
        });
      });
    });

    return {items, relations};
  }

  async sourceTransformByTypesList(sourceItems, definition, skipRelations) {
    const items = [];
    const relations = [];
    const localVariables = {};

    let nr = 0;
    sourceItems.forEach(async sourceItem => {
      const namespaceValues = {};
      let nrFile = 0;
      _.forOwn(_.get(sourceItem, definition.sourceTransform.path), async (value) => {
        if (this.hasFeature('global_variables') && value.name[0] === '@' && !definition.sourceTransform.storeVariables) {
          localVariables[value.name] = value.data;
          return;
        }

        if (this.matchTypes(definition.sourceTransform.types, value.name)) {
          const item = {
            namespace: namespaceValues,
            comments: value.comments.join('\n').trim(),
            nr: nr.toString(),
            nrFile: nrFile.toString(),
            id: definition.sourceTransform.idPath ? _.get(value, definition.sourceTransform.idPath) : null,
            type: value.name,
            data: value.data,
          };

          if (definition.sourceTransform.idPath && item.id === undefined) {
            console.error('Could not find ID in `' + definition.id + '` item for data path `' + definition.sourceTransform.idPath.join('.') + '`.', item);
            await JdxDatabase.addError(this.project, {
              message: 'Could not find ID in item for data path `' + definition.sourceTransform.idPath.join('.') + '`.',
              path: sourceItem.path,
              type: definition.id,
              typeId: null,
              severity: 'error',
              data: item,
            });
            this.sendResponse({errorsUpdate: true});
            return;
          }

          this.doCommonItemOperations(item, definition, sourceItem.path, localVariables);

          if (!definition.sourceTransform.nrFile) {
            delete item.nrFile;
          }

          items.push(item);

          nr += 1;
          nrFile += 1;
          if (!skipRelations) {
            relations.push(this.addRelationId({
              fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
              fromType: definition.id,
              fromId: item[definition.primaryKey],
              toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
              toType: definition.sourceType.id,
              toId: sourceItem.path,
            }));
          }
        } else {
          if (!definition.sourceTransform.disableNamespace) {
            namespaceValues[value.name] = value.data;
          }
        }
      });
    });

    return {items, relations};
  }

  async sourceTransformByTypesListData(sourceItems, definition, skipRelations) {
    const items = [];
    const relations = [];
    const localVariables = {};

    let nr = 0;
    sourceItems.forEach(async sourceItem => {
      let itemSets = _.get(sourceItem, definition.sourceTransform.path);

      if (!_.isArray(itemSets)) {
        itemSets = [itemSets];
      }
      itemSets.forEach(async itemSet => {
        _.forOwn(itemSet, async (values, key) => {
          if (this.matchTypes(definition.sourceTransform.types, key)) {
            values = !_.isArray(values) ? [values] : values;

            values.forEach(async value => {
              const item = {
                nr: nr.toString(),
                id: definition.sourceTransform.idPath ? _.get(value, definition.sourceTransform.idPath) : null,
                type: key,
                data: definition.sourceTransform.typeAsDataKey ? {[key]: value} : value,
              };

              if (definition.sourceTransform.idPath && item.id === undefined) {
                console.error('Could not find ID in item for data path `' + definition.sourceTransform.idPath.join('.') + '`.', item);
                await JdxDatabase.addError(this.project, {
                  message: 'Could not find ID in item for data path `' + definition.sourceTransform.idPath.join('.') + '`.',
                  path: sourceItem.path,
                  type: definition.id,
                  typeId: null,
                  severity: 'error',
                  data: item,
                });
                this.sendResponse({errorsUpdate: true});
                return;
              }

              this.doCommonItemOperations(item, definition, sourceItem.path, localVariables);

              items.push(item);

              nr += 1;

              if (!skipRelations) {
                relations.push(this.addRelationId({
                  fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
                  fromType: definition.id,
                  fromId: item[definition.primaryKey],
                  toKey: 'source', // definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
                  toType: definition.sourceType.id,
                  toId: sourceItem.path,
                }));
              }
            });
          }
        });
      });
    });

    return {items, relations};
  }

  async sourceTransformByFileData(sourceItems, definition, skipRelations) {
    const items = [];
    const relations = [];

    sourceItems.forEach(async sourceItem => {
      const item = {};
      if (definition.sourceTransform.filenamePattern) {
        const found = sourceItem.path.match(new RegExp(definition.sourceTransform.filenamePattern));
        if (found) {
          item[definition.sourceTransform.filenamePatternKey] = found[1];
        }
      }
      item.path = sourceItem.path;
      item.data = definition.sourceTransform.path !== undefined ? _.get(sourceItem, definition.sourceTransform.path) : sourceItem.data;

      this.doCommonItemOperations(item, definition, sourceItem.path);

      if (item[definition.primaryKey] === undefined) {
        console.error('Primary key `' + definition.primaryKey + '` not found.', item);
        await JdxDatabase.addError(this.project, {
          message: 'Primary key `' + definition.primaryKey + '` not found in item.',
          path: sourceItem.path,
          type: definition.id,
          typeId: null,
          severity: 'error',
          data: item,
        });
        this.sendResponse({errorsUpdate: true});
        return;
      }

      items.push(item);


      if (!skipRelations) {
        relations.push(this.addRelationId({
          fromKey: definition.sourceTransform.relationsFromName ? definition.sourceTransform.relationsFromName : definition.id,
          fromType: definition.id,
          fromId: item[definition.primaryKey],
          toKey: 'source', //definition.sourceTransform.relationsToName ? definition.sourceTransform.relationsToName : definition.sourceType.id,
          toType: definition.sourceType.id,
          toId: sourceItem.path,
        }));
      }
    });

    return {items, relations};
  }

  matchTypes(types, type) {
    return types === undefined || ((_.includes(types, type) || _.includes(types, '*')) && !_.includes(types, '!' + type));
  }

  doCommonItemOperations(item, definition, filePath, localVariables) {
    if (definition.sourceTransform.filenamePattern) {
      const found = filePath.match(new RegExp(definition.sourceTransform.filenamePattern));
      if (found) {
        item[definition.sourceTransform.filenamePatternKey] = found[1];
      }
    }
    if (definition.sourceTransform.customFields) {
      this.getCustomFields(item, definition.sourceTransform.customFields, filePath);
    }

    if (item[definition.primaryKey] !== undefined) {
      item[definition.primaryKey] = item[definition.primaryKey].toString();
    }

    if (localVariables && _.size(localVariables)) {
      item.local_variables = localVariables;
    }

    if (definition.sourceTransform.removeFields) {
      definition.sourceTransform.removeFields.forEach(field => {
        _.unset(item, field);
      });
    }

    return item;
  }

  async processAdditionalRelations(result, definition) {
    if (definition.relations) {
      definition.relations.forEach(async relation => {
        result.items.forEach(async item => {
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
            let values = _.get(item, relation.path);
            if (values) {
              if (!_.isArray(values) && values._array_) {
                values = values._array_;
              }

              if (!_.isArray(values)) {
                console.error('Relation path for `' + definition.id + '` `' + item[definition.primaryKey].toString() + '` is not an array: ', item, relation.path);
                await JdxDatabase.addError(this.project, {
                  message: 'Relation path is not an array: ',
                  path: null,
                  type: definition.id,
                  typeId: item[definition.primaryKey].toString(),
                  severity: 'warning',
                  data: [item, relation.path],
                });
                this.sendResponse({errorsUpdate: true});
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

  getCustomFields(item, fields, filePath) {
    _.forOwn(fields, (fieldDef, fieldName) => {
      if (fieldDef.type === 'concat') {
        item[fieldName] = fieldDef.fields.map(x => _.get(item, x)).join(fieldDef.separator !== undefined ? fieldDef.separator : '.');
      } else if (fieldDef.type === 'get') {
        item[fieldName] = _.get(item, fieldDef.fields, fieldDef.default);
      } else if (fieldDef.type === 'splitUnderscore') {
        item[fieldName] = _.get(item, fieldDef.fields).split('_');
      } else if (fieldDef.type === 'filePath') {
        item[fieldName] = filePath;
      } else if (fieldDef.type === 'mixedConcat') {
        item[fieldName] = fieldDef.fields.map(x => (Array.isArray(x) ? _.get(item, x) : x)).join(fieldDef.separator !== undefined ? fieldDef.separator : '.');
      } else if (fieldDef.type === 'replaceAll') {
        item[fieldName] = _.replace(_.get(item, fieldDef.fields), new RegExp(fieldDef.replace, 'g'), fieldDef.with);
      } else {
        console.warn(`Unknown custom config field \`${fieldDef.type}\`.`, fieldDef);
      }

      if (fieldDef.operations && fieldDef.operations.includes('lowercase')) {
        item[fieldName] = item[fieldName].toLowerCase();
      }
    });


    return item;
  }

  validItem(item, definition) {


    return true;
  }


  hasFeature(name) {
    const definition = JdxDatabase.getDefinition(this.project.gameType);
    return definition.features && definition.features[name];
  }
}
