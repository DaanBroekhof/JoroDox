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
                    {
                        name: 'Data',
                        dataIndex: 'data',
                        moveable: true,
                        renderer: ({ column, value, row }) => (
                            <span>{_(value).size()}</span>
                        ),
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
                    {
                        name: 'Data',
                        dataIndex: 'data',
                        moveable: true,
                        renderer: ({ column, value, row }) => (
                            <span>{_(value).size()}</span>
                        ),
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
            transform: {
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
                    {
                        name: 'Data',
                        dataIndex: 'data',
                        moveable: true,
                        renderer: ({ column, value, row }) => (
                            <span>{_(value).size()}</span>
                        ),
                    },
                ],
            }
        },
        {
            id: 'countryTags',
            title: 'Country tags',
            reader: 'StructureLoader',
            primaryKey: 'id',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/country_tags/',
                pathPattern: 'common/country_tags/*.txt',
            },
            transform: {
                type: 'keyValues',
                path: ['data', 'data'],
                keyName: 'id',
                valueName: 'filePath',
                relationsFromName: 'countryTags',
                relationsToName: 'pdxScript',
            },
            listView: {
                pageSize: 100,
                columns: [
                    {
                        name: 'Id',
                        dataIndex: ['id'],
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
            primaryKey: 'id',
            sourceType: {
                id: 'pdxScripts',
                format: 'pdxScript',
                pathPrefix: 'common/countries/',
                pathPattern: 'common/countries/*.txt',
            },
            transform: {
                type: 'fileData',
                relationsFromName: 'country',
                relationsToName: 'pdxScript',
            },
            listView: {
                pageSize: 100,
                columns: [
                    {
                        name: 'Id',
                        dataIndex: ['id'],
                    },
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