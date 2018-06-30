import _ from 'lodash';
import * as URI from 'uri-js';
import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const Ajv = require('ajv');

/* eslint-disable no-param-reassign, no-continue */


export default class SchemaValidatorTask extends DbBackgroundTask {
  static getTaskType() {
    return 'SchemaValidatorTask';
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
        $makeArray: {
          type: 'array',
          items: {
            properties: {},
            patternProperties: {},
            $identifierProperties: {},
          }
        }
      };

      schema.forEach(subSchema => {
        if (subSchema.$ref) {
          const resolvedUri = URI.resolve(it.baseId, subSchema.$ref);

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

        if (subSchema.properties) {
          _.forOwn(subSchema.properties, (val, prop) => {
            if (!mergedSchema.$makeArray.items.properties[prop]) {
              mergedSchema.$makeArray.items.properties[prop] = val;
            }
          });
        }
        if (subSchema.$makeArray && subSchema.$makeArray.items.properties) {
          _.forOwn(subSchema.$makeArray.items.properties, (val, prop) => {
            if (!mergedSchema.$makeArray.items.properties[prop]) {
              mergedSchema.$makeArray.items.properties[prop] = val;
            }
          });
        }
        if (subSchema.patternProperties) {
          _.forOwn(subSchema.patternProperties, (val, prop) => {
            if (!mergedSchema.$makeArray.items.patternProperties[prop]) {
              mergedSchema.$makeArray.items.patternProperties[prop] = val;
            }
          });
        }
        if (subSchema.$makeArray && subSchema.$makeArray.items.patternProperties) {
          _.forOwn(subSchema.$makeArray.items.patternProperties, (val, prop) => {
            if (!mergedSchema.$makeArray.items.patternProperties[prop]) {
              mergedSchema.$makeArray.items.patternProperties[prop] = val;
            }
          });
        }
        if (subSchema.$identifierProperties) {
          _.forOwn(subSchema.$identifierProperties, (val, prop) => {
            if (!mergedSchema.$makeArray.items.$identifierProperties[prop]) {
              mergedSchema.$makeArray.items.$identifierProperties[prop] = val;
            }
          });
        }
        if (subSchema.$makeArray && subSchema.$makeArray.items.$identifierProperties) {
          _.forOwn(subSchema.$makeArray.items.$identifierProperties, (val, prop) => {
            if (!mergedSchema.$makeArray.items.$identifierProperties[prop]) {
              mergedSchema.$makeArray.items.$identifierProperties[prop] = val;
            }
          });
        }
      });

      return mergedSchema;
    };
    ajv.addKeyword('$mergeProps', {
      macro: resolveMergeProps,
    });

    return ajv;
  }

  addMakeArrayKeyword(ajv) {
    ajv.addKeyword('$makeArray', {
      type: 'object',
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
        if (!ajv.makeArraySchemaCache) {
          ajv.makeArraySchemaCache = {};
        }
        if (ajv.makeArraySchemaCache[magicId] === undefined) {
          ajv.makeArraySchemaCache[magicId] = false;
        }


        const validatorPrep = () => {
          if (!ajv.makeArraySchemaCache[magicId]) {
            ajv.makeArraySchemaCache[magicId] = ajv.compile(subSchema);
            // console.log('Generating ' + magicId, it.baseId, subSchema);
          } else {
            // console.log('Using '+ magicId);
          }

          return ajv.makeArraySchemaCache[magicId];
        };

        return function v(data, dataPath, object, key) {
          const outArray = [];
          let firstObj = null;
          _.forOwn(data, (subItem, subItemKey) => {
            if (_.isArray(subItem) && subItem.multipleKeys) {
              subItem.forEach(item => {
                outArray.push({[subItemKey]: item});
              });
            } else {
              if (!firstObj) {
                firstObj = {};
              }
              firstObj[subItemKey] = subItem;
            }
          });
          if (firstObj) {
            outArray.unshift(firstObj);
          }

          // TODO: make error-path tie up with subSchema validator path
          const result = validatorPrep()(outArray);
          v.errors = validatorPrep().errors;
          if (v.errors) {
            v.errors = v.errors.map(err => {
              err.dataPath = dataPath + '.' + err.dataPath;

              return err;
            });
          }

          return result;
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
        const propertyNames = new Set(_.keys(parentSchema.properties));
        const propertyPatterns = _.keys(parentSchema.patternProperties);
        // const propertyNamesHash = propertyNames.
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
              ajv.identifierPropertiesCache[magicId] = ajv.compile(identifierSchema);
              //console.log('Generating ' + identifierType, identifierSchema);
            } else {
              //console.log('Using ' + identifierType);
            }

            return ajv.identifierPropertiesCache[magicId];
          };
        });

        return function v(data, dataPath, object, key) {
          for (const dataKey of _.keys(data)) {
            // We don't want to match identifiers if this is already matched (optimalization/order preference)
            if (propertyNames.has(dataKey)) {
              continue;
            }
            if (propertyPatterns.find(pattern => dataKey.match(pattern))) {
              continue;
            }

            for (const identifierType of _.keys(validatorPrep)) {
              let identifierValue = dataKey;
              if (schema.postFix) {
                if (!_.endsWith(identifierValue, schema.postFix)) {
                  continue;
                }
                identifierValue = identifierValue.substring(-schema.postFix.length);
              }

              if (identifierType === '<switch_value>') {
                if (!data.on_trigger) {
                  return false;
                }
                if (!ajv.jdxScopeKeyValidators[schema['<switch_value>'].$switchScope + '/' + data.on_trigger]) {
                  return false;
                }
                const switchValueValidator = ajv.jdxScopeKeyValidators[schema['<switch_value>'].$switchScope + '/' + data.on_trigger];

                const validSwitchValue = switchValueValidator({[data.on_trigger]: identifierValue});
                if (!validSwitchValue) {
                  v.errors = switchValueValidator.errors;
                  v.errors[0].identifierType = identifierType;
                  v.errors[0].identifier = dataKey;
                  v.errors[0].parentDataPath = dataPath;
                }
                return validSwitchValue;
              }

              if (task.hasIdentifier(identifierType, identifierValue)) {
                if (!validators[identifierType]) {
                  validators[identifierType] = validatorPrep[identifierType]();
                }

                const result = validators[identifierType](data[dataKey]);
                if (!result) {
                  v.errors = validators[identifierType].errors;
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
              dataPath,
              message: 'Unknown property key `' + dataKey + '`.',
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
        const identifierType = schema;

        return function v(data, dataPath, object, key) {
          const scopeKeyMatch = identifierType.match(/^<scope_key:(.+)>$/);
          if (scopeKeyMatch) {
            const scopeKeyRef = scopeKeyMatch[1];
            if (!ajv.jdxScopeKeyValidators[scopeKeyRef]) {
              ajv.jdxScopeKeyValidators[scopeKeyRef] = ajv.compile({
                $id: 'http://jorodox.org/schemas/not_a_real_schema-' + Math.floor(Math.random() * 10000000) + '.json',
                $ref: scopeKeyRef,
              });
            }
            const keyValidator = ajv.jdxScopeKeyValidators[scopeKeyRef];


            keyValidator({[data]: null});

            // We only look for invalid property key errors, any other error is ok for us.
            const unknownScopeKey = keyValidator.errors && keyValidator.errors[0] && _.startsWith(keyValidator.errors[0].message, 'Unknown property key');
            if (!unknownScopeKey) {
              ajv.jdxScopeKeyValidators[scopeKeyRef + '/' + data] = keyValidator;
              return true;
            }
          } else if (task.hasIdentifier(identifierType, data)) {
            return true;
          }

          v.errors = [{
            keyword: '$identifierValue',
            dataPath,
            message: 'Property value `' + data + '` is not a known value of `' + identifierType + '`.',
            data,
            identifierType,
            key,
            params: {
              data
            }
          }];

          return false;
        };
      }
    });

    return ajv;
  }

  async buildIdentifierCache(project) {
    if (!this.identifierCache) {
      console.log('Get keys', new Date());
      this.identifierCache = await JdxDatabase.getAllIdentifiers(project);
      console.log('All keys got', new Date());
    }
  }

  hasIdentifier(identifierType, id) {
    if (!this.identifierCache[identifierType]) {
      this.identifierCache[identifierType] = new Set();
      console.error(`Uncached identifier type '${identifierType}'`);
    }

    return this.identifierCache[identifierType].has(id.toString());
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = args.typeDefinition;

    let ajv = new Ajv({extendRefs: true});

    ajv = this.addMergePropsKeyword(ajv);
    ajv = this.addMakeArrayKeyword(ajv);
    ajv = this.addIdentifierPropertiesKeyword(ajv);
    ajv = this.addIdentifierValueKeyword(ajv);

    this.progress(0, 1, 'Loading identifier cache...');
    await this.buildIdentifierCache(args.project);
    this.progress(1, 1, 'Loading identifier cache...');

    this.progress(0, 1, 'Loading validator...');

    console.log('Loading ' + definition.id + ' validator');
    JdxDatabase.getDefinition(args.project.gameType).schemas.forEach(schema => ajv.addSchema(schema));
    const validator = ajv.getSchema('http://jorodox.org/schemas/' + definition.id + '.json');
    console.log('Validator loaded');
    this.progress(1, 1, 'Loading validator...');

    console.log('Validating ' + definition.id);

    const items = await db[definition.id].limit(50000).toArray();
    let nr = 0;
    const allTime = Date.now();

    const errorPromises = [];

    let invalidCount = 0;
    for (const item of items) {
      this.progress(nr, items.length, `Validating ${items.length} items...`);
      const valid = validator(item);

      if (!valid) {
        invalidCount += 1;
        // Fix stupid message
        if (validator.errors[0] && validator.errors[0].message === 'should NOT have additional properties') {
          validator.errors[0].message = 'Unexpected additional property found: ' + validator.errors[0].params.additionalProperty;
        }

        console.log(item[definition.primaryKey], item.comments, validator.errors[0]);

        errorPromises.push(JdxDatabase.addError(args.project, {
          message: validator.errors[0].message,
          path: null,
          type: definition.id,
          typeId: item[definition.primaryKey],
          severity: 'error',
          data: validator.errors[0],
        }));
      }
      nr += 1;
    }

    console.log('Done validating ' + definition.id);
    this.progress(items.length, items.length, `Validated ${items.length} items...`);
    console.log('Validate cos ALL: ' + (Date.now() - allTime) + ' - avg ' + ((Date.now() - allTime) / items.length));
    console.log('Invalid ' + invalidCount);

    await Promise.all(errorPromises);
    if (errorPromises.length > 0) {
      this.sendResponse({errorsUpdate: true});
    }

    console.log('All errors added ');


    return true;
  }
}
