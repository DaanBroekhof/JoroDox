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

export default class StructureView extends Component {

    constructor(props) {
        super(props);

        this.state = {
            files: _([]),
        };
    }

    reloadStructure() {

        let db = new Dexie("StructureDB");
        db.version(1).stores({ files: "++name,file,type,data" });

        db.files.count(count => {
            console.log('current: '+ count);
            if (count === 0 || true) {
                FileLoaderTask.start({root: this.props.root},
                    (progress, total, message) => console.log('['+ progress +'/'+ total +'] '+ message),
                    (result) => console.log(result),
                    (error) => console.log(error)
                );
            }
            else {
                db.files.toArray(files => {
                    this.setState({files: _(files)});
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
                        <Tooltip id="tooltip-icon" title="Open in operating system" placement="bottom">
                            <IconButton onClick={() => OperatingSystem.openItem(file.path)}><Icon color="action">open_in_new</Icon></IconButton>
                        </Tooltip>
                    </span>
                </Typography>
                <Typography type="caption">{this.props.root}</Typography>
                <p>{this.state.files.slice(0, 10).map(x => {
                    return x.name;
                }).join(', ')}</p>
                <p>{this.state.files.size()}</p>

            </Paper>
        );
    }
}