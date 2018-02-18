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
            id: 'cultureGroups',
            title: 'Culture groups',
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
                        linkTo: 'cultureGroups',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/cultures/',
                pathPattern: 'common/cultures/*.txt',
            },
            sourceTransform: {
                type: 'keyKeyValues',
                path: ['data', 'data'],
                requiredProperty: 'primary',
                keyName: 'name',
                valueName: 'data',
                parentRelationType: 'cultureGroups',
                parentRelationKey: 'parentCultureGroup',
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
            id: 'religionGroups',
            title: 'Religion groups',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
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
                        linkTo: 'religionGroups',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/religions/',
                pathPattern: 'common/religions/*.txt',
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
                        linkTo: 'religions',
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
            id: 'customIdeas',
            title: 'Custom ideas',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/custom_ideas/',
                pathPattern: 'common/custom_ideas/*.txt',
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
                        linkTo: 'customIdeas',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/decrees/',
                pathPattern: 'common/decrees/*.txt',
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
                        linkTo: 'decrees',
                    },
                    {
                        name: 'Cost',
                        dataIndex: ['data', 'cost'],
                    },
                ],
            },
        },
        {
            id: 'diplomaticActions',
            title: 'Diplomatic actions',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/diplomatic_actions/',
                pathPattern: 'common/diplomatic_actions/*.txt',
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
                        linkTo: 'diplomaticActions',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/disasters/',
                pathPattern: 'common/disasters/*.txt',
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
                        linkTo: 'disasters',
                    },
                ],
            },
        },
        {
            id: 'dynastyColors',
            title: 'Dynasty Colors',
            reader: 'StructureLoader',
            primaryKey: 'path',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/dynasty_colors/',
                pathPattern: 'common/dynasty_colors/*.txt',
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
                        linkTo: 'dynastyColors',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/estates/',
                pathPattern: 'common/estates/*.txt',
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
                        linkTo: 'estates',
                    },
                ],
            },
        },
        {
            id: 'eventModifiers',
            title: 'Event modifiers',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/event_modifiers/',
                pathPattern: 'common/event_modifiers/*.txt',
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
                        linkTo: 'eventModifiers',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/factions/',
                pathPattern: 'common/factions/*.txt',
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
                        linkTo: 'factions',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/fervor/',
                pathPattern: 'common/fervor/*.txt',
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
                        linkTo: 'fervor',
                    },
                    {
                        name: 'Cost',
                        dataIndex: ['data', 'cost'],
                    },
                ],
            },
        },
        {
            id: 'fetishistCults',
            title: 'Fetishist cults',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/fetishist_cults/',
                pathPattern: 'common/fetishist_cults/*.txt',
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
                        linkTo: 'fetishistCults',
                    },
                ],
            },
        },
        {
            id: 'governmentNames',
            title: 'Government names',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/government_names/',
                pathPattern: 'common/government_names/*.txt',
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
                        linkTo: 'governmentNames',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/governments/',
                pathPattern: 'common/governments/*.txt',
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
                        linkTo: 'governments',
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
            id: 'greatProjects',
            title: 'Great projects',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/great_projects/',
                pathPattern: 'common/great_projects/*.txt',
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
                        linkTo: 'greatProjects',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/ideas/',
                pathPattern: 'common/ideas/*.txt',
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
                        linkTo: 'ideas',
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
            id: 'imperialReforms',
            title: 'Imperial reforms',
            reader: 'StructureLoader',
            primaryKey: 'name',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/imperial_reforms/',
                pathPattern: 'common/imperial_reforms/*.txt',
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
                        linkTo: 'imperialReforms',
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
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/incidents/',
                pathPattern: 'common/incidents/*.txt',
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
                        linkTo: 'incidents',
                    },
                    {
                        name: 'Frame',
                        dataIndex: ['data', 'frame'],
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
                id: 'pdxScripts',
                format: 'pdxScript',
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
                        linkTo: 'events',
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
            id: 'provinceHistory',
            title: 'Province history',
            reader: 'StructureLoader',
            primaryKey: 'provinceId',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'history/provinces/',
                pathPattern: 'history/provinces/*.txt',
            },
            sourceTransform: {
                type: 'fileData',
                dataPath: ['data'],
                filenamePattern: '/([0-9]+)[^0-9][^/]*\.txt',
                filenamePatternKey: 'provinceId',
            },
            listView: {
                pageSize: 100,
                columns: [
                    {
                        name: 'Province',
                        dataIndex: 'provinceId',
                        linkTo: 'provinceHistory',
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
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'add_core'],
                    fromName: 'provinceHistoryAddCore',
                    toType: 'countryTags',
                    toName: 'controllerCountryTag',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'culture'],
                    fromName: 'provinceHistoryCulture',
                    toType: 'cultures',
                    toName: 'culture',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'religion'],
                    fromName: 'provinceHistoryReligion',
                    toType: 'religions',
                    toName: 'religion',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data/*/+(controller|owner|add_core)'],
                    fromName: 'provinceHistoryFuture',
                    toType: 'countryTags',
                    toName: 'controllerCountryTag',
                },
            ],
        },
        {
            id: 'countryHistory',
            title: 'Country history',
            reader: 'StructureLoader',
            primaryKey: 'tag',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
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
                        linkTo: 'countryHistory',
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
                    fromName: 'countryHistoryGovernment',
                    toType: 'governments',
                    toName: 'government',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'religion'],
                    fromName: 'countryHistoryReligion',
                    toType: 'religions',
                    toName: 'religion',
                },
                {
                    type: 'valueByPath',
                    dataPath: ['data', 'primary_culture'],
                    fromName: 'countryHistoryCulture',
                    toType: 'cultures',
                    toName: 'culture',
                },
            ],
        },
    ],
};