import React, { Component } from 'react';
import filesize from 'filesize';

export default {
    name: 'Europe Universalis 4',
    types: [
        {
            id: 'files',
            title: 'Files',
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
            title: 'PDX scripts',
            reader: 'PdxScriptParser',
            primaryKey: 'path',
            listView: {
                pageSize: 50,
                columns: [
                    {
                        name: 'Path',
                        dataIndex: ['path'],
                        width: '75%',
                    },
                ],
            }
        },
        {
            id: 'pdxData',
            title: 'PDX data assets',
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
            title: 'PDX Mesh Assets',
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
                relationsFromName: 'pdxMesh',
                relationsToName: 'pdxData',
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
                relationsFromName: 'countryTags',
                relationsToName: 'pdxScript',
            },
            relations: [
                {
                    type: 'byPath',
                    pathPrefix: 'common/',
                    property: 'filePath',
                    targetType: 'countries',
                    fromName: 'tag',
                    toName: 'country',
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
                relationsToName: 'pdxScript',
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
                relationsFromName: 'countryTags',
                relationsToName: 'pdxScript',
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
                relationsFromName: 'ages',
                relationsToName: 'pdxScript',
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
                relationsFromName: 'cultures',
                relationsToName: 'pdxScript',
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
                relationsFromName: 'advisortypes',
                relationsToName: 'pdxScript',
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
                relationsFromName: 'aiPersonalities',
                relationsToName: 'pdxScript',
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
    ],
};