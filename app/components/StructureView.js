// @flow
import React, { Component } from 'react';

import {Button, Icon, IconButton, Paper, Tooltip, Typography} from "material-ui";
import _ from "lodash";

import FileLoaderTask from "../utils/tasks/FileLoaderTask";
import JdxDatabase from "../utils/JdxDatabase";
import PdxScriptParserTask from "../utils/tasks/PdxScriptParserTask";
import PdxDataParserTask from "../utils/tasks/PdxDataParserTask";
import StructureLoaderTask from "../utils/tasks/StructureLoaderTask";
import Eu4Definition from "../definitions/eu4";
import {Grid} from "react-redux-grid";
import {Link} from "react-router-dom";

export default class StructureView extends Component {

    constructor(props) {
        super(props);

        this.state = {
            files: null,
            filesList: null,
            filesCount: null,
            typeCounts: {},
        };
    }

    reloadType(typeId) {
        let type = _(Eu4Definition.types).find(x => x.id === typeId);
        if (!type) {
            return;
        }

        if (type.reader === 'FileLoader') {
            this.reloadStructure();
        }
        else if (type.reader === 'PdxScriptParser') {
            this.loadPdxScripts();
        }
        else if (type.reader === 'PdxDataParser') {
            this.loadPdxData();
        }
        else if (type.reader === 'StructureLoader') {
            this.loadStructureData(typeId);
        }
    }

    loadStructureData(typeId) {

        _(Eu4Definition.types).forEach(type => {
            if (type.sourceType && (!typeId || type.id === typeId)) {
                StructureLoaderTask.start({root: this.props.root, typeDefinition: type},
                    (progress, total, message) => console.log('[' + progress + '/' + total + '] ' + message),
                    (result) => console.log("done"),
                    (error) => console.log(error),
                );
            }
        })
    }


    loadPdxScripts() {

        PdxScriptParserTask.start({root: this.props.root, definition: Eu4Definition},
            (progress, total, message) => console.log('['+ progress +'/'+ total +'] '+ message),
            (result) => console.log("done"),
            (error) => console.log(error),
        );
    }

    loadPdxData() {

        PdxDataParserTask.start({root: this.props.root, definition: Eu4Definition},
            (progress, total, message) => console.log('['+ progress +'/'+ total +'] '+ message),
            (result) => console.log("done"),
            (error) => console.log(error),
        );
    }

    reloadStructure() {
        JdxDatabase.reloadAll(this.props.root);
        /*

        JdxDatabase.get(this.props.root).then(db => {
            db.relations.clear().then(() => {
                FileLoaderTask.start(
                    {root: this.props.root, typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files')},
                    (progress, total, message) => console.log('[' + progress + '/' + total + '] ' + message),
                    (result) => console.log("done"),
                    (error) => console.log(error),
                );
            });
        });
        */
    }

    reloadTypeById(typeId) {
        JdxDatabase.reloadTypeById(this.props.root, typeId).then(() => {
            console.log("done");
        });
    }

    render() {

        if (!this.loadingCounts) {
            JdxDatabase.get(this.props.root).then(db => {
                let typeIds = Eu4Definition.types.filter(type => db[type.id] && this.state.typeCounts[type.id] === undefined).map(x => x.id);
                let promises = typeIds.map(typeId => db[typeId].count());
                Promise.all(promises).then(counts => {
                    let typeCounts = {};
                    counts.forEach((value, key) => {
                        typeCounts[typeIds[key]] = value;
                    });
                    this.setState({typeCounts});
                    this.loadingCounts = false;
                });
            });
            this.loadingCounts = true;
        }

        let extendedTypes = Eu4Definition.types.map(type => {
            if (type.totalCount !== this.state.typeCounts[type.id]) {
                let typeCopy = Object.assign({}, type);
                typeCopy.totalCount = this.state.typeCounts[type.id];
                return typeCopy;
            }
            return type;
        });
        extendedTypes = _.sortBy(extendedTypes, x => x.title);

        let gridSettings = {
            height: false,
            columns: [
                {
                    name: 'Type',
                    dataIndex: ['title'],
                    renderer: ({ column, value, row }) => <Link to={`/structure/${row.id}`}>{value}</Link>,
                },
                {
                    name: 'Item count',
                    dataIndex: ['totalCount'],
                },
                {
                    name: 'Actions',
                    dataIndex: ['primaryKey'],
                    renderer: ({ column, value, row }) => (
                        <div style={{display: 'flex'}}>
                            <Button size="small" onClick={() => {this.reloadTypeById(row.id);}}>Reload</Button>
                        </div>
                    ),
                },
            ],
            plugins: {
                PAGER: {
                    enabled: false,
                    pagingType: 'local',
                    toolbarRenderer: (pageIndex, pageSize, total, currentRecords, recordType) => {
                        return `${pageIndex * pageSize} - ${pageIndex * pageSize + currentRecords} of ${total}`;
                    },
                    pagerComponent: false
                },
                COLUMN_MANAGER: {
                    resizable: true,
                    minColumnWidth: 10,
                    moveable: true,
                },
                LOADER: {
                    enabled: true
                },
            },
            data: extendedTypes,
            stateKey: "typeListALl",
            style: {
                display: 'flex',
                flexDirection: 'column',
            },
            events: {
                HANDLE_ROW_CLICK: ({row}) => {
                    //this.props.history.push('/structure/'+ typeDefinition.id +'/'+ row[typeDefinition.primaryKey]);
                },
            }
        };

        return (
            <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
                <Typography variant="display2" gutterBottom>Data types</Typography>

                <div style={{display: 'flex', flexDirection: 'row', marginBottom: 20}}>
                    <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadStructure()}>Load raw file data</Button><br />
                    <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadPdxScripts()}>Load PDX scripts</Button><br />
                    <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadPdxData()}>Load PDX data assets</Button><br />
                    <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadStructureData()}>Load game structures</Button><br />
                </div>

                <Grid {...gridSettings}></Grid>
            </Paper>
        );
    }
}