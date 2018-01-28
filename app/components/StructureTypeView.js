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

export default class StructureTypeView extends Component {

    render() {

        if (!this.props.match.params.path) {
            return <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Error during type view load.</p></Paper>;
        }

        let file = jetpack.inspect(this.props.match.params.path, {times: true});

        if (!file) {
            return <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>File could not be found</p></Paper>;
        }

        file.path = this.props.match.params.path;
        let fileType = FileView.getFileType(file);

        return (
            <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
                <Typography type="display2" gutterBottom>{file.name}
                    <span style={{marginLeft: 20}}>
                        <Tooltip id="tooltip-icon" title="Show in file explorer" placement="bottom">
                            <IconButton onClick={() => OperatingSystem.showItemInFolder(file.path)}><Icon color="action">pageview</Icon></IconButton>
                        </Tooltip>
                        <Tooltip id="tooltip-icon" title="Open in operating system" placement="bottom">
                            <IconButton onClick={() => OperatingSystem.openItem(file.path)}><Icon color="action">open_in_new</Icon></IconButton>
                        </Tooltip>
                    </span>
                </Typography>
                <Typography type="caption">{file.path}</Typography>
                <p>Type: {fileType} {file.type === 'file' && <span>- Size: {filesize(file.size)}</span>}</p>
                {fileType === 'pdx-script' && <PdxScriptView file={file} />}
                {fileType === 'pdx-data' && <PdxDataView file={file} />}
                {fileType === 'pdx-mesh' && <PdxMeshView file={file} />}
                {fileType === 'collada' && <ColladaView file={file} />}
                {fileType === 'image' && <ImageView file={file} />}

            </Paper>
        );
    }
}