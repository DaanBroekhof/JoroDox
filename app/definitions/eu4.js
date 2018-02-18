import React from 'react';
import filesize from 'filesize';

export default {
    name: 'Europe Universalis 4',
    types: [
        {
            id: 'files',
            title: 'Files & Directories',
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
                        renderer: ({ column, value, row }) => (
                            <span>{(row.info.type === "file" ? filesize(value) : "")}</span>
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
            id: 'pdx_meshes',
            title: '3D Models',
            reader: 'StructureLoader',
            primaryKey: 'path',
            sourceType: {
                id: 'pdx_data',
                format: 'pdx_data',
                pathPrefix: '',
                pathPattern: '**/*.mesh',
            },
            sourceTransform: {
                type: 'fileData',
                path: ['data', 'data'],
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
                dataPath: ['data'],
                relationsFromName: 'country',
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
                    dataPath: ['data', 'primary'],
                    fromName: 'culturePrimaryTag',
                    toType: 'countryTags',
                    toName: 'primaryCountryTag',
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
                dataPath: ['data', 'bookmark'],
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
                    dataPath: ['data', 'country'],
                    fromName: 'bookmark',
                    toType: 'countryTags',
                    toName: 'countryTag',
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
                        dataIndex: 'region',
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
                valueName: 'data',
                parentRelationType: 'religionGroups',
                parentRelationKey: 'parentReligionGroup',
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
                dataPath: ['data'],
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
                dataPath: ['data'],
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
                    dataPath: ['data', 'trigger', 'government'],
                    fromName: 'governmentNameTrigger',
                    toType: 'governments',
                    toName: 'governments',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'trigger', 'tag'],
                    fromName: 'governmentNameTrigger',
                    toType: 'countryTags',
                    toName: 'countryTags',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'trigger', 'primary_culture'],
                    fromName: 'governmentNameTrigger',
                    toType: 'cultures',
                    toName: 'cultures',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'trigger', 'culture_group'],
                    fromName: 'governmentNameTrigger',
                    toType: 'cultureGroups',
                    toName: 'cultureGroups',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'trigger', 'religion_group'],
                    fromName: 'governmentNameTrigger',
                    toType: 'religionGroups',
                    toName: 'religionGroups',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'trigger', 'religion'],
                    fromName: 'governmentNameTrigger',
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
                    dataPath: ['data', 'trigger', 'tag'],
                    fromName: 'ideaCountryTag',
                    toType: 'countryTags',
                    toName: 'countryTags',
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
                type: 'namespacedTypes',
                path: ['data', 'children'],
                types: ['country_event', 'province_event'],
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
                        name: 'Namespace',
                        dataIndex: ['namespace', 'namespace'],
                    },
                    {
                        name: 'Type',
                        dataIndex: ['type'],
                    },
                    {
                        name: 'MTT',
                        dataIndex: ['data', 'mean_time_to_happen', 'months'],
                    },
                    {
                        name: 'Triggered Only',
                        dataIndex: ['data', 'is_triggered_only'],
                    },
                    {
                        name: 'Comments',
                        dataIndex: ['comments'],
                    },
                ],
            },
        },
        {
            id: 'history_provinces',
            title: 'History provinces',
            reader: 'StructureLoader',
            primaryKey: 'provinceId',
            sourceType: {
                id: 'pdx_scripts',
                pathPrefix: 'history/provinces/',
                pathPattern: 'history/provinces/*.txt',
            },
            sourceTransform: {
                type: 'fileData',
                dataPath: ['data'],
                filenamePattern: '/([0-9]+)[^0-9][^/]*\.txt',
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
                    dataPath: ['data', 'owner'],
                    fromName: 'province_history_owner',
                    toType: 'country_tags',
                    toName: 'owner_country_tag',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'controller'],
                    fromName: 'province_history_controller',
                    toType: 'country_tags',
                    toName: 'controller_country_tag',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'add_core'],
                    fromName: 'province_history_add_core',
                    toType: 'country_tags',
                    toName: 'controller_country_tag',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'culture'],
                    fromName: 'province_history_culture',
                    toType: 'cultures',
                    toName: 'culture',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'religion'],
                    fromName: 'province_history_religion',
                    toType: 'religions',
                    toName: 'religion',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data/*/+(controller|owner|add_core)'],
                    fromName: 'province_history_future',
                    toType: 'country_tags',
                    toName: 'controller_country_tag',
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
                dataPath: ['data'],
                filenamePattern: '/([A-Z]+) \-[^/]*\.txt',
                filenamePatternKey: 'tag',
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
            relations: [
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'government'],
                    fromName: 'country_history_government',
                    toType: 'governments',
                    toName: 'government',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'religion'],
                    fromName: 'country_history_religion',
                    toType: 'religions',
                    toName: 'religion',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'primary_culture'],
                    fromName: 'country_history_culture',
                    toType: 'cultures',
                    toName: 'culture',
                },
            ],
        },
    ],
};