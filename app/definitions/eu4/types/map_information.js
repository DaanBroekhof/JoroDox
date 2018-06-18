export default {
  types: [
    {
      id: 'map_ambient_object',
      title: 'Map ambient objects',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'nr',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/ambient_object.txt',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['type'],
        idPath: [],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Nr',
            dataIndex: 'nr',
            linkTo: '[self]',
          },
          {
            name: 'Type',
            dataIndex: ['data', 'type'],
          },
        ],
      },
    },
    {
      id: 'map_area',
      title: 'Map areas',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/area.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'provinces',
      },
      relations: [
        {
          type: 'arrayValuesByPath',
          path: ['provinces'],
          fromName: 'map_area',
          toType: 'map_provinces',
          toName: 'provinces',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_climate',
      title: 'Map climate',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/climate.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'provinces',
      },
      relations: [
        {
          type: 'arrayValuesByPath',
          path: ['provinces'],
          fromName: 'map_climate',
          toType: 'map_provinces',
          toName: 'provinces',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_continent',
      title: 'Map continents',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/continent.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'provinces',
      },
      relations: [
        {
          type: 'arrayValuesByPath',
          path: ['provinces'],
          fromName: 'map_continent',
          toType: 'map_provinces',
          toName: 'provinces',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_positions',
      title: 'Map city positions',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'province',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/positions.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'province',
        valueName: 'data',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['province'],
          fromName: 'map_positions',
          toType: 'map_provinces',
          toName: 'province',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Province nr',
            dataIndex: 'province',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_region',
      title: 'Map regions',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/region.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'data',
      },
      relations: [
        {
          type: 'arrayValuesByPath',
          path: ['data', 'areas'],
          fromName: 'map_region',
          toType: 'map_area',
          toName: 'map_area',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_superregion',
      title: 'Map superregions',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/superregion.txt',
      },
      relations: [
        {
          type: 'arrayValuesByPath',
          path: ['regions'],
          fromName: 'map_superregion',
          toType: 'map_region',
          toName: 'map_region',
        },
      ],
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'regions',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_provincegroups',
      title: 'Map province groups',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/provincegroups.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'provinces',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_season',
      title: 'Map seasons',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/seasons.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
          {
            name: 'Start date',
            dataIndex: ['data', 'start_date'],
          },
          {
            name: 'End date',
            dataIndex: ['data', 'end_date'],
          },
        ],
      },
    },
    {
      id: 'map_terrain_categories',
      title: 'Map terrain categories',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/terrain.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'categories'],
        keyName: 'name',
        valueName: 'data',
      },
      relations: [
        {
          type: 'arrayValuesByPath',
          path: ['data', 'terrain_override'],
          fromName: 'map_terrain_categories_override',
          toType: 'map_provinces',
          toName: 'map_terrain_categories_overrides',

        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
          {
            name: 'Movement cost',
            dataIndex: ['data', 'movement_cost'],
          },
          {
            name: 'Is water',
            dataIndex: ['data', 'is_water'],
          },
        ],
      },
    },
    {
      id: 'map_terrain_terrain',
      title: 'Map terrains',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/terrain.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'terrain'],
        keyName: 'name',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
          {
            name: 'Type',
            dataIndex: ['data', 'type'],
          },
        ],
      },
    },
    {
      id: 'map_terrain_tree',
      title: 'Map terrain trees',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/terrain.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'tree'],
        keyName: 'name',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
          {
            name: 'Terrain',
            dataIndex: ['data', 'terrain'],
          },
        ],
      },
    },
    {
      id: 'map_tradewinds',
      title: 'Map tradewinds',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'province',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/trade_winds.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'province',
        valueName: 'wind_direction',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['province'],
          fromName: 'map_tradewinds',
          toType: 'map_provinces',
          toName: 'province',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Province',
            dataIndex: 'province',
            linkTo: '[self]',
          },
          {
            name: 'Direction',
            dataIndex: 'wind_direction',
          },
        ],
      },
    },
    {
      id: 'map_lakes',
      title: 'Map lakes',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'nr',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'map/',
        pathPattern: 'map/lakes/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['lake'],
        idPath: [],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Nr',
            dataIndex: 'nr',
            linkTo: '[self]',
          },
          {
            name: 'Comments',
            dataIndex: ['comments'],
          },
        ],
      },
    },
    {
      id: 'map_random_tweaks',
      title: 'Map random tweaks',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'lua_scripts',
        path: 'map/random/tweaks.lua',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data'],
        keyName: 'name',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
          {
            name: 'Name',
            dataIndex: ['data', 'value'],
          },
          {
            name: 'Comment',
            dataIndex: ['data', 'comment'],
          },
        ],
      },
    },
    {
      id: 'map_random_tiles',
      title: 'Map random tiles',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'map/random/tiles/',
        pathPattern: 'map/random/tiles/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
        keyName: 'path',
        path: ['data', 'data'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Path',
            dataIndex: 'path',
            linkTo: '[self]',
          },
          {
            name: 'Continent',
            dataIndex: ['data', 'continent'],
          },
        ],
      },
    },
    {
      id: 'map_random_lakenames',
      title: 'Map random lake names',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/random/RandomLakeNames.txt',
      },
      sourceTransform: {
        type: 'stringValues',
        path: ['data', 'data', 'random_names'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_random_landnames',
      title: 'Map random land names',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/random/RandomLandNames.txt',
      },
      sourceTransform: {
        type: 'stringValues',
        path: ['data', 'data', 'random_names'],
        valueRegex: '^([^:]+)(:(.+))?$',
        valueRegexNames: [null, 'name', null, 'type'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
          {
            name: 'Type',
            dataIndex: 'type',
          },
        ],
      },
    },
    {
      id: 'map_random_seanames',
      title: 'Map random sea names',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/random/RandomSeaNames.txt',
      },
      sourceTransform: {
        type: 'stringValues',
        path: ['data', 'data', 'random_names'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_random_scenarios',
      title: 'Map random scenarios',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'map/random/RNWScenarios.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_adjacencies',
      title: 'Map province adjacencies',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'nr',
      sourceType: {
        id: 'csv_files',
        path: 'map/adjacencies.csv',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data'],
        keyName: 'nr',
        valueName: 'data',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'From'],
          fromName: 'map_adjacencies_from',
          toType: 'map_provinces',
          toName: 'from_province',
        },
        {
          type: 'valueByPath',
          path: ['data', 'To'],
          fromName: 'map_adjacencies_to',
          toType: 'map_provinces',
          toName: 'to_province',
        },
        {
          type: 'valueByPath',
          path: ['data', 'Through'],
          fromName: 'map_adjacencies_through',
          toType: 'map_provinces',
          toName: 'through_province',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Nr',
            dataIndex: 'nr',
            linkTo: '[self]',
          },
          {
            name: 'Type',
            dataIndex: ['data', 'Type'],
          },
          {
            name: 'Comment',
            dataIndex: ['data', 'Comment'],
          },
        ],
      },
    },
    {
      id: 'map_provinces',
      title: 'Map provinces',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'province',
      sourceType: {
        id: 'csv_files',
        path: 'map/definition.csv',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data'],
        valueName: 'data',
        customFields: {
          province: {
            type: 'get',
            fields: ['data', 'province'],
          },
          name: {
            type: 'get',
            fields: ['data', 'x'],
          },
        },
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Province',
            dataIndex: 'province',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_province_map',
      title: 'Map provinces location',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'color',
      sourceType: {
        id: 'indexed_bmps',
        path: 'map/provinces.bmp',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data'],
        keyName: 'color',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Color',
            dataIndex: 'color',
            linkTo: '[self]',
          },
          {
            name: 'Size',
            dataIndex: ['data', 'size'],
          },
          {
            name: 'Adjacencies',
            dataIndex: ['data', 'adjacencies'],
          },
        ],
      },
    },
    {
      id: 'map_canals',
      title: 'Map canals',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'indexed_bmps',
        pathPrefix: 'map/',
        pathPattern: 'map/*_canal_river.bmp',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['data'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Path',
            dataIndex: 'path',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_rivers',
      title: 'Map rivers',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'indexed_bmps',
        path: 'map/rivers.bmp',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['data'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Path',
            dataIndex: 'path',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_terrain_map',
      title: 'Map terrain map',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'color',
      sourceType: {
        id: 'indexed_bmps',
        path: 'map/terrain.bmp',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data'],
        keyName: 'color',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Color',
            dataIndex: 'color',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_terrain_textures',
      title: 'Map terrain textures',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'dds_images',
        flipY: true,
        pathPrefix: 'map/terrain/',
        pathPattern: 'map/terrain/*.dds',
      },
      sourceTransform: {
        type: 'fileData',
        keyName: 'path',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Path',
            dataIndex: 'path',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'map_trees_map',
      title: 'Map terrain trees map',
      category: 'Map information',
      reader: 'StructureLoader',
      primaryKey: 'color',
      sourceType: {
        id: 'indexed_bmps',
        path: 'map/trees.bmp',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data'],
        keyName: 'color',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Color',
            dataIndex: 'color',
            linkTo: '[self]',
          },
        ],
      },
    },
  ],
};