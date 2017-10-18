// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
import PdxScriptView from "./PdxScriptView";
import ImageView from "./ImageView";
let filesize = require('filesize');

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
            case 'png':
            case 'jpg':
            case 'bmp':
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
            <div>
                <h2>{file.name}</h2>
                <p>Type: {fileType} {file.type === 'file' && <span>- Size: {filesize(file.size)}</span>}</p>
                {fileType === 'pdx-script' && <PdxScriptView file={file} />}
                {fileType === 'image' && <ImageView file={file} />}

            </div>
        );
    }
}
