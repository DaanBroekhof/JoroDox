// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
const OperatingSystem = require('electron').remote.require('./utils/background/OperatingSystem');

import PdxScriptView from "./PdxScriptView";
import PdxDataView from "./PdxDataView";
import ImageView from "./ImageView";
import {Icon, IconButton, Paper, Tooltip, Typography} from "material-ui";
import filesize from 'filesize';
import PdxMeshView from "./PdxMeshView";
import ColladaView from "./ColladaView";
import _ from "lodash";
import DexieWorker from 'worker-loader!../utils/DexieWorker.js';

import WebworkerPromise from 'webworker-promise';
import Dexie from "dexie"
import FileLoaderTask from "../utils/tasks/FileLoaderTask";
import JdxDatabase from "../utils/JdxDatabase";
import PdxScriptParserTask from "../utils/tasks/PdxScriptParserTask";
import PdxDataParserTask from "../utils/tasks/PdxDataParserTask";

export default class StructureView extends Component {

    constructor(props) {
        super(props);

        this.state = {
            files: null,
            filesList: null,
            filesCount: null,
        };
    }

    clearStructure() {

        let db = JdxDatabase.get();

        db.files.clear().then(() => {
            this.setState({files: null});
        });
    }

    loadPdxScripts() {

        PdxScriptParserTask.start({root: this.props.root},
            (progress, total, message) => console.log('['+ progress +'/'+ total +'] '+ message),
            (result) => {
                console.log("done");
            },
            (error) => console.log(error)
        );
    }

    loadPdxData() {

        PdxDataParserTask.start({root: this.props.root},
            (progress, total, message) => console.log('['+ progress +'/'+ total +'] '+ message),
            (result) => {
                console.log("done");
            },
            (error) => console.log(error)
        );
    }

    reloadStructure() {

        let db = JdxDatabase.get();

        db.files.count(count => {
            console.log('current: '+ count);
            if (count === 0) {
                FileLoaderTask.start({root: this.props.root},
                    (progress, total, message) => console.log('['+ progress +'/'+ total +'] '+ message),
                    (result) => {
                        this.setState({files: db.files});
                        db.files.limit(10).toArray(res => this.setState({filesList: _(res)}));
                        db.files.count(count => this.setState({filesCount: count}));
                    },
                    (error) => console.log(error)
                );
            }
            else {
                this.setState({files: db.files});
                db.files.limit(10).toArray(res => {
                    this.setState({filesList: _(res)});
                });
                db.files.count(count => {
                    this.setState({filesCount: count})
                });
            }
        });
    }

    render() {

        return (
            <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
                <Typography type="display2" gutterBottom>Types
                    <span style={{marginLeft: 20}}>
                        <Tooltip id="tooltip-icon" title="Reload structure" placement="bottom">
                            <IconButton onClick={() => this.reloadStructure()}><Icon color="action">autorenew</Icon></IconButton>
                        </Tooltip>
                        <Tooltip id="tooltip-icon" title="Clear structure" placement="bottom">
                            <IconButton onClick={() => this.clearStructure()}><Icon color="action">delete</Icon></IconButton>
                        </Tooltip>
                        <Tooltip id="tooltip-icon" title="Load PDX scripts" placement="bottom">
                            <IconButton onClick={() => this.loadPdxScripts()}><Icon color="action">info</Icon></IconButton>
                        </Tooltip>
                        <Tooltip id="tooltip-icon" title="Load PDX data" placement="bottom">
                            <IconButton onClick={() => this.loadPdxData()}><Icon color="action">question</Icon></IconButton>
                        </Tooltip>
                        <Tooltip id="tooltip-icon" title="Open in operating system" placement="bottom">
                            <IconButton onClick={() => OperatingSystem.openItem(file.path)}><Icon color="action">open_in_new</Icon></IconButton>
                        </Tooltip>
                    </span>
                </Typography>
                {this.state.files !== null &&
                    <div>
                        <Typography type="caption">{this.props.root}</Typography>
                        <p>{this.state.filesList && (this.state.filesList.map(x => {
                            return x.name;
                        }).join(', '))}</p>
                        <i>{this.state.filesCount}</i>
                    </div>
                }

            </Paper>
        );
    }
}