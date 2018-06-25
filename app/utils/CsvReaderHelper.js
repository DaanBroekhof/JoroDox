import _ from "lodash";
import * as iconv from "iconv-lite/lib/index";
const csvparser = require('electron').remote.require('csv-parse');
const jetpack = require('electron').remote.require('fs-jetpack');


export default class CsvReaderHelper {
  static async exportModifiersFromCsv() {

    //const filepath = 'F:\\Projects\\Jorodox\\app\\definitions\\eu4\\country-modifiers-wiki.csv';
    const filepath = 'F:\\Projects\\Jorodox\\app\\definitions\\eu4\\province-modifiers-wiki.csv';

    const csvData = await new Promise((resolve, reject) => {
      csvparser(iconv.decode(jetpack.read(filepath, 'buffer'), 'win1252'), {
        delimiter: ',',
        skip_empty_lines: true,
        relax_column_count: true,
        columns: ['name', 'example', 'description', 'type', 'version_added'],
      }, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });

    const outData = {
      Normal: {},
      Dynamic: {},
    };
    csvData.forEach(modifier => {
      modifier = JSON.parse(JSON.stringify(modifier));

      if (modifier.description === '' || modifier.description === 'Description') {
        return;
      }
      
      const def = {
        description: modifier.description + ' (' + modifier.type + ')',
        type: 'number'
      };
      if (modifier.type === 'Constant') {
        delete def.type;
        def.$ref = 'special_values.json#/definitions/boolean';
      }

      const dynamicName = modifier.name.match(/^<([a-z_]+)>([a-z_]+)$/i);
      if (dynamicName) {
        def.postFix = dynamicName[2];

        let typeName = 'nada';
        if (dynamicName[1] === 'faction') {
          typeName = 'factions';
        } else if (dynamicName[1] === 'tech') {
          typeName = 'technology_groups';
        } else {
          console.log('Unknown type ', dynamicName);
        }

        outData.Dynamic[typeName] = def;
        return;
      }

      outData.Normal[modifier.name] = def;
    })

    const sortedData = _(outData.Normal).toPairs().sortBy(0).fromPairs().value();

    console.log(outData);

    console.log(JSON.stringify(sortedData));
  }

  static async exportConditionsFromCsv() {
    const csvData = await new Promise((resolve, reject) => {
      csvparser(iconv.decode(jetpack.read('F:\\Projects\\Jorodox\\app\\definitions\\conditions-wiki-copy.csv', 'buffer'), 'win1252'), {
        delimiter: ',',
        skip_empty_lines: true,
        relax_column_count: true,
        columns: ['name', 'type', 'description', 'scope', 'example'],
      }, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });

    let outData = {
      'Province': {},
      'Country': {},
      'Anywhere': {},
      'Trade Node': {},
    };
    csvData.forEach(condition => {
      condition = JSON.parse(JSON.stringify(condition));

      const def = {
        description: condition.description,
      };

      if (condition.type === 'Idenitifer') {
        condition.type = 'Identifier';
      }

      if (condition.type === 'Boolean') {
        def.$reg = 'special_values.json#/definitions/boolean';
      } else if (condition.type === 'Clause') {
        def.type = 'object';
      } else if (condition.type === 'Date') {
        def.$reg = 'special_values.json#/definitions/date';
      } else if (condition.type === 'Float') {
        def.type = 'number';
      } else if (condition.type === 'Identifier' || condition.type === 'Identifier, Capital' || condition.type === 'Identifier, Province scope' || condition.type === 'Identifier, REB' || condition.type === 'Identifier, Scope') {
        if (_.includes(condition.description, 'religion')) {
          def.$reg = 'identifiers.json#/definitions/religion';
        } else if (_.includes(condition.description, 'age')) {
          def.$reg = 'identifiers.json#/definitions/age';
        } else if (_.includes(condition.description, 'global flag')) {
          def.$reg = 'identifiers.json#/definitions/global_flag';
        } else if (_.includes(condition.description, 'institution')) {
          def.$reg = 'identifiers.json#/definitions/institution';
        } else if (_.includes(condition.description, 'mission')) {
          def.$reg = 'identifiers.json#/definitions/mission';
        } else if (_.includes(condition.description, 'advisor')) {
          def.$reg = 'identifiers.json#/definitions/advisor';
        } else if (_.includes(condition.description, 'subject type')) {
          def.$reg = 'identifiers.json#/definitions/subject_type';
        } else if (_.includes(condition.description, 'personality')) {
          def.$reg = 'identifiers.json#/definitions/leader_personality';
        } else if (_.includes(condition.description, 'debate')) {
          def.$reg = 'identifiers.json#/definitions/debate';
        } else if (_.includes(condition.description, 'faction')) {
          def.$reg = 'identifiers.json#/definitions/faction';
        } else if (_.includes(condition.description, 'icon')) {
          def.$reg = 'identifiers.json#/definitions/unknown_icon';
        } else if (_.includes(condition.description, 'idea_group')) {
          def.$reg = 'identifiers.json#/definitions/idea_group';
        } else if (_.includes(condition.description, 'government type')) {
          def.$reg = 'identifiers.json#/definitions/government';
        } else if (_.includes(condition.description, 'policy')) {
          def.$reg = 'identifiers.json#/definitions/policy';
        } else if (_.includes(condition.description, 'cult.')) {
          def.$reg = 'identifiers.json#/definitions/fetishist_cults';
        } else if (_.includes(condition.description, 'age ability')) {
          def.$reg = 'identifiers.json#/definitions/age_ability';
        } else if (_.includes(condition.description, 'church aspect')) {
          def.$reg = 'identifiers.json#/definitions/church_aspect';
        } else if (_.includes(condition.description, 'consort flag')) {
          def.$reg = 'identifiers.json#/definitions/consort_flag_unknown';
        } else if (_.includes(condition.description, 'flag')) {
          def.$reg = 'identifiers.json#/definitions/country_flag';
        } else if (_.includes(condition.description, 'modifier')) {
          def.$reg = 'identifiers.json#/definitions/modifier';
        } else if (_.includes(condition.description, 'disaster')) {
          def.$reg = 'identifiers.json#/definitions/disaster';
        } else if (_.includes(condition.description, 'estate')) {
          def.$reg = 'identifiers.json#/definitions/estate';
        } else if (_.includes(condition.description, 'government mechanic')) {
          def.$reg = 'identifiers.json#/definitions/government_mechanic';
        } else if (_.includes(condition.description, 'heir flag')) {
          def.$reg = 'identifiers.json#/definitions/heir_flag';
        } else if (_.includes(condition.description, 'idea')) {
          def.$reg = 'identifiers.json#/definitions/idea';
        } else if (_.includes(condition.description, 'leader')) {
          def.$reg = 'identifiers.json#/definitions/leader_name_unknown';
        } else if (_.includes(condition.description, 'personal deity')) {
          def.$reg = 'identifiers.json#/definitions/personal_deity';
        } else if (_.includes(condition.description, 'promote investments')) {
          def.$reg = 'identifiers.json#/definitions/investments_unknown';
        } else if (_.includes(condition.description, 'ruler flag')) {
          def.$reg = 'identifiers.json#/definitions/ruler_flag_unknown';
        } else if (_.includes(condition.description, 'ruler modifier')) {
          def.$reg = 'identifiers.json#/definitions/ruler_modifier_unknown';
        } else if (_.includes(condition.description, 'rebels')) {
          def.$reg = 'identifiers.json#/definitions/rebel_type';
        } else if (_.includes(condition.description, 'units of type')) {
          def.$reg = 'identifiers.json#/definitions/unit_type';
        } else if (_.includes(condition.description, 'unit type')) {
          def.$reg = 'identifiers.json#/definitions/unit_type';
        } else if (_.includes(condition.description, 'league')) {
          def.$reg = 'identifiers.json#/definitions/league_unknown';
        } else if (_.includes(condition.description, 'incident')) {
          def.$reg = 'identifiers.json#/definitions/incident';
        } else if (_.includes(condition.description, 'subject of type')) {
          def.$reg = 'identifiers.json#/definitions/subject_type';
        } else if (_.includes(condition.description, 'national focus')) {
          def.$reg = 'special_values.json#/definitions/power_type';
        } else if (_.includes(condition.description, 'country has a ruler which personality')) {
          def.$reg = 'identifiers.json#/definitions/ai_personality';
        } else if (_.includes(condition.description, 'technology group')) {
          def.$reg = 'identifiers.json#/definitions/technology_group';
        } else if (_.includes(condition.description, 'culture group')) {
          def.$reg = 'identifiers.json#/definitions/culture_group';
        } else if (_.includes(condition.description, 'culture')) {
          def.$reg = 'identifiers.json#/definitions/culture';
        } else if (_.includes(condition.description, 'religion group')) {
          def.$reg = 'identifiers.json#/definitions/religion_group';
        } else if (_.includes(condition.description, 'province group')) {
          def.$reg = 'identifiers.json#/definitions/province_group';
          // PROVINCE STUFF
        } else if (_.includes(condition.description, 'area')) {
          def.$reg = 'identifiers.json#/definitions/area';
        } else if (_.includes(condition.description, 'building')) {
          def.$reg = 'identifiers.json#/definitions/building';
        } else if (_.includes(condition.description, 'colonial region')) {
          def.$reg = 'identifiers.json#/definitions/colonial_region';
        } else if (_.includes(condition.description, 'continent')) {
          def.$reg = 'identifiers.json#/definitions/continent';
        } else if (_.includes(condition.description, 'climate')) {
          def.$reg = 'identifiers.json#/definitions/map_climate';
        } else if (_.includes(condition.description, 'construction in progress')) {
          def.$reg = 'special_values.json#/definitions/construction_types_unknown';
        } else if (_.includes(condition.description, 'great project')) {
          def.$reg = 'identifiers.json#/definitions/great_project';
        } else if (_.includes(condition.description, 'province flag')) {
          def.$reg = 'identifiers.json#/definitions/province_flag_unknown';
        } else if (_.includes(condition.description, 'province modifier')) {
          def.$reg = 'identifiers.json#/definitions/province_modifier_unknown';
        } else if (_.includes(condition.description, 'terrain')) {
          def.$reg = 'identifiers.json#/definitions/map_terrain_terrain';
        } else if (_.includes(condition.description, 'winter')) {
          def.$reg = 'identifiers.json#/definitions/map_climate';
        } else if (_.includes(condition.description, 'region')) {
          def.$reg = 'identifiers.json#/definitions/region';
        } else if (_.includes(condition.description, 'superregion')) {
          def.$reg = 'identifiers.json#/definitions/superregion';
        } else if (_.includes(condition.description, 'trade good')) {
          def.$reg = 'identifiers.json#/definitions/trade_good';
        } else if (_.includes(condition.description, 'rebel faction')) {
          def.$reg = 'identifiers.json#/definitions/rebel_faction_unknown';
        } else if (_.includes(condition.description, 'DLC')) {
          def.$reg = 'identifiers.json#/definitions/dlc';
        } else if (_.includes(condition.description, 'event target')) {
          def.$reg = 'identifiers.json#/definitions/event_target_unknown';
        } else if (_.includes(condition.description, 'custom nation')) {
          def.$reg = 'identifiers.json#/definitions/custom_nation_points_unknown';
        } else {
          def.$reg = 'identifiers.json#/definitions/unknown';
          console.log('Unknown IDENTIFIER: ', condition);
        }
      } else if (condition.type === 'Integer') {
        def.type = 'number';
      } else if (condition.type === 'Tag') {
        def.$reg = 'identifiers.json#/definitions/country_tag';
      } else if (condition.type === 'Advisor ID[1]') {
        def.$reg = 'identifiers.json#/definitions/advisor_id_unknown';
      } else if (condition.type === 'Boolean, any, none') {
        def.$reg = 'special_values.json#/definitions/any_none';
      } else if (condition.type === 'Boolean, Name') {
        def.anyOf = [
          {$reg: 'special_values.json#/definitions/boolean'},
          {$reg: 'identifiers.json#/definitions/heir_name_unknown'},
        ];
      } else if (condition.type === 'Boolean, Tag, Scope') {
        def.anyOf = [
          {$reg: 'special_values.json#/definitions/boolean'},
          {$reg: 'identifiers.json#/definitions/country_tag'},
          {$reg: 'special_values.json#/definitions/country_scope'},
        ];
      } else if (condition.type === 'CAPITAL, Province Scope') {
        def.anyOf = [
          {$reg: 'special_values.json#/definitions/capital_unknown'},
          {$reg: 'special_values.json#/definitions/province_scope'},
        ];
      } else if (condition.type === 'Country') {
        def.anyOf = [
          {$reg: 'identifiers.json#/definitions/country_tag'},
          {$reg: 'special_values.json#/definitions/country_scope'},
        ];
      } else if (condition.type === 'Integer,Scope') {
        def.$reg = 'identifiers.json#/definitions/province_id';
      } else if (condition.type === 'Name' && _.includes(condition.description, 'dynasty')) {
        def.$reg = 'identifiers.json#/definitions/dynasty_name';
      } else if (condition.type === 'Name' && _.includes(condition.description, 'ruler')) {
        def.$reg = 'identifiers.json#/definitions/ruler_name';
      } else if (condition.type === 'Province id' || condition.type === 'Province ID') {
        def.$reg = 'identifiers.json#/definitions/province_id';
      } else if (condition.type === 'Province ID, Scope') {
        def.anyOf = [
          {$reg: 'identifiers.json#/definitions/province_id'},
          {$reg: 'special_values.json#/definitions/country_scope'},
          {$reg: 'special_values.json#/definitions/province_scope'},
        ];
      } else if (condition.type === 'Scope') {
        def.$reg = 'special_values.json#/definitions/country_scope';
      } else if (condition.type === 'Scope, Tag' || condition.type === 'Tag, Scope' || condition.type === 'Tag, Scopes' || condition.type === 'Tag. Scope') {
        def.anyOf = [
          {$reg: 'identifiers.json#/definitions/country_tag'},
          {$reg: 'special_values.json#/definitions/country_scope'},
        ];
      } else if (condition.type === 'yes') {
        def.anyOf = [
          {$reg: 'special_values.json#/definitions/yes'},
        ];
      } else {
        console.log('No def:', condition);
        return;
      }

      // 2nd condition identifiers
      if (condition.type === 'Identifier, Capital') {
        def.anyOf = [
          {$reg: def.$reg},
          {$reg: 'special_values.json#/definitions/country_scope'},
        ];
      } else if (condition.type === 'Identifier, Province scope') {
        def.anyOf = [
          {$reg: def.$reg},
          {$reg: 'special_values.json#/definitions/province_scope'},
        ];
      } else if (condition.type === 'Identifier, REB') {
        def.anyOf = [
          {$reg: def.$reg},
          {$reg: 'special_values.json#/definitions/rebels_unknown'},
        ];
      } else if (condition.type === 'Identifier, Scope' && condition.scope === 'Country') {
        def.anyOf = [
          {$reg: def.$reg},
          {$reg: 'special_values.json#/definitions/country_scope'},
        ];
      } else if (condition.type === 'Identifier, Scope' && condition.scope === 'Anywhere') {
        def.anyOf = [
          {$reg: def.$reg},
          {$reg: 'special_values.json#/definitions/country_scope'},
        ];
      } else if (condition.type === 'Identifier, Scope' && condition.scope === 'Country\n' +
        'Province') {
        def.anyOf = [
          {$reg: def.$reg},
          {$reg: 'special_values.json#/definitions/country_scope'},
          {$reg: 'special_values.json#/definitions/province_scope'},
        ];
      }

      let found = false;
      if (condition.scope === 'Anywhere' || condition.scope === 'Clobal' || condition.scope === 'Global') {
        outData['Anywhere'][condition.name] = def;
        found = true;
      }
      if (_.includes(condition.scope, 'Country') || condition.scope === 'Region') {
        outData['Country'][condition.name] = def;
        found = true;
      }
      if (_.includes(condition.scope, 'Province')) {
        outData['Province'][condition.name] = def;
        found = true;
      }
      if (_.includes(condition.scope, 'Trade node')) {
        outData['Trade Node'][condition.name] = def;
        found = true;
      }

      if (!found) {
        console.log('SCOPE TYPE NOT FOUND: ', condition);
      }
    });

    let sortedData = _(outData['Country']).toPairs().sortBy(0).fromPairs().value();

    console.log(JSON.stringify(sortedData));
  }

  static async exportCountryCommands() {

    const scopeType = 'anywhere';

    const csvData = await new Promise((resolve, reject) => {
      csvparser(iconv.decode(jetpack.read('F:\\Projects\\Jorodox\\app\\definitions\\eu4\\'+ scopeType +'-commands-wiki.csv', 'buffer'), 'win1252'), {
        delimiter: ',',
        skip_empty_lines: true,
        relax_column_count: true,
        columns: ['name', 'parameters', 'examples', 'description', 'notes', 'version_added'],
      }, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });

    let outData = {};
    csvData.forEach(command => {
      command = JSON.parse(JSON.stringify(command));

      const def = {
        description: command.description + (command.notes ? '\nNotes: ' + command.notes : ''),
        $ref: [],
        version_added: command.version_added,
      };

      if (command.parameters.match(/^<string>/m)) {
        def.type = 'string';
      }
      if (command.parameters.match(/^<int>/m)) {
        def.type = 'number';
      }
      if (command.parameters.match(/^<float>/m)) {
        def.type = 'number';
      }
      if (command.parameters.match(/^<scope>/m)) {
        def.$ref.push('special_values.json#/definitions/country_tag_or_scope');
      }
      if (command.parameters.match(/^<culture>/m)) {
        def.$ref.push('identifiers.json#/definitions/cultures');
      }
      if (command.parameters.match(/^<policy>/m)) {
        def.$ref.push('identifiers.json#/definitions/policies');
      }
      if (command.parameters.match(/^<cb>/m)) {
        def.$ref.push('identifiers.json#/definitions/cb_types');
      }
      if (command.parameters.match(/^<religion>/m)) {
        def.$ref.push('identifiers.json#/definitions/religions');
      }
      if (command.parameters.match(/^<personality>/m)) {
        def.$ref.push('identifiers.json#/definitions/ruler_personalities');
      }
      if (command.parameters.match(/^<idea>/m)) {
        def.$ref.push('identifiers.json#/definitions/ideas');
      }
      if (command.parameters.match(/^<ideagroup>/m)) {
        def.$ref.push('identifiers.json#/definitions/idea_groups');
      }
      if (command.parameters.match(/^<government>/m)) {
        def.$ref.push('identifiers.json#/definitions/governments');
      }
      if (command.parameters.match(/^<gfxculture>/m)) {
        def.$ref.push('identifiers.json#/definitions/graphicalculturetypes');
      }
      if (command.parameters.match(/^<deity>/m)) {
        def.$ref.push('identifiers.json#/definitions/personal_deities');
      }
      if (command.parameters.match(/^<technology group>/m)) {
        def.$ref.push('identifiers.json#/definitions/technology_groups');
      }
      if (command.parameters.match(/^<type>/m)) {
        def.$ref.push('identifiers.json#/definitions/units');
      }
      if (command.parameters.match(/^<key>/m)) {
        def.$ref.push('special_values.json#/definitions/save_game_key');
      }
      if (command.parameters.match(/^Boolean/m)) {
        def.$ref.push('special_values.json#/definitions/boolean');
      }
      if (command.parameters.match(/^<flag>/m)) {
        def.$ref.push('special_values.json#/definitions/flag_name');
      }
      if (command.parameters.match(/^<advisor>/m)) {
        def.$ref.push('identifiers.json#/definitions/advisortypes');
      }
      if (command.parameters.match(/^<estate>/m)) {
        def.$ref.push('identifiers.json#/definitions/estates');
      }
      if (command.parameters.match(/^<disaster>/m)) {
        def.$ref.push('identifiers.json#/definitions/disasters');
      }
      if (command.parameters.match(/^<type>/m)) {
        def.$ref.push('identifiers.json#/definitions/rebel_types');
      }
      if (command.parameters.match(/^<advisor id>/m)) {
        def.$ref.push('identifiers.json#/definitions/advisor_ids');
      }
      if (command.parameters.match(/^<aspect>/m)) {
        def.$ref.push('identifiers.json#/definitions/church_aspects');
      }
      if (command.parameters.match(/^<faction>/m)) {
        def.$ref.push('identifiers.json#/definitions/factions');
      }
      if (command.parameters.match(/^<months>/m)) {
        def.type = 'number';
      }
      if (command.parameters.match(/^<reform>/m)) {
        def.$ref.push('identifiers.json#/definitions/religious_reforms');
      }
      if (command.parameters.match(/^<cult>/m)) {
        def.$ref.push('identifiers.json#/definitions/fetishist_cults');
      }
      if (command.parameters.match(/^<project>/m)) {
        def.$ref.push('identifiers.json#/definitions/projects');
      }
      if (command.parameters.match(/^<modifier>/m)) {
        if (scopeType === 'province') {
          def.$ref.push('identifiers.json#/definitions/province_modifiers');
        } else {
          def.$ref.push('identifiers.json#/definitions/modifiers');
        }
      }
      if (command.parameters.match(/^<good>/m)) {
        def.$ref.push('identifiers.json#/definitions/tradegoods');
      }
      if (command.parameters.match(/^<type>/m)) {
       // def.$ref.push('identifiers.json#/definitions/leader_personalities');
      }
      if (command.parameters.match(/^<building>/m)) {
        def.$ref.push('identifiers.json#/definitions/buildings');
      }

      if (def.$ref.length > 1) {
        def.anyOf = [];
        def.$ref.forEach(ref => {
          def.anyOf.push({$ref: ref});
        });
        delete def.$ref;
      }

      if (def.$ref && def.$ref.length === 0) {
        delete def.$ref;
      }
      if (def.$ref && def.$ref.length === 1) {
        def.$ref = def.$ref[0];
      }

      if (!def.$ref && !def.type && !def.anyOf) {
        def.type = 'object';
      }

      outData[command.name] = def;
    });

    let sortedData = _(outData).toPairs().sortBy(0).fromPairs().value();

    console.log(JSON.stringify(sortedData));
  }
}
