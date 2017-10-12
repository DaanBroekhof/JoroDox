// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
import PdxScriptView from "./PdxScriptView";
let filesize = require('filesize');

export default class FileView extends Component {
    static getFileType(file) {
        let extension = file.name.match(/\.([^.]+)$/);

        switch (extension ? extension[1] : null) {
            case 'asset': return 'pdx-script';
            case 'txt': return 'pdx-script';
            default : return null;
        }
    }

    render() {
        let file = jetpack.inspect(this.props.match.params.path);
        file.path = this.props.match.params.path;
        let fileType = FileView.getFileType(file);

        return (
            <div>
                <h2>{file.name}</h2>
                {file.type === 'file' && <p>Size: {filesize(file.size)}</p>}
                {fileType === 'pdx-script' && <PdxScriptView file={file} />}
            </div>
        );
    }
}
