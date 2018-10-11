import _ from 'lodash';
import PdxScript from './PdxScript';

/**
  Crude reader of the Stellaris 'trigger_doc' command output.
*/
export default class PdxTriggerDocReader {
  static parse(inputText) {
    const lines = inputText.split(/[\n\r]+/);

    const definitions = {
      triggers: [],
      effects: [],
    };

    let definitionType = 'triggers';

    let definition = {};

    for (let lineNr = 0; lineNr < lines.length; lineNr += 1) {
      const line = lines[lineNr];

      if (_.startsWith(line, '== TRIGGER DOCUMENTATION ==')) {
        definitionType = 'triggers';
        continue;
      }
      if (_.startsWith(line, '== EFFECT DOCUMENTATION ==')) {
        definitionType = 'effects';
        continue;
      }
      if (_.startsWith(line, '[') || _.startsWith(line, '==')) {
        // Timestamps or other separators
        continue;
      }
      if (line === '') {
        definition = {}
        continue;
      }

      // Definition parsing start
      if (!definition.name) {
        const match = line.match(/^([^-]+) - (.*)/);
        if (match) {
          definition = {};
          definition.name = match[1];
          definition.description = match[2];
          definition.types = [];
          lineNr++;
        } else {
          continue;
        }
      }

      let typeDefinitions = '';
      while (lines[lineNr] && !_.startsWith(lines[lineNr], 'Supported Scopes:')) {
        typeDefinitions += lines[lineNr] + "\n";
        lineNr++;
      }
      definition.typesRaw = typeDefinitions;

      const pdxScriptParser = new PdxScript({extendedComparisonOperators: true, supportTagPlaceholder: true});
      const parsedTypes = pdxScriptParser.readFile(typeDefinitions);
      if (pdxScriptParser.errors.length) {
        console.error(pdxScriptParser.errors);
      }
      definition.types = parsedTypes.data;

      if (_.startsWith(lines[lineNr], 'Supported Scopes: ')) {
        definition.supportedScopes = lines[lineNr].slice(18).split(' ');
        lineNr++;
      }
      if (_.startsWith(lines[lineNr], 'Supported Targets: ')) {
        definition.supportedTargets = lines[lineNr].slice(19).split(' ');
        definitions[definitionType].push(definition);
        definition = {};
      }
    }

    return definitions;
  }

  static convertToDefinition(definitions) {
    const result = {
      triggers: {},
      effects: {},
    };

    ['triggers', 'effects'].forEach(type => {
      definitions[type].forEach(def => {
        const convertedDefinition = {
          description: def.description,
          type: 'string',
          example: def.typesRaw,
        };

        if (def.typesRaw !== '' && def.types[def.name] === undefined) {
          convertedDefinition.todo = 'Bad definition';
          console.error('Bad definition ' + type + ' ' + def.name);
          console.error(def);
        } else if (def.typesRaw === '') {
          // Empty example
          convertedDefinition.todo = 'No definition';
        } else if (_.isArray(def.types[def.name])) {
          if (!def.types[def.name].length) {
            // Emptry definition

          } else if (!def.types[def.name][0]) {
            console.error('Multi definition ' + def.name);
            //console.error(trigger);
            return;
          } else if (def.types[def.name][0] === '<effects>') {

          } else if (def.types[def.name][0] === '<triggers>') {

          }
        } else if (_.isString(def.types[def.name]) && def.types[def.name] === 'yes') {
          convertedDefinition.$ref = 'special_values.json#/definitions/boolean"';
          delete convertedDefinition.type;
        } else if (_.isString(def.types[def.name])) {
          convertedDefinition.type = 'string';
        } else if (_.isNumber(def.types[def.name])) {
          convertedDefinition.type = 'number';
        } else if (_.isObject(def.types[def.name]) && def.types[def.name].operator) {
          convertedDefinition.type = 'number';
        } else if (_.isObject(def.types[def.name])) {
          convertedDefinition.type = 'object';
          convertedDefinition.definition = def.types[def.name];
        } else {
          convertedDefinition.todo = 'Could not figure out'
//          console.error('Weird trigger ' + def.name);
 //         console.error(trigger);
        }


        def.supportedScopes.forEach(scope => {
          if (!result[type][scope]) {
            result[type][scope] = {};
          }

          if (result[type][scope][def.name]) {
            console.error('Double definition ' + type + ' ' + def.name);
            console.error(def);
            return;
          }
          result[type][scope][def.name] = convertedDefinition;
        });
      });
    });

    return result;
  }
}
