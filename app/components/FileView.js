// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
import PdxScriptView from "./PdxScriptView";
import PdxDataView from "./PdxDataView";
import ImageView from "./ImageView";
import {Paper, Typography} from "material-ui";
import filesize from 'filesize';
import PdxMeshView from "./PdxMeshView";

export default class FileView extends Component {
    static getFileType(file) {
        if (file.type === 'dir')
            return 'directory';
        let extension = file.name.match(/\.([^.]+)$/);

        switch (extension ? extension[1].toLowerCase() : null) {
            case 'asset':
            case 'gfx':
            case 'txt':
            case 'gui':
                return 'pdx-script';
            case 'mesh':
                return 'pdx-mesh';
            case 'anim':
                return 'pdx-data';
            case 'png':
            case 'jpg':
            case 'bmp':
            case 'tga':
                return 'image';
            default :
                return 'unknown';
        }
    }

    render() {
        let file = jetpack.inspect(this.props.match.params.path);
        file.path = this.props.match.params.path;
        let fileType = FileView.getFileType(file);

        return (
            <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
                <Typography type="display2" gutterBottom>{file.name}</Typography>
                <Typography type="caption">{file.path}</Typography>
                <p>Type: {fileType} {file.type === 'file' && <span>- Size: {filesize(file.size)}</span>}</p>
                {fileType === 'pdx-script' && <PdxScriptView file={file} />}
                {fileType === 'pdx-data' && <PdxDataView file={file} />}
                {fileType === 'pdx-mesh' && <PdxMeshView file={file} width={800} height={600} />}
                {fileType === 'image' && <ImageView file={file} />}

            </Paper>
        );
    }
}