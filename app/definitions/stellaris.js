import React from 'react';
import filesize from 'filesize';

export default {
  name: 'Stellaris',
  id: 'stellaris',
  types: [
    {
      id: 'files',
      title: 'Files & Directories',
      category: 'Raw data',
      reader: 'FileLoader',
      readerFileIgnore: [
        '.*',
        '.*/**',
        '**/.*',
        '_*',
        '_*/**',
      ],
      primaryKey: 'path',
      indexedKeys: ['type'],
      listView: {
        pageSize: 50,
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
          {
            name: 'Size',
            dataIndex: ['info', 'size'],
            moveable: true,
            renderer: ({value, row}) => (
              <span>{(row.info.type === 'file' ? filesize(value) : '')}</span>
            ),
          },
          {
            name: 'Type',
            dataIndex: 'type',
            moveable: true,

          },
        ],
      }
    },
    {
      id: 'pdx_scripts',
      title: 'PDX script files',
      category: 'Raw data',
      reader: 'PdxScriptParser',
      primaryKey: 'path',
      listView: {
        pageSize: 50,
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'pdx_data',
      title: 'PDX binary data files',
      category: 'Raw data',
      reader: 'PdxDataParser',
      primaryKey: 'path',
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'lua_scripts',
      title: 'LUA script files',
      category: 'Raw data',
      reader: 'LuaScriptParser',
      primaryKey: 'path',
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'csv_files',
      title: 'CSV data files',
      category: 'Raw data',
      reader: 'CsvFileParser',
      primaryKey: 'path',
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'pdxyml_files',
      title: 'PDX YML data files',
      category: 'Raw data',
      reader: 'PdxYmlFileParser',
      primaryKey: 'path',
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'pdx_meshes',
      title: '3D Models',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_data',
        pathPrefix: '',
        pathPattern: '**/*.mesh',
      },
      sourceTransform: {
        type: 'fileData',
        keyName: 'path',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'country_tags',
      title: 'Country tags',
      reader: 'StructureLoader',
      primaryKey: 'tag',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'tag',
        valueName: 'filePath',
      },
      relations: [
        {
          type: 'byPath',
          pathPrefix: 'common/',
          property: 'filePath',
          fromName: 'tag',
          toName: 'country',
          toType: 'countries',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Tag',
            dataIndex: ['tag'],
            width: '10%',
            linkTo: '[self]',
          },
          {
            name: 'Filepath',
            dataIndex: 'filePath',
          },
        ],
      },
    },
    {
      id: 'countries',
      title: 'Countries',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['data', 'data'],
        relationsFromName: 'country',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'graphical_culture'],
          fromName: 'graphical_culture',
          toType: 'graphicalculturetypes',
          toName: 'graphicalculturetype',
        },
        {
          type: 'arrayValuesByPath',
          path: ['data', 'historical_idea_groups'],
          fromName: 'country_historical_idea_groups',
          toType: 'ideas',
          toName: 'idea_group',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Path',
            dataIndex: 'path',
            linkTo: '[self]',
          },
          {
            name: 'Culture',
            dataIndex: ['data', 'graphical_culture'],
          },
        ],
      },
    },
    {
      id: 'country_colors',
      title: 'Country colors',
      reader: 'StructureLoader',
      primaryKey: 'tag',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'tag',
        valueName: 'color',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Tag',
            dataIndex: 'tag',
            linkTo: '[self]',
          },
          {
            name: 'Color',
            dataIndex: ['data'],
          },
        ],
      },
    },
    {
      id: 'ages',
      title: 'Ages',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Start',
            dataIndex: ['data', 'start'],
          },
        ],
      },
    },
    {
      id: 'culture_groups',
      title: 'Culture groups',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/cultures/',
        pathPattern: 'common/cultures/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'data',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'graphical_culture'],
          fromName: 'graphical_culture',
          toType: 'graphicalculturetypes',
          toName: 'graphicalculturetype',
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
            name: 'Graphical culture',
            dataIndex: ['data', 'graphical_culture'],
          },
        ],
      },
    },
    {
      id: 'cultures',
      title: 'Cultures',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyKeyValues',
        path: ['data', 'data'],
        requiredProperty: 'primary',
        keyName: 'name',
        parentKeyName: 'culture_group',
        valueName: 'data',
        parentRelationType: 'culture_groups',
        parentRelationKey: 'parent_culture_group',
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
            name: 'Primary country',
            dataIndex: ['data', 'primary'],
          },
        ],
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'primary'],
          fromName: 'culture_primary_tag',
          toType: 'country_tags',
          toName: 'primary_country_tag',
        },
        {
          type: 'valueByPath',
          path: ['culture_group'],
          fromName: 'culture',
          toType: 'culture_groups',
          toName: 'culture_group',
        },
      ],
    },
    {
      id: 'advisortypes',
      title: 'Advisor types',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Monarch power',
            dataIndex: ['data', 'monarch_power'],
          },
        ],
      },
    },
    {
      id: 'ai_personalities',
      title: 'IA personalities',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'bookmarks',
      title: 'Bookmarks',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['data', 'data', 'bookmark'],
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
            name: 'Name',
            dataIndex: ['data', 'name'],
          },
          {
            name: 'Date',
            dataIndex: ['data', 'date'],
          },
        ],
      },
      relations: [
        {
          type: 'arrayValuesByPath',
          path: ['data', 'country'],
          fromName: 'bookmark',
          toType: 'country_tags',
          toName: 'country_tag',
        },
      ],
    },
    {
      id: 'buildings',
      title: 'Buildings',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'data',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'make_obsolete'],
          fromName: 'made_obsolete_by',
          toType: 'buildings',
          toName: 'makes_obsolete',
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
            name: 'Cost',
            dataIndex: ['data', 'cost'],
          },
          {
            name: 'Time',
            dataIndex: ['data', 'time'],
          },
        ],
      },
    },
    {
      id: 'cb_types',
      title: 'CB types',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'data',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'war_goal'],
          fromName: 'cb_type_war_goal',
          toType: 'wargoal_types',
          toName: 'cb_types',
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
            name: 'Months',
            dataIndex: ['data', 'months'],
          },
          {
            name: 'War goal',
            dataIndex: ['data', 'war_goal'],
          },
        ],
      },
    },
    {
      id: 'church_aspects',
      title: 'Church Aspects',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'client_states',
      title: 'Client states',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Region',
            dataIndex: ['data', 'region'],
          },
        ],
      },
    },
    {
      id: 'colonial_regions',
      title: 'Colonial regions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
          path: ['data', 'provinces'],
          fromName: 'colonial_regions',
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
          {
            name: 'Tax income',
            dataIndex: ['data', 'tax_income'],
          },
          {
            name: 'Native size',
            dataIndex: ['data', 'native_size'],
          },
          {
            name: 'Native ferocity',
            dataIndex: ['data', 'native_ferocity'],
          },
          {
            name: 'Native hostileness',
            dataIndex: ['data', 'native_hostileness'],
          },
        ],
      },
    },
    {
      id: 'religion_groups',
      title: 'Religion groups',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/religions/',
        pathPattern: 'common/religions/*.txt',
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
            name: 'Center of religion',
            dataIndex: ['data', 'center_of_religion'],
          },
        ],
      },
    },
    {
      id: 'religions',
      title: 'Religions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyKeyValues',
        requiredProperty: 'icon',
        path: ['data', 'data'],
        keyName: 'name',
        parentKeyName: 'religion_group',
        valueName: 'data',
        parentRelationType: 'religionGroups',
        parentRelationKey: 'parentReligionGroup',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['religion_group'],
          fromName: 'religion_group',
          toType: 'religion_groups',
          toName: 'religion',
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
      id: 'custom_country_colors',
      title: 'Custom country colors',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'custom_ideas',
      title: 'Custom ideas',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Category',
            dataIndex: ['data', 'category'],
          },
        ],
      },
    },
    {
      id: 'decrees',
      title: 'Decrees',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Cost',
            dataIndex: ['data', 'cost'],
          },
        ],
      },
    },
    {
      id: 'diplomatic_actions',
      title: 'Diplomatic actions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'disasters',
      title: 'Disasters',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'dynasty_colors',
      title: 'Dynasty Colors',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
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

        ],
      },
    },
    {
      id: 'estates',
      title: 'Estates',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'event_modifiers',
      title: 'Event modifiers',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'factions',
      title: 'Factions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Monarch power',
            dataIndex: ['data', 'monarch_power'],
          },
        ],
      },
    },
    {
      id: 'fervor',
      title: 'Fervor',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Cost',
            dataIndex: ['data', 'cost'],
          },
        ],
      },
    },
    {
      id: 'fetishist_cults',
      title: 'Fetishist cults',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'government_names',
      title: 'Government names',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'trigger', 'government'],
          fromName: 'government_name_trigger',
          toType: 'governments',
          toName: 'governments',
        },
        {
          type: 'valueByPath',
          path: ['data', 'trigger', 'tag'],
          fromName: 'government_name_trigger',
          toType: 'countryTags',
          toName: 'countryTags',
        },
        {
          type: 'valueByPath',
          path: ['data', 'trigger', 'primary_culture'],
          fromName: 'government_name_trigger',
          toType: 'cultures',
          toName: 'cultures',
        },
        {
          type: 'valueByPath',
          path: ['data', 'trigger', 'culture_group'],
          fromName: 'government_name_trigger',
          toType: 'cultureGroups',
          toName: 'cultureGroups',
        },
        {
          type: 'valueByPath',
          path: ['data', 'trigger', 'religion_group'],
          fromName: 'government_name_trigger',
          toType: 'religionGroups',
          toName: 'religionGroups',
        },
        {
          type: 'valueByPath',
          path: ['data', 'trigger', 'religion'],
          fromName: 'government_name_trigger',
          toType: 'religions',
          toName: 'religions',
        },
      ],
    },
    {
      id: 'governments',
      title: 'Governments',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Monarchy',
            dataIndex: ['data', 'monarchy'],
          },
          {
            name: 'Max states',
            dataIndex: ['data', 'max_states'],
          },
        ],
      },
    },
    {
      id: 'great_projects',
      title: 'Great projects',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'data',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'province'],
          fromName: 'great_project',
          toType: 'map_provinces',
          toName: 'map_province',
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
      id: 'ideas',
      title: 'Ideas',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Country tag',
            dataIndex: ['data', 'trigger', 'tag'],
          },
          {
            name: 'Category',
            dataIndex: ['data', 'category'],
          },
        ],
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'trigger', 'tag'],
          fromName: 'idea_country_tag',
          toType: 'country_tags',
          toName: 'country_tags',
        },
      ],
    },
    {
      id: 'imperial_reforms',
      title: 'Imperial reforms',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Empire',
            dataIndex: ['data', 'empire'],
          },
        ],
      },
    },
    {
      id: 'incidents',
      title: 'Incidents',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Frame',
            dataIndex: ['data', 'frame'],
          },
        ],
      },
    },
    {
      id: 'institutions',
      title: 'Institutions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'isolationism',
      title: 'Isolationism',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Isolation value',
            dataIndex: ['data', 'isolation_value'],
          },
        ],
      },
    },
    {
      id: 'leader_personalities',
      title: 'Leader personalities',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'native_advancement',
      title: 'Native advancement',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Category',
            dataIndex: ['data', 'category'],
          },
        ],
      },
    },
    {
      id: 'natives',
      title: 'Natives',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Graphical culture',
            dataIndex: ['data', 'graphical_culture '],
          },
        ],
      },
    },
    {
      id: 'new_diplomatic_actions',
      title: 'New diplomatic actions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'on_actions',
      title: 'On Actions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'opinion_modifiers',
      title: 'Opinion modifiers',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Opinion mod',
            dataIndex: ['data', 'opinion'],
          },
        ],
      },
    },
    {
      id: 'parliament_bribes',
      title: 'Parliament bribes',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'parliament_issues',
      title: 'Parliament issues',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Category',
            dataIndex: ['data', 'category'],
          },
        ],
      },
    },
    {
      id: 'peace_treaties',
      title: 'Peace treaties',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'personal_deities',
      title: 'Personal deities',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'data',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'allow', 'religion'],
          fromName: 'personal_deities_allow',
          toType: 'religions',
          toName: 'religion',
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
      id: 'policies',
      title: 'Policies',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Monarch power',
            dataIndex: ['data', 'monarch_power'],
          },
        ],
      },
    },
    {
      id: 'powerprojection',
      title: 'Powerprojection',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'prices',
      title: 'Prices',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Base price',
            dataIndex: ['data', 'base_price'],
          },
        ],
      },
    },
    {
      id: 'professionalism',
      title: 'Professionalism',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Army professionalism',
            dataIndex: ['data', 'army_professionalism'],
          },
        ],
      },
    },
    {
      id: 'province_names',
      title: 'Province names',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['data', 'data'],
        filenamePattern: '/([^/.]+).txt$',
        filenamePatternKey: 'culture_or_culture_group_or_tag',
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
      id: 'province_triggered_modifiers',
      title: 'Province triggered modifiers',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'rebel_types',
      title: 'Rebel types',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'region_colors',
      title: 'Region colors',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
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

        ],
      },
    },
    {
      id: 'religious_conversions',
      title: 'Religious conversions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Base conversion speed',
            dataIndex: ['data', 'base_conversion_speed'],
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'religious_reforms',
      title: 'Religious reforms',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'revolt_triggers',
      title: 'Revolt triggers',
      reader: 'StructureLoader',
      primaryKey: 'tag',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'tag',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Tag',
            dataIndex: 'tag',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'ruler_personalities',
      title: 'Ruler personalities',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'scripted_effects',
      title: 'Scripted effects',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'scripted_functions',
      title: 'Scripted functions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'scripted_triggers',
      title: 'Scripted triggers',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'state_edicts',
      title: 'State edicts',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'static_modifiers',
      title: 'Static modifiers',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'subject_types',
      title: 'Subject types',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'technologies',
      title: 'Technologies',
      reader: 'StructureLoader',
      primaryKey: 'nr',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['technology'],
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
            name: 'Year',
            dataIndex: ['data', 'year'],
          },
        ],
      },
    },
    {
      id: 'timed_modifiers',
      title: 'Timed modifiers',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'trade_companies',
      title: 'Trade companies',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'tradegoods',
      title: 'Tradegoods',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'tradenodes',
      title: 'Tradenodes',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Inland',
            dataIndex: ['data', 'inland'],
          },
          {
            name: 'Location',
            dataIndex: ['data', 'location'],
          },
        ],
      },
    },
    {
      id: 'trading_policies',
      title: 'Trading policies',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'triggered_modifiers',
      title: 'Trigger modifiers',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
      id: 'units',
      title: 'Units',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
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
            name: 'Type',
            dataIndex: ['data', 'type'],
          },
          {
            name: 'Unit type',
            dataIndex: ['data', 'unit_type'],
          },

        ],
      },
    },
    {
      id: 'wargoal_types',
      title: 'Wargoal types',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'common/{type.id}/',
        pathPattern: 'common/{type.id}/*.txt',
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
            name: 'Type',
            dataIndex: ['data', 'type'],
          },
        ],
      },
    },
    {
      id: 'events',
      title: 'Events',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'events/',
        pathPattern: 'events/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['country_event', 'province_event'],
        idPath: ['data', 'id'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Id',
            dataIndex: ['id'],
            linkTo: '[self]',
          },
          {
            name: 'Type',
            dataIndex: ['type'],
          },
          {
            name: 'Comments',
            dataIndex: ['comments'],
          },
          {
            name: 'Namespace',
            dataIndex: ['namespace', 'namespace'],
          },
          {
            name: 'MTT',
            dataIndex: ['data', 'mean_time_to_happen', 'months'],
          },
        ],
      },
    },
    {
      id: 'history_provinces',
      title: 'History provinces',
      reader: 'StructureLoader',
      primaryKey: 'province_id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'history/provinces/',
        pathPattern: 'history/provinces/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['data', 'data'],
        filenamePattern: '/([0-9]+)[^0-9][^/]*\\.txt',
        filenamePatternKey: 'province_id',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Province',
            dataIndex: 'province_id',
            linkTo: '[self]',
          },
          {
            name: 'Path',
            dataIndex: 'path',
          },
          {
            name: 'Culture',
            dataIndex: ['data', 'culture'],
          },
          {
            name: 'Trade goods',
            dataIndex: ['data', 'trade_goods'],
          },
          {
            name: 'Owner',
            dataIndex: ['data', 'owner'],
          },
          {
            name: 'Controller',
            dataIndex: ['data', 'controller'],
          },
        ],
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'owner'],
          fromName: 'history_province_owner',
          toType: 'country_tags',
          toName: 'owner_country_tag',
        },
        {
          type: 'valueByPath',
          path: ['data', 'controller'],
          fromName: 'history_province_controller',
          toType: 'country_tags',
          toName: 'controller_country_tag',
        },
        {
          type: 'valueByPath',
          path: ['data', 'add_core'],
          fromName: 'history_province_add_core',
          toType: 'country_tags',
          toName: 'controller_country_tag',
        },
        {
          type: 'valueByPath',
          path: ['data', 'culture'],
          fromName: 'history_province_culture',
          toType: 'cultures',
          toName: 'culture',
        },
        {
          type: 'valueByPath',
          path: ['data', 'religion'],
          fromName: 'history_province_religion',
          toType: 'religions',
          toName: 'religion',
        },
        {
          type: 'valueByPath',
          path: ['data/*/+(controller|owner|add_core)'],
          fromName: 'history_province_future',
          toType: 'country_tags',
          toName: 'controller_country_tag',
        },
        {
          type: 'valueByPath',
          path: ['data', 'trade_goods'],
          fromName: 'history_province_trade_goods',
          toType: 'tradegoods',
          toName: 'tradegoods_province',
        },
      ],
    },
    {
      id: 'history_countries',
      title: 'History countries',
      reader: 'StructureLoader',
      primaryKey: 'tag',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'history/countries/',
        pathPattern: 'history/countries/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['data', 'data'],
        filenamePattern: '/([A-Z]+)\\s+-[^/]*\\.txt',
        filenamePatternKey: 'tag',
      },
      relations: [
        {
          type: 'valueByPath',
          path: ['data', 'government'],
          fromName: 'country_history_government',
          toType: 'governments',
          toName: 'government',
        },
        {
          type: 'valueByPath',
          path: ['data', 'religion'],
          fromName: 'country_history_religion',
          toType: 'religions',
          toName: 'religion',
        },
        {
          type: 'valueByPath',
          path: ['data', 'primary_culture'],
          fromName: 'country_history_culture',
          toType: 'cultures',
          toName: 'culture',
        },
        {
          type: 'valueByPath',
          path: ['data', 'capital'],
          fromName: 'country_capital',
          toType: 'map_provinces',
          toName: 'capital_province',
        },
        {
          type: 'valueByPath',
          path: ['data', 'fixed_capital'],
          fromName: 'country_fixed_capital',
          toType: 'map_provinces',
          toName: 'fixed_capital_province',
        },
        {
          type: 'valueByPath',
          path: ['data', 'technology_group'],
          fromName: 'country_technology_group',
          toType: 'technology_groups',
          toName: 'country_technology_group',
        },
      ],
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Tag',
            dataIndex: 'tag',
            linkTo: '[self]',
          },
          {
            name: 'Path',
            dataIndex: 'path',
          },
          {
            name: 'Government',
            dataIndex: ['data', 'government'],
          },
          {
            name: 'Tech group',
            dataIndex: ['data', 'technology_group'],
          },
          {
            name: 'Religion',
            dataIndex: ['data', 'religion'],
          },
          {
            name: 'Culture',
            dataIndex: ['data', 'primary_culture'],
          },
        ],
      },
    },
    {
      id: 'history_advisors',
      title: 'History advisors',
      reader: 'StructureLoader',
      primaryKey: 'advisor_id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'history/advisors/',
        pathPattern: 'history/advisors/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['advisor'],
        idPath: ['data', 'advisor_id'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'ID',
            dataIndex: 'id',
            linkTo: '[self]',
          },
          {
            name: 'Name',
            dataIndex: ['data', 'name'],
          },
          {
            name: 'Type',
            dataIndex: ['data', 'type'],
          },
          {
            name: 'Skill',
            dataIndex: ['data', 'skill'],
          },
          {
            name: 'Date',
            dataIndex: ['data', 'date'],
          },
        ],
      },
    },
    {
      id: 'history_diplomacy',
      title: 'History diplomacy',
      reader: 'StructureLoader',
      primaryKey: 'nr',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'history/diplomacy/',
        pathPattern: 'history/diplomacy/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['vassal', 'march', 'alliance', 'union', 'royal_marriage', 'dependency', 'guarantee'],
        idPath: [],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'NR',
            dataIndex: 'nr',
            linkTo: '[self]',
          },
          {
            name: 'Comments',
            dataIndex: ['comments'],
          },
          {
            name: 'Type',
            dataIndex: ['type'],
          },
          {
            name: 'From',
            dataIndex: ['data', 'first'],
          },
          {
            name: 'To',
            dataIndex: ['data', 'second'],
          },
          {
            name: 'Start',
            dataIndex: ['data', 'start_date'],
          },
          {
            name: 'End',
            dataIndex: ['data', 'end_date'],
          },
        ],
      },
    },
    {
      id: 'history_diplomacy_empires',
      title: 'History diplomacy empires',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'history/diplomacy/',
        pathPattern: 'history/diplomacy/+(celestial_empire|hre).txt',
      },
      sourceTransform: {
        type: 'fileData',
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
        ],
      },
    },
    {
      id: 'history_wars',
      title: 'History wars',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'history/wars/',
        pathPattern: 'history/wars/*.txt',
      },
      sourceTransform: {
        type: 'fileData',
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
            name: 'Name',
            dataIndex: ['data', 'name'],
          },
        ],
      },
    },
    {
      id: 'customizable_localization',
      title: 'Customizable localization',
      category: 'Localization',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'customizable_localization/',
        pathPattern: 'customizable_localization/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        types: ['defined_text'],
        idPath: ['data', 'name'],
        path: ['data', 'children'],
        filenamePattern: '/([^/]+).txt',
        filenamePatternKey: 'category',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'id',
            linkTo: '[self]',
          },
          {
            name: 'Category',
            dataIndex: 'category',
          },
        ],
      },
    },
    {
      id: 'decisions',
      title: 'Decisions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'decisions/',
        pathPattern: 'decisions/*.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'country_decisions'],
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
            name: 'DLC',
            dataIndex: ['data', 'potential', 'has_dlc'],
          },
        ],
      },
    },
    {
      id: 'hints',
      title: 'Hints',
      category: 'User interface',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'hints/',
        pathPattern: 'hints/*.txt',
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
            name: 'Title',
            dataIndex: ['data', 'title'],
          },
        ],
      },
    },
    {
      id: 'missions',
      title: 'Missions',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'missions/',
        pathPattern: 'missions/*.txt',
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
            name: 'Type',
            dataIndex: ['data', 'type'],
          },
          {
            name: 'Category',
            dataIndex: ['data', 'category'],
          },
        ],
      },
    },
    {
      id: 'music_files',
      title: 'Music files',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'music/',
        pathPattern: 'music/*.ogg',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['info'],
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
      id: 'music',
      title: 'Music',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'music/',
        pathPattern: 'music/*.asset',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['music'],
        idPath: ['data', 'name'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'id',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'music_songs',
      title: 'Music songs',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'music/',
        pathPattern: 'music/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['song'],
        idPath: ['data', 'name'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'id',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'sound_files',
      title: 'Sound files',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'sound/',
        pathPattern: 'sound/**.wav',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['info'],
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
      id: 'sound',
      title: 'Sound',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'sound/',
        pathPattern: 'sound/*.asset',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['sound'],
        idPath: ['data', 'name'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'id',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'achievements',
      title: 'Achievements',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'common/achievements.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
        valueName: 'filePath',
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
      id: 'technology_groups',
      title: 'Technology groups',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'common/technology.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'groups'],
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
            name: 'Start level',
            dataIndex: ['data', 'start_level'],
          },
          {
            name: 'Start cost modifier',
            dataIndex: ['data', 'start_cost_modifier'],
          },
        ],
      },
    },
    {
      id: 'technology_tables',
      title: 'Technology tables',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'common/technology.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'tables'],
        keyName: 'name',
        valueName: 'filePath',
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
            name: 'File path',
            dataIndex: 'filePath',
          },
        ],
      },
    },
    {
      id: 'historial_lucky',
      title: 'Historical lucky countries',
      reader: 'StructureLoader',
      primaryKey: 'tag',
      sourceType: {
        id: 'pdx_scripts',
        path: 'common/historial_lucky.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'tag',
        valueName: 'data',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Tag',
            dataIndex: 'tag',
            linkTo: '[self]',
          },
          {
            name: 'Always',
            dataIndex: ['data', 'always'],
          },
        ],
      },
    },
    {
      id: 'alerts',
      title: 'Alerts',
      category: 'User interface',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'common/alerts.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'alerts'],
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
      id: 'alert_sounds',
      title: 'Alert sounds',
      category: 'User interface',
      reader: 'StructureLoader',
      primaryKey: 'type',
      sourceType: {
        id: 'pdx_scripts',
        path: 'common/alerts.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'sound'],
        keyName: 'type',
        valueName: 'sound',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Type',
            dataIndex: 'type',
            linkTo: '[self]',
          },
          {
            name: 'Sound',
            dataIndex: 'sound',
          },
        ],
      },
    },
    {
      id: 'alert_icons',
      title: 'Alert icons',
      category: 'User interface',
      reader: 'StructureLoader',
      primaryKey: 'type',
      sourceType: {
        id: 'pdx_scripts',
        path: 'common/alerts.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data', 'icon'],
        keyName: 'type',
        valueName: 'icon',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Type',
            dataIndex: 'type',
            linkTo: '[self]',
          },
          {
            name: 'Icon',
            dataIndex: 'icon',
          },
        ],
      },
    },
    {
      id: 'graphicalculturetypes',
      title: 'Graphical culture types',
      category: 'User interface',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdx_scripts',
        path: 'common/graphicalculturetype.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'name',
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
      id: 'defines',
      title: 'Defines',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'lua_scripts',
        path: 'common/defines.lua',
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
      id: 'dlcs',
      title: 'DLCs',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'dlc/',
        pathPattern: 'dlc/*.dlc',
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
            name: 'Name',
            dataIndex: ['data', 'name'],
          },
          {
            name: 'Affects compatibility',
            dataIndex: ['data', 'affects_compatability'],
          },
        ],
      },
    },
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
            dataIndex: ['data', 'wind_direction'],
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
        pathPrefix: 'map/random/tiles',
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
      id: 'localisation_languages',
      title: 'Localization languages',
      category: 'Localization',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdxyml_files',
        path: 'localisation/languages.yml',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data'],
        keyName: 'name',
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
      id: 'localisation',
      title: 'Localizations',
      category: 'Localization',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdxyml_files',
        pathPrefix: 'localisation/',
        pathPattern: 'localisation/*l_french.yml',
      },
      sourceTransform: {
        type: 'keyKeyValues',
        path: ['data'],
        keyName: 'name',
        parentKeyName: 'language',
        parentRelationType: 'localisation_languages',
        relationsStorage: 'localisation_relations',
        valueName: 'data',
        customFields: {
          id: {
            type: 'concat',
            fields: ['language', 'name'],
          },
        },
        saveChunkSize: 10000,
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
            linkKey: 'id',
          },
          {
            name: 'Language',
            dataIndex: 'language',
          },
          {
            name: 'Translation',
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
      id: 'indexed_bmps',
      title: 'Indexed BMPs',
      category: 'Raw data',
      reader: 'IndexedBmpParser',
      primaryKey: 'path',
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
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
