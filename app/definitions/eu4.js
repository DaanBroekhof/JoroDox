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
                        renderer: ({ column, value, row }) => (
                            <span style={(value === '_unknown_' ? {color: '#ccc'} : {})}>{row.info.type === "file" ? value : ''}</span>
                        ),
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
                    },
                    {
                        name: 'Culture',
                        dataIndex: ['data', 'data', 'graphical_culture'],
                    },
                ],
            },
        },
    ],
};