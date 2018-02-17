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
                        linkTo: 'files',
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
            id: 'pdxScripts',
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
                        linkTo: 'pdxScripts',
                    },
                ],
            }
        },
        {
            id: 'pdxData',
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
                        linkTo: 'pdxData',
                    },
                ],
            }
        },
        {
            id: 'pdxMeshes',
            title: '3D Models',
            reader: 'StructureLoader',
            primaryKey: 'path',
            sourceType: {
                id: 'pdxData',
                format: 'pdxData',
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
                        linkTo: 'pdxMeshes',
                    },
                ],
            }
        },
        {
            id: 'countryTags',
            title: 'Country tags',
            reader: 'StructureLoader',
            primaryKey: 'tag',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/country_tags/',
                pathPattern: 'common/country_tags/*.txt',
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
                        linkTo: 'countryTags',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/countries/',
                pathPattern: 'common/countries/*.txt',
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
                        linkTo: 'countries',
                    },
                    {
                        name: 'Culture',
                        dataIndex: ['data', 'graphical_culture'],
                    },
                ],
            },
        },
        {
            id: 'countryColors',
            title: 'Country colors',
            reader: 'StructureLoader',
            primaryKey: 'tag',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/country_colors/',
                pathPattern: 'common/country_colors/*.txt',
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
                        linkTo: 'countryColors',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/ages/',
                pathPattern: 'common/ages/*.txt',
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
                        linkTo: 'ages',
                    },
                    {
                        name: 'Start',
                        dataIndex: ['data', 'start'],
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
                id: 'pdxScripts',
                format: 'pdxScript',
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
                        linkTo: 'cultures',
                    },
                    {
                        name: 'Start',
                        dataIndex: ['data', 'start'],
                    },
                ],
            },
        },
        {
            id: 'advisortypes',
            title: 'Advisor types',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/advisortypes/',
                pathPattern: 'common/advisortypes/*.txt',
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
                        linkTo: 'advisortypes',
                    },
                    {
                        name: 'Monarch power',
                        dataIndex: ['data', 'monarch_power'],
                    },
                ],
            },
        },
        {
            id: 'aiPersonalities',
            title: 'IA personalities',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/ai_personalities/',
                pathPattern: 'common/ai_personalities/*.txt',
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
                        linkTo: 'aiPersonalities',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/bookmarks/',
                pathPattern: 'common/bookmarks/*.txt',
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
                        linkTo: 'bookmarks',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/buildings/',
                pathPattern: 'common/buildings/*.txt',
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
                        linkTo: 'buildings',
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
            id: 'cbTypes',
            title: 'CB types',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/cb_types/',
                pathPattern: 'common/cb_types/*.txt',
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
                        linkTo: 'cbTypes',
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
            id: 'churchAspects',
            title: 'Church Aspects',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/church_aspects/',
                pathPattern: 'common/church_aspects/*.txt',
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
                        linkTo: 'churchAspects',
                    },
                ],
            },
        },
        {
            id: 'clientStates',
            title: 'Client states',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/client_states/',
                pathPattern: 'common/client_states/*.txt',
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
                        linkTo: 'clientStates',
                    },
                    {
                        name: 'Region',
                        dataIndex: 'region',
                    },
                ],
            },
        },
        {
            id: 'colonialRegions',
            title: 'Colonial regions',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/colonial_regions/',
                pathPattern: 'common/colonial_regions/*.txt',
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
                        linkTo: 'colonialRegions',
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
            id: 'customCountryColors',
            title: 'Custom country colors',
            reader: 'StructureLoader',
            primaryKey: 'path',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/custom_country_colors/',
                pathPattern: 'common/custom_country_colors/*.txt',
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
                        linkTo: 'customCountryColors',
                    },

                ],
            },
        },
        {
            id: 'provinceHistory',
            title: 'Province history',
            reader: 'StructureLoader',
            primaryKey: 'path',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'history/provinces/',
                pathPattern: 'history/provinces/*.txt',
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
                        linkTo: 'provinceHistory',
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
                    fromName: 'provinceHistoryOwner',
                    toType: 'countryTags',
                    toName: 'ownerCountryTag',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'controller'],
                    fromName: 'provinceHistoryController',
                    toType: 'countryTags',
                    toName: 'controllerCountryTag',
                },
            ],
        },
    ],
};