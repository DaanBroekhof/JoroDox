import rawDataTypes from './types/raw_data';
import graphicsTypes from './types/graphics';
import gameDataTypes from './types/game_data';
import localizationTypes from './types/localization';
import userInterfaceTypes from './types/user_interface';
import mapInformationTypes from './types/map_information';
import audioTypes from './types/audio';


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
};
