import JdxDatabase from '../JdxDatabase';
import _ from 'lodash';
import DbBackgroundTask from './DbBackgroundTask';
import * as URI from "uri-js";
import * as iconv from "iconv-lite/lib/index";
import CsvReaderHelper from '../CsvReaderHelper';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const minimatch = require('minimatch');
const Ajv = require('ajv');
const PatchMergeAjv = require('ajv-merge-patch');




const $schema = 'http://json-schema.org/draft-04/schema#';
const defaultOptions = {
  setMinItems: true,
  setMaxItems: false,
  setMinNumber: false,
  setMaxNumber: false,
  setRequired: true,
  detectEnum: true,
  enumMaxLength: 10,
  minEnum: 0,
  maxEnum: 4,
};

// Find the Schema type for a JavaScript object
const getSchemaType = (object) => {
  if (_.isNull(object)) {
    return 'null';
  } else if (_.isBoolean(object)) {
    return 'boolean';
  } else if (_.isNumber(object)) {
    return 'number';
  } else if (_.isString(object)) {
    return 'string';
  } else if (_.isArray(object)) {
    return 'array';
  } else if (_.isObject(object)) {
    return 'object';
  }

  return null;
};

// Regex for detecting string formats
const formatRegex = {
  uri: /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.​\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[​6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1​,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00​a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u​00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i,
  email: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
  // hostname: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/,
  ipv4: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/,
  ipv6: /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i,
  date: /^\d{4}-\d{1,2}-\d{1,2}$/
};

// SchemaTrainerProperty represents a JSON Schema object that is being trained.
// It determines it's types, formats based on the object it's been trained with.

class SchemaTrainerProperty {
  constructor(options) {
    this.options = options;
    this.schema = null;

    this.types = {};
    this.values = [];
    this.properties = {};
    this.formats = _.mapValues(formatRegex, () => true);
    this.formatsValid = false;
  }

  getProperty(key) {
    if (!this.properties[key]) {
      this.properties[key] = new SchemaTrainerProperty(this.options);
    }

    return this.properties[key];
  }

  train(object) {
    const type = getSchemaType(object);
    const {options} = this;

    this.types[type] = true;

    switch (type) {
      case 'string':
        // Loop through potential formats
        // and falsify those that aren't matches
        _.forEach(this.formats, (shouldTest, format) => {
          // Test the string value against the regex for the format
          if (shouldTest && !formatRegex[format].test(object)) {
            this.formats[format] = false;
          }
        });

        this.formatsValid = true;
        this.values = _.union(this.values, [object]);

        return;

      case 'number':
        this.values = _.union(this.values, [object]);

        if (options.setMinNumber) {
          if (_.has(this, 'minNumber')) {
            this.minNumber = Math.max(object, this.minNumber);
          } else {
            this.minNumber = object;
          }
        }

        if (options.setMaxNumber) {
          if (_.has(this, 'maxNumber')) {
            this.maxNumber = Math.min(object, this.maxNumber);
          } else {
            this.maxNumber = object;
          }
        }

        return;

      case 'object':
        _.forEach(object, (value, key) => {
          this.getProperty(key).train(value);
        });

        if (options.setRequired) {
          const required = _.keys(object);

          if (!this.requiredProperties) {
            this.requiredProperties = required;
          } else {
            this.requiredProperties = _.intersection(this.requiredProperties, required);
          }
        }

        return;

      case 'array':
        if (options.setMinItems) {
          if (_.has(this, 'minItems')) {
            this.minItems = Math.max(object.length, this.minItems);
          } else {
            this.minItems = object.length;
          }
        }

        const itemsProp = this.getProperty('items');

        _.forEach(object, (item) => itemsProp.train(item));

      default:
        break;
    }
  }

  toJS() {
    const {options} = this;

    const schema = {};
    let type = null;

    // Check if we're defined as a boolean and a number
    if (this.types.number && this.types.boolean && _.size(this.types) === 2) {
      schema.type = type = 'number';
    } else if (this.types.array && this.types.object && _.size(this.types) === 2) {
      // If something is both an array and object, assume a single object array...
      _.forOwn(this.properties, (prop, propName) => {
        if (propName !== 'items' && this.properties.items.properties[propName] === undefined) {
          this.properties.items.properties[propName] = prop;
        }
      });

      type = 'array';
    } else {
      const types = _.keys(this.types);

      if (types.length === 1) {
        schema.type = type = types[0];
      } else if (types.length > 0) {
        schema.type = types;
      }
    }

    switch (type) {
      case 'array':
        schema.items = this.getProperty('items').toJS();
        return schema;

      case 'object':
        schema.properties = {};

        _.forEach(this.properties, (schemaProp, key) => {
          schema.properties[key] = schemaProp.toJS();
        });

        // Add required properties if we have them set
        if (this.requiredProperties && this.requiredProperties.length > 0) { schema.required = this.requiredProperties; }

        return schema;

      case 'string':
        const formats = [];

        if (this.formatsValid) {
          _.forEach(this.formats, (enabled, format) => {
            if (enabled) {
              formats.push(format);
            }
          });
        }

        if (formats.length > 0) {
          schema.format = formats[0];
        } else if (this.options.detectEnum && this.values.length > this.options.minEnum && this.values.length <= this.options.maxEnum) {
          let passedTest = true;

          for (let i = 0; i < this.values.length; i++) {
            const value = this.values[i];

            if (value.length > this.options.enumMaxLength) {
              passedTest = false;
              break;
            }
          }

          if (passedTest) {
            delete schema.type;
            schema.enum = this.values;
          }
        }

        return schema;

      case 'number':
        if (options.setMinNumber) { schema.minimum = this.minNumber; }

        if (options.setMaxNumber) { schema.maximum = this.maxNumber; }

        return schema;

      default:
        return schema;
    }
  }
}

class SchemaTrainer extends SchemaTrainerProperty {
  constructor(options = {}) {
    super(_.defaults(options, defaultOptions));
  }

  toJS() {
    return _.extend({$schema}, super.toJS());
  }
}


export default class StructureScannerTask extends DbBackgroundTask {
  static getTaskType() {
    return 'StructureScannerTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);
    const definition = args.typeDefinition;

    const items = await db[definition.id].toArray();
/*
    const schemaTrainer = new SchemaTrainer();

    items.forEach(item => {
      schemaTrainer.train(item);
    });
    */
    //console.log(schemaTrainer.toJS());
    //console.log(JSON.stringify(schemaTrainer.toJS()));
    //console.log(javascriptStringify(schemaTrainer.toJS()));


    //await CsvReaderHelper.exportModifiersFromCsv();
    //return;


    const hashCode = function(string) {
      let hash = 0, i, chr;
      if (string.length === 0) return hash;
      for (i = 0; i < string.length; i++) {
        chr = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    };

    //let ajv = new Ajv({extendRefs: true});
    let ajv = new Ajv({extendRefs: true});

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
              subSchema = resolveMergeProps(subSchema.$mergeProps, subSchema, {...it, baseId: refUri, baseIdOverwritten: false});
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


    ajv.addKeyword('$makeArray', {
      type: 'object',
      compile: (schema, parentSchema, it) => {
        const subSchema = it.util.copy(schema);
        const magicId = hashCode(JSON.stringify(subSchema));
        subSchema.$id = 'http://jorodox.org/schemas/not_a_real_schema_'+ Math.floor(Math.random() * 10000000) +'.json';
        if (!it.self._makeArraySchemaCache) {
          it.self._makeArraySchemaCache = {};
        }

        const validatorPrep = () => {
          if (!it.self._makeArraySchemaCache[magicId]) {
            it.self._makeArraySchemaCache[magicId] = ajv.compile(subSchema);
            //console.log("Generating "+ magicId);
          } else {
            //console.log("Using "+ magicId);
          }

          return it.self._makeArraySchemaCache[magicId];
        };

        return function v(data, dataPath, object, key) {
          //return false;
          // skip if value only
          //if (!object || key === undefined) {
          //  return true;
          //}

          const outArray = [];
          let firstObj = null;
          _.forOwn(data, (subItem, subItemKey) => {
            if (_.isArray(subItem)) {
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

          //object[key] = outArray;
          const result = validatorPrep()(outArray);
          v.errors = validatorPrep().errors;
          return result;
        };
      }
    });

    console.log("Get keys", new Date());
    const identifierCache = await JdxDatabase.getAllIdentifiers(args.project);
    console.log("All keys got", new Date());

    const hasIdentifier = (identifierType, id) => {
      if (!identifierCache[identifierType]) {
        identifierCache[identifierType] = new Set();
        if (!db[identifierType]) {
          console.error(`Unknown identifier type '${identifierType}'`);
        } else {
          console.error(`Uncached identifier type '${identifierType}'`);
        }
      }

      return identifierCache[identifierType].has(id);
    };

    ajv.addKeyword('$identifierProperties', {
      type: 'object',

      compile: function (schema, parentSchema, it) {
        const values = _.keys(parentSchema.properties);
        if (schema.postFix) {
          values.map((x) => x + schema.postFix);
        }
        const propertyNames = new Set(values);
        //const propertyNamesHash = propertyNames.
        const validators = {};
        const validatorPrep = {};

        _.forOwn(schema, (identifierSchema, identifierType) => {
          const magicId = hashCode(JSON.stringify(identifierSchema));
          identifierSchema.$id = 'http://jorodox.org/schemas/not_a_real_schema_'+ identifierType + "-"+ Math.floor(Math.random() * 10000000) +'.json';

          if (!it.self._identifierPropertiesCache) {
            it.self._identifierPropertiesCache = {};
          }

          validatorPrep[identifierType] = () => {
            if (!it.self._identifierPropertiesCache[magicId]) {
              it.self._identifierPropertiesCache[magicId] = ajv.compile(identifierSchema);
              console.log("Generating "+ identifierType);
            } else {
              console.log("Using "+ identifierType);
            }

            return it.self._identifierPropertiesCache[magicId];
          };
        });

        return function v(data, dataPath, object, key) {
          for (const dataKey of _.keys(data)) {
            // We don't want to match identifiers if this is already matched (optimalization/order preference)
            if (propertyNames.has(dataKey)) {
              continue;
            }

            for (const identifierType of _.keys(validatorPrep)) {
              if (hasIdentifier(identifierType, dataKey)) {
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


    JdxDatabase.getDefinition(args.project.gameType).schemas.forEach(schema => ajv.addSchema(schema));

    console.log("Loading "+ definition.id + " validator");
    const validater = ajv.getSchema('http://jorodox.org/schemas/'+ definition.id +'.json');
    console.log("Validator loaded");


    console.log("Validating "+ definition.id);

    items.forEach(item => {
      const valid = validater(item);
      if (!valid) {
        console.log(item.name, validater.errors[0]);
      }
    });

    console.log("Done validating "+ definition.id);

    return true;
  }
}
