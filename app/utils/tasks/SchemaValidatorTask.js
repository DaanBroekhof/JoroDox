import _ from 'lodash';
import * as URI from 'uri-js';
import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const Ajv = require('ajv');
const syspath = require('electron').remote.require('path');

/* eslint-disable no-param-reassign, no-continue */


export default class SchemaValidatorTask extends DbBackgroundTask {
  static getTaskType() {
    return 'SchemaValidatorTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = args.typeDefinition;

    let ajv = SchemaValidatorTask.cachedAjv;

    if (!args.useCachedValidator || !ajv) {
      this.progress(0, 1, 'Reloading definitions...');
      JdxDatabase.loadDefinitions();

      ajv = new Ajv({
        extendRefs: true,
        allErrors: true,
        // jsonPointers: true,
        // inlineRefs: false,
        // verbose: true,
      });

      ajv = this.addMergePropsKeyword(ajv);
      ajv = this.addMatchPropsKeyword(ajv);
      ajv = this.addAllowMultipleKeyword(ajv);
      ajv = this.addIdentifierPropertiesKeyword(ajv);
      ajv = this.addIdentifierValueKeyword(ajv);
      // ajv = this.addScopeReferenceKeywords(ajv);


      this.progress(0, 1, 'Loading identifier cache...');
      await this.buildIdentifierCache(args.project);
      this.progress(1, 1, 'Loading identifier cache...');

      this.progress(0, 1, 'Loading validator...');

      JdxDatabase.getDefinition(args.project.gameType).schemas.forEach(schema => ajv.addSchema(schema));

      SchemaValidatorTask.cachedAjv = ajv;
    }

    const validator = ajv.getSchema('http://jorodox.org/schemas/' + definition.id + '.json');

    if (!validator) {
      throw new Error('No validator defined.');
    }

    //this.progress(0, 1, 'Loading validator...');

    let items = [];
    let itemCount = 0;

    this.progress(0, 1, 'Loading data...');

    if (args.typeId) {
      items = await db[definition.id].where({[definition.primaryKey]: args.typeId});
      itemCount = 1;
      await db.jdx_errors.where({type: definition.id, typeId: args.typeId}).delete();
    } else if (args.typeIds) {
      items = await db[definition.id].where(definition.primaryKey).anyOf(args.typeIds);
      itemCount = items.count();
      await db.jdx_errors.where({type: definition.id}).filter(x => args.typeIds.includes(x.typeId)).delete();
    } else {
      items = await db[definition.id];
      itemCount = (await JdxDatabase.getTypeIdentifiers(args.project, definition.id)).size;
      await db.jdx_errors.where({type: definition.id}).delete();
    }
    this.sendResponse({errorsUpdate: true});


    let nr = 0;

    const errors = [];

    let invalidCount = 0;
    await items.each((item) => {
      if (nr % Math.floor(itemCount / this.progressReportRate) === 0) {
        this.progress(nr, itemCount, `Validating ${itemCount} items...`);
      }

      ajv.jdxItem = item;
      const valid = validator(item);

      const validErrors = [];

      if (!valid) {
        const errorDataPaths = [];
        const isAnyOf = validator.errors.some((x) => x.keyword === 'anyOf');
        validator.errors.forEach((error) => {
          if (error.keyword && error.keyword.includes('$mergeProps')) {
            return;
          }

          // Sub-errors in same data path are not redundant errors
          if (error.dataPath) {
            for (const errorDataPath of errorDataPaths) {
              if (errorDataPath !== error.dataPath && _.startsWith(errorDataPath, error.dataPath)) {
                return;
              }
            }
            errorDataPaths.push(error.dataPath);
          }

          validErrors.push(error);

          invalidCount += 1;
          // Fix stupid messages
          if (error && error.message === 'should NOT have additional properties') {
            error.message = 'Unexpected additional property found: ' + error.params.additionalProperty;
          }
          if (error && error.message === 'should be equal to one of the allowed values') {
            error.message = 'Should be equal to one of: \'' + error.params.allowedValues.join("', '") + "'";
          }

          if (isAnyOf && error.keyword !== 'anyOf') {
            error.message = '[Any of] ' + error.message;
          }

          errors.push({
            message: error.message,
            path: null,
            type: definition.id,
            typeId: item[definition.primaryKey],
            severity: 'error',
            data: error,
          });
        });

        if (validErrors.length === 0) {
          console.error('Zero valid errors while invalid:', validator.errors);
        }
      }
      nr += 1;
    });

    if (errors.length > 0) {
      await JdxDatabase.addErrors(args.project, errors, this);
      this.sendResponse({errorsUpdate: true});
    }

    this.progress(items.length, items.length, `Validated ${itemCount} items...`);

    return true;
  }


  static hashCode(string) {
    let hash = 0;
    let i;
    let chr;

    /* eslint-disable no-bitwise */
    if (string.length === 0) return hash;
    for (i = 0; i < string.length; i += 1) {
      chr = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    /* eslint-enable no-bitwise */
    return hash;
  }

  addMergePropsKeyword(ajv) {
    const resolveMergeProps = (schema, parentSchema, it) => {
      const mergedSchema = {
        $matchProps: {
          propertySets: {},
          $identifierProperties: {},
        }
      };

      schema.forEach(subSchema => {
        let setId = 'random_' + Math.floor(Math.random() * 10000000);
        if (subSchema.$ref) {
          const resolvedUri = URI.resolve(it.baseId, subSchema.$ref);

          setId = resolvedUri;

          // Local reference
          if (_.startsWith(resolvedUri, it.root.schema.$id) && !it.baseIdOverwritten) {
            const ref = subSchema.$ref;
            subSchema = _.get(it.root.schema, resolvedUri.slice(it.baseId.length + 1).split('/'));
            if (!subSchema) {
              throw new ajv.constructor.MissingRefError(it.baseId, ref);
            }
          } else {
            const resolvedRef = ajv.getSchema(resolvedUri);
            if (!resolvedRef || !resolvedRef.schema) {
              throw new ajv.constructor.MissingRefError(it.baseId, subSchema.$ref);
            }
            subSchema = resolvedRef.schema;

            if (subSchema.$mergeProps) {
              const refUri = resolvedUri.split('#')[0] + '#';
              subSchema = resolveMergeProps(subSchema.$mergeProps, subSchema, {
                ...it,
                baseId: refUri,
                baseIdOverwritten: false
              });
            }
          }
        }

        if (subSchema.$mergeProps) {
          subSchema = resolveMergeProps(subSchema.$mergeProps, subSchema, it);
        }

        mergedSchema.$matchProps.propertySets[setId] = {};
        if (subSchema.properties) {
          mergedSchema.$matchProps.propertySets[setId].properties = subSchema.properties;
        }
        if (subSchema.patternProperties) {
          mergedSchema.$matchProps.propertySets[setId].patternProperties = subSchema.patternProperties;
        }
        if (subSchema.$identifierProperties) {
          mergedSchema.$matchProps.$identifierProperties[setId] = subSchema.$identifierProperties;
        }

        if (subSchema.$matchProps) {
          _.assign(mergedSchema.$matchProps.propertySets, subSchema.$matchProps.propertySets);
          _.assign(mergedSchema.$matchProps.$identifierProperties, subSchema.$matchProps.$identifierProperties);
        }
      });

      return mergedSchema;
    };
    ajv.addKeyword('$mergeProps', {
      macro: resolveMergeProps,
    });

    return ajv;
  }

  addAllowMultipleKeyword(ajv) {
    ajv.addKeyword('$allowMultiple', {
      type: ['object', 'array'],
      compile: (schema, parentSchema, it) => {
        const subSchema = it.util.copy(schema);
        let magicId = null;
        if (_.get(schema, 'items.$identifierProperties')) {
          // This is a shortcut for the most often occuring comparison...
          magicId = SchemaValidatorTask.hashCode(JSON.stringify(
            _.keys(schema.items.$identifierProperties)
              .concat(_.keys(schema.items.patternProperties))
              .concat(_.keys(schema.items.properties))
          ));
        } else {
          magicId = SchemaValidatorTask.hashCode(JSON.stringify(subSchema));
        }
        subSchema.$id = 'http://jorodox.org/schemas/not_a_real_schema_' + Math.floor(Math.random() * 10000000) + '.json';
        if (!ajv.allowMultipleSchemaCache) {
          ajv.allowMultipleSchemaCache = {};
        }
        if (ajv.allowMultipleSchemaCache[magicId] === undefined) {
          ajv.allowMultipleSchemaCache[magicId] = false;
        }


        const validatorPrep = () => {
          if (!ajv.allowMultipleSchemaCache[magicId]) {
            ajv.allowMultipleSchemaCache[magicId] = ajv.compile(subSchema);
            //console.log('Generating $allowMultiple ' + magicId, it.baseId, subSchema);
          } else {
            // console.log('Using '+ magicId);
          }

          return ajv.allowMultipleSchemaCache[magicId];
        };

        return function v(data, dataPath, object, key) {
          if (_.isArray(data) && data.multipleKeys) {
            let isValid = true;
            for (let i = 0; i < data.length; i += 1) {
              const result = validatorPrep()(data[i]);
              let valErrors = validatorPrep().errors;
              if (valErrors) {
                valErrors = valErrors.map(err => {
                  err.dataPath = dataPath + '.' + i + err.dataPath;

                  return err;
                });
                if (!v.errors) {
                  v.errors = [];
                }
                v.errors = v.errors.concat(valErrors);
              }
              if (!result) {
                isValid = false;
              }
            }
            return isValid;
          } else {
            const result = validatorPrep()(data);
            v.errors = validatorPrep().errors;
            if (v.errors) {
              v.errors = v.errors.map(err => {
                err.dataPath = dataPath + err.dataPath;

                return err;
              });
            }
            return result;
          }
        };
      }
    });

    return ajv;
  }

  addMatchPropsKeyword(ajv) {
    ajv.addKeyword('$matchProps', {
      type: 'object',
      compile: (schema, parentSchema, it) => {
        if (!ajv.matchPropsSchemaCache) {
          ajv.matchPropsSchemaCache = {};
          ajv.matchPropsSchemaCacheDyn = {};
        }

        const validatorRefs = _.keys(schema.propertySets);
        let dynamicValidatorRefs = _.keys(schema.$identifierProperties);

        const compileValidatorByRef = (ref) => {
          if (!ajv.matchPropsSchemaCache[ref]) {
            schema.propertySets[ref].$id = 'http://jorodox.org/schemas/not_a_real_schema_' + Math.floor(Math.random() * 10000000) + '.json';
            schema.propertySets[ref].type = 'object';
            schema.propertySets[ref].additionalProperties = false;
            ajv.matchPropsSchemaCache[ref] = ajv.compile(schema.propertySets[ref]);
          }

          return ajv.matchPropsSchemaCache[ref];
        };
        const compileDynamicValidator = (ref) => {
          if (!ajv.matchPropsSchemaCacheDyn[ref]) {
            const dynSchema = {
              $id: 'http://jorodox.org/schemas/not_a_real_schema_' + Math.floor(Math.random() * 10000000) + '.json',
              $identifierProperties: schema.$identifierProperties[ref]
            };
            ajv.matchPropsSchemaCacheDyn[ref] = ajv.compile(dynSchema);
          }

          return ajv.matchPropsSchemaCacheDyn[ref];
        };

        return function v(data, dataPath, object, key) {
          let isAllValid = true;
          const myErrors = [];
          _.forOwn(data, (subItem, subItemKey) => {
            let items = null;
            let singleItem = true;
            if (_.isArray(subItem) && subItem.multipleKeys) {
              singleItem = false
              items = subItem;
            } else {
              items = [subItem];
            }

            let itemNr = 0;
            items.forEach((itemValue) => {
              let isValid = validatorRefs.some(validatorRef => {
                const val = compileValidatorByRef(validatorRef);
                const subValid = val({[subItemKey]: itemValue});

                if (!subValid && val.errors && val.errors[0].keyword !== 'additionalProperties') {
                  val.errors[0].dataPath = dataPath + (!singleItem ? val.errors[0].dataPath.replace(subItemKey + '.', subItemKey + '.' + itemNr + '.') : val.errors[0].dataPath);
                  myErrors.push(val.errors[0]);
                  isAllValid = false;
                }

                return subValid;
              });

              if (!isValid && isAllValid) {
                isValid = dynamicValidatorRefs.some(dynamicValidatorRef => {
                  const dynVal = compileDynamicValidator(dynamicValidatorRef);
                  const dynValid = dynVal({[subItemKey]: itemValue});

                  if (!dynValid && dynVal.errors && dynVal.errors[0].keyword !== '$identifierProperties') {
                    dynVal.errors[0].dataPath = dataPath + (!singleItem ? dynVal.errors[0].dataPath.replace(subItemKey + '.', subItemKey + '.' + itemNr + '.') : dynVal.errors[0].dataPath);
                    myErrors.push(dynVal.errors[0]);
                    isAllValid = false;
                  }

                  return dynValid;
                });

                if (!isValid) {
                  myErrors.push({
                    keyword: '$matchProps',
                    category: 'unknown_property',
                    dataPath,
                    message: 'Unknown property `' + subItemKey + '`.',
                    data,
                    params: {
                      itemValue
                    }
                  });
                  isAllValid = false;
                }
              }
              itemNr += 1;
            });
          });

          if (!isAllValid) {
            v.errors = myErrors;
          }

          return isAllValid;
        };
      }
    });

    return ajv;
  }

  addIdentifierPropertiesKeyword(ajv) {
    const task = this;
    ajv.addKeyword('$identifierProperties', {
      type: 'object',

      compile: (schema, parentSchema, it) => {
        const validators = {};
        const validatorPrep = {};

        _.forOwn(schema, (identifierSchema, identifierType) => {
          const magicId = SchemaValidatorTask.hashCode(JSON.stringify(identifierSchema));
          identifierSchema.$id = 'http://jorodox.org/schemas/not_a_real_schema_' + identifierType + '-' + Math.floor(Math.random() * 10000000) + '.json';

          if (!ajv.identifierPropertiesCache) {
            ajv.identifierPropertiesCache = {};
          }

          validatorPrep[identifierType] = () => {
            if (!ajv.identifierPropertiesCache[magicId]) {
              //console.log('Generating $identifierProperties ' + identifierType, identifierSchema);
              ajv.identifierPropertiesCache[magicId] = ajv.compile(identifierSchema);
            } else {
              //console.log('Using ' + identifierType);
            }

            return ajv.identifierPropertiesCache[magicId];
          };
        });

        return function v(data, dataPath, object, key) {
          for (const dataKey of _.keys(data)) {
            for (const identifierType of _.keys(validatorPrep)) {
              let identifierValue = dataKey;
              if (schema[identifierType].postfix) {
                if (!_.endsWith(identifierValue, schema[identifierType].postfix)) {
                  continue;
                }
                identifierValue = identifierValue.substring(0, identifierValue.length - (schema[identifierType].postfix.length));
              }

              // Switch magic
              if (identifierType === '<switch_value>') {
                if (!ajv.jdxLastScopeKeyValidator) {
                  return false;
                }
                if (!ajv.jdxScopeKeyValidators[schema['<switch_value>'].$switchScope + '/' + ajv.jdxLastScopeKeyValidator]) {
                  return false;
                }
                const switchValueValidator = ajv.jdxScopeKeyValidators[schema['<switch_value>'].$switchScope + '/' + ajv.jdxLastScopeKeyValidator];

                const validSwitchValue = switchValueValidator({[ajv.jdxLastScopeKeyValidator]: identifierValue});
                if (!validSwitchValue) {
                  v.errors = switchValueValidator.errors;
                  v.errors[0].dataPath = dataKey + v.errors[0].dataPath;
                  v.errors[0].identifierType = identifierType;
                  v.errors[0].identifier = dataKey;
                  v.errors[0].parentDataPath = dataPath;
                }
                return validSwitchValue;
              }

              // Match scope keys dynamically
              const scopeKeyMatch = identifierType.match(/^<scope_key:(.+)>$/);
              let keyValid = false;
              if (scopeKeyMatch) {
                const scopeKeyRef = scopeKeyMatch[1];
                if (!ajv.jdxScopeKeyValidators[scopeKeyRef]) {
                  ajv.jdxScopeKeyValidators[scopeKeyRef] = ajv.compile({
                    $id: 'http://jorodox.org/schemas/not_a_real_schema-' + Math.floor(Math.random() * 10000000) + '.json',
                    $ref: scopeKeyRef,
                  });
                }
                if (key === 'on_trigger') {
                  ajv.jdxLastScopeKeyValidator = data;
                }
                const keyValidator = ajv.jdxScopeKeyValidators[scopeKeyRef];

                keyValidator({[identifierValue]: null});

                // We only look for invalid property key errors, any other error is ok for us.
                const unknownScopeKey = keyValidator.errors && keyValidator.errors[0] && _.startsWith(keyValidator.errors[0].message, 'Unknown property');

                keyValid = !unknownScopeKey;
              } else {
                keyValid = task.hasIdentifier(identifierType, identifierValue);
              }


              if (keyValid) {
                // Do schema validation if key is matched

                if (!validators[identifierType]) {
                  validators[identifierType] = validatorPrep[identifierType]();
                }

                const result = validators[identifierType](data[dataKey]);
                if (!result) {
                  v.errors = validators[identifierType].errors;
                  v.errors[0].dataPath = dataKey + v.errors[0].dataPath;

                  v.errors[0].identifierType = identifierType;
                  v.errors[0].identifier = dataKey;
                  v.errors[0].parentDataPath = dataPath;
                  return result;
                }
                return true;
              }
            }

            v.errors = [{
              keyword: '$identifierProperties',
              category: 'unknown_property',
              dataPath,
              message: 'Unknown property `' + dataKey + '`.',
              data,
              params: {
                key
              }
            }];

            return false;
          }
          return true;
        };
      }
    });
    return ajv;
  }

  addIdentifierValueKeyword(ajv) {
    const task = this;

    ajv.jdxScopeKeyValidators = {};

    ajv.addKeyword('$identifierValue', {
      compile: (schema, parentSchema, it) => {
        let identifierSchemas = [];

        if (_.isString(schema)) {
          identifierSchemas.push({
            type: schema
          });
        } else if (Array.isArray(schema)) {
          identifierSchemas = schema;
        } else if (_.isObject(schema)) {
          identifierSchemas.push(schema);
        }

        return function v(data, dataPath, object, key) {
          let isValid = true;
          for (const identifierSchema of identifierSchemas) {
            // Only validate if requirements are met
            if (identifierSchema.require) {
              const requirements = Array.isArray(identifierSchema.require) ? identifierSchema.require : [identifierSchema.require];
              const requirementsMet = requirements.every((req) => {
                let reqValue = req.data !== undefined ? _.get(object, req.data) : data;
                if (req.rootData !== undefined) {
                  reqValue = _.get(ajv.jdxItem, req.rootData);
                }
                if (req.value !== undefined) {
                  switch (req.operator) {
                    default:
                      if (req.operator !== undefined) {
                        throw new Error("Unknown operator `" + req.operator + "`");
                      }
                      return req.value === reqValue;
                    case '==':
                      return req.value === reqValue;
                    case '!=':
                      return req.value !== reqValue;
                    case 'regexp':
                      return reqValue.toString().match(req.value);
                    case 'in':
                      return req.value.includes(reqValue);
                    case '!in':
                      return !req.value.includes(reqValue);
                    case 'is_empty':
                      return !_.size(reqValue) === req.value;
                    case '!regexp':
                      return !reqValue.toString().match(req.value);
                  }
                }
                //  Boolean eval
                return !!reqValue;
              });

              if (!requirementsMet) {
                continue;
              }
            }

            let identifier = identifierSchema.usePropertyKey ? key : data;
            const unchangedIdentifier = identifier;

            // Add prefixes/postfixes/other identifier value manipulation
            if (identifierSchema.toUpperCase) {
              identifier = identifier.toUpperCase();
            }
            if (identifierSchema.replacementIdentifier) {
              identifier = identifierSchema.replacementIdentifier;
            }

            if (identifierSchema.prefix) {
              identifier = identifierSchema.prefix + identifier;
            }
            if (identifierSchema.postfix) {
              identifier = identifier + identifierSchema.postfix;
            }
            if (identifierSchema.prefixFileDir) {
              const dir = _.get(ajv.jdxItem, identifierSchema.prefixFileDir);
              identifier = syspath.dirname(dir ? dir : '') + '/' + identifier;
            }
            if (Array.isArray(identifierSchema.replaceAll)) {
              identifierSchema.replaceAll.forEach((replace) => {
                identifier = _.replace(identifier, new RegExp(replace.match, 'g'), replace.replace);
              });
            }


            const scopeKeyMatch = identifierSchema.type.match(/^<scope_key:(.+)>$/);
            if (scopeKeyMatch) {
              const scopeKeyRef = scopeKeyMatch[1];
              if (!ajv.jdxScopeKeyValidators[scopeKeyRef]) {
                ajv.jdxScopeKeyValidators[scopeKeyRef] = ajv.compile({
                  $id: 'http://jorodox.org/schemas/not_a_real_schema-' + Math.floor(Math.random() * 10000000) + '.json',
                  $ref: scopeKeyRef,
                });
              }
              if (key === 'on_trigger') {
                ajv.jdxLastScopeKeyValidator = identifier;
              }
              const keyValidator = ajv.jdxScopeKeyValidators[scopeKeyRef];


              const valid = keyValidator({[identifier]: null});

              // We only look for invalid property key errors, any other error is ok for us.
              const unknownScopeKey = keyValidator.errors && keyValidator.errors[0] && _.startsWith(keyValidator.errors[0].message, 'Unknown property');
              if (!unknownScopeKey) {
                ajv.jdxScopeKeyValidators[scopeKeyRef + '/' + identifier] = keyValidator;
                continue;
              }
            } else if (task.hasIdentifier(identifierSchema.type, identifier)) {
              continue;
            }

            isValid = false;

            if (!v.errors) {
              v.errors = [];
            }

            v.errors.push({
              keyword: '$identifierValue',
              category: identifierSchema.type === 'localisation' ? 'localisation_not_found' : 'identifier_not_found',
              dataPath,
              message: 'Property value `' + unchangedIdentifier + '`' + (unchangedIdentifier !== identifier ? ' (`' + identifier + '`)' : '') + ' is not a known identifier of `' + identifierSchema.type + '`.',
              data,
              identifierType: identifierSchema.type,
              key,
              params: {
                data
              }
            });
          }

          return isValid;
        };
      }
    });

    return ajv;
  }

  addScopeReferenceKeywords(ajv) {
    ajv._scopes = {};
    ajv.addKeyword('$localised', {
      compile: (schema, parentSchema, it) => {

        const itAtComp = it.util.copy(it);
        itAtComp.bla = it.util.copy(it.dataPathArr)

        return function v(data, dataPath, object, key, rootData) {
          ajv._scopes[dataPath] = schema;
          console.log(schema, dataPath, it, parentSchema, itAtComp);

          return true;
        };
      }
    });

    return ajv;
  }

  async buildIdentifierCache(project) {
    if (!this.identifierCache) {
      this.identifierCache = await JdxDatabase.getAllIdentifiers(project);
    }
  }

  hasIdentifier(identifierType, id) {
    if (!this.identifierCache[identifierType]) {
      /*this.identifierCache[identifierType] = (
        async () => {
          return await JdxDatabase.getTypeIdentifiers(identifierType);
        }
      )();
      */

        //await JdxDatabase.getTypeIdentifiers(identifierType);
      console.error(`Uncached identifier type '${identifierType}'`);

      throw new Error(`Uncached identifier type '${identifierType}'`);
    }

    return this.identifierCache[identifierType].has(id.toString());
  }

}
