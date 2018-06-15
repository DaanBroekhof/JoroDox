import rawDataTypes from './types/raw_data';
import graphicsTypes from './types/graphics';
import gameDataTypes from './types/game_data';
import localizationTypes from './types/localization';
import userInterfaceTypes from './types/user_interface';
import mapInformationTypes from './types/map_information';
import audioTypes from './types/audio';

import agesSchema from './schemas/ages';
import achievementsSchema from './schemas/achievements';
import countryCommands from './schemas/country_commands';
import countryConditions from './schemas/country_conditions';
import countryFactor from './schemas/country_factor';
import countryModifiers from './schemas/country_modifiers';
import identifiers from './schemas/identifiers';
import specialValues from './schemas/special_values';
import anywhereConditions from './schemas/anywhere_conditions';
import identifierConditions from './schemas/identifier_conditions';
import missionConditions from './schemas/mission_conditions';
import provinceConditions from './schemas/province_conditions';
import tradenodeConditions from './schemas/tradenode_conditions';
import unitConditions from './schemas/unit_conditions';


export default {
  name: 'Europe Universalis 4',
  id: 'eu4',
  types: [].concat(
    rawDataTypes.types,
    graphicsTypes.types,
    gameDataTypes.types,
    localizationTypes.types,
    userInterfaceTypes.types,
    mapInformationTypes.types,
    audioTypes.types,
  ),
  schemas: [
    agesSchema,
    achievementsSchema,

    specialValues,
    countryCommands,
    countryConditions,
    countryFactor,
    countryModifiers,
    identifiers,
    anywhereConditions,
    identifierConditions,
    missionConditions,
    provinceConditions,
    tradenodeConditions,
    unitConditions
  ]
};
