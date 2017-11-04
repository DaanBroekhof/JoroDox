// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
const path = require('electron').remote.require('path');
import PdxData from '../utils/PdxData';
import PdxDataView from "./PdxDataView";
import * as THREE from 'three';
import PdxMesh from '../utils/PdxMesh';
import {Button, Checkbox, FormControlLabel, FormGroup, Icon, IconButton} from "material-ui";
import DeleteIcon from 'material-ui-icons/Delete';
import ColladaData from "../utils/ColladaData";
import ThreeJsViewer from "./ThreeJsViewer";
import {withRouter} from "react-router";

export default withRouter(class PdxMeshView extends Component {

    constructor(props) {
        super(props);

        let fileTreeData = this.parseFile(props.file.path);

        this.state = {
            fileTreeData: fileTreeData,
            objectScene: PdxMesh.convertToThreeJsScene(fileTreeData, path.resolve(this.props.file.path, '..')),
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.file.path !== this.props.file.path) {
            let fileTreeData = this.parseFile(nextProps.file.path);
            this.setState({
                fileTreeData: fileTreeData,
                objectScene: PdxMesh.convertToThreeJsScene(fileTreeData, path.resolve(nextProps.file.path, '..')),
            });
        }
    }

    parseFile(path) {
        let parser = new PdxData();
        let data = parser.readFromBuffer(new Uint8Array(jetpack.read(path, 'buffer')).buffer);

        return data;
    }

    convertToCollada() {
        return () => {
            let colladaData = new ColladaData();
            let data = colladaData.createFromThreeJsObject(this.state.objectScene);
            let newFile = this.props.file.path.replace(/.mesh$/, '.dae');
            jetpack.writeAsync(newFile, data).then(() => {
                this.props.history.push('/fileview/'+ newFile);
            });
        };
    }

    render() {
        return (
            <div>
                <div>
                    <Button raised onClick={this.convertToCollada()}>Convert to Collada (.dae)</Button>
                </div>

                <ThreeJsViewer ref={(ref) => this.threeJsViewer = ref} objectScene={this.state.objectScene}/>

                <PdxDataView file={this.props.file} style={{maxHeight: 800}} />
            </div>
        );
    }
})
