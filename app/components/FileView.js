// @flow
import React, {Component} from 'react';

const jetpack = require('electron').remote.require('fs-jetpack');

import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';

import PdxScriptView from './PdxScriptView';
import PdxDataView from './PdxDataView';
import ImageView from './ImageView';
import {Icon, IconButton, Paper, Tooltip, Typography} from 'material-ui';
import filesize from 'filesize';
import PdxMeshView from './PdxMeshView';
import ColladaView from './ColladaView';

export default class FileView extends Component {
  static getFileType(file) {
    if (!file) { return 'directory'; }

    if (file.type === 'dir') { return 'directory'; }
    const extension = file.name.match(/\.([^.]+)$/);

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
      case 'dae':
        return 'collada';
      default:
        return 'unknown';
    }
  }

  render() {
    if (!this.props.match.params.path) {
      return (<Paper style={{
 flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'
}}
      ><p>Error during file load.</p>
              </Paper>);
    }

    const file = jetpack.inspect(this.props.match.params.path, {times: true});

    if (!file) {
      return (<Paper style={{
 flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'
}}
      ><p>File could not be found</p>
      </Paper>);
    }

    file.path = this.props.match.params.path;
    const fileType = FileView.getFileType(file);

    return (
      <Paper style={{
 flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'
}}
      >
        <div style={{display: 'flex'}}>
          <Typography variant="display2" gutterBottom>{file.name}</Typography>
          <span style={{marginLeft: 20}}>
            <Tooltip id="tooltip-icon" title="Show in file explorer" placement="bottom">
              <IconButton onClick={() => OperatingSystemTask.start({showItemInFolder: file.path})}><Icon color="action">pageview</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Open in operating system" placement="bottom">
              <IconButton onClick={() => OperatingSystemTask.start({openItem: file.path})}><Icon color="action">open_in_new</Icon></IconButton>
            </Tooltip>
          </span>
        </div>
        <Typography variant="caption">{file.path}</Typography>
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
