// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
const path = require('electron').remote.require('path');
import PdxData from '../utils/PdxData';
import PdxDataView from "./PdxDataView";
import * as THREE from 'three';
import PdxMesh from '../utils/PdxMesh';
import {
    Button, Checkbox, FormControlLabel, FormGroup, Icon, IconButton, Table, TableBody, TableCell, TableHead,
    TableRow, Typography
} from "material-ui";
import DeleteIcon from 'material-ui-icons/Delete';
import ColladaData from "../utils/ColladaData";
import ThreeJsViewer from "./ThreeJsViewer";
import {withRouter} from "react-router";

export default withRouter(class ColladaView extends Component {

    constructor(props) {
        super(props);

        this.state = {
            objectScene: null,
        };

        (new ColladaData()).convertToThreeJsScene(jetpack.read(this.props.file.path), path.resolve(this.props.file.path, '..')).then((objectScene) => {
            this.setState({objectScene: objectScene});
        });
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.file.path !== this.props.file.path) {
            (new ColladaData()).convertToThreeJsScene(jetpack.read(nextProps.file.path), path.resolve(nextProps.file.path, '..')).then((objectScene) => {
                this.setState({objectScene: objectScene});
            });
        }
    }

    convertToPdxMesh() {
        return () => {
            let pdxMesh = new PdxMesh();
            let pdxData = pdxMesh.createFromThreeJsObject(this.state.objectScene.object);
            let data = (new PdxData).writeToBuffer(pdxData);
            let newFile = this.props.file.path.replace(/.dae/, '-copy.mesh');
            jetpack.writeAsync(newFile, new Buffer(data)).then(() => {
                this.props.history.push('/fileview/'+ newFile);
            });
        };
    }

    startAnimation(animation) {
        if (this.state.objectScene.animationMixer)
            this.state.objectScene.animationMixer.stopAllAction();

        // 'Reset' skeleton and start new animation (if set)
        let subSkinnedMeshes = [];
        this.state.objectScene.object.traverse(function (subObject) {
            if (subObject instanceof THREE.SkinnedMesh) {
                subSkinnedMeshes.push(subObject);
                subObject.pose();
            }
        });

        let mixer = new THREE.AnimationMixer(new THREE.AnimationObjectGroup(...subSkinnedMeshes));
        let action = mixer.clipAction(animation);
        action.play();
        this.state.objectScene.animationMixer = mixer;
    }

    stopAnimation(animation) {
        if (this.state.objectScene.animationMixer)
            this.state.objectScene.animationMixer.stopAllAction();

        this.state.objectScene.object.traverse(function (subObject) {
            if (subObject instanceof THREE.SkinnedMesh) {
                subObject.pose();
            }
        });
    }

    convertToPdxAnimation(animation) {

    }


    render() {

        let animations = [];
        if (this.state.objectScene && this.state.objectScene.animations) {
            for (let animation of this.state.objectScene.animations) {

                animations.push(
                    <TableRow key={animation.uuid}>
                        <TableCell><Checkbox
                            onChange={(event, checked) => checked ? this.startAnimation(animation) : this.stopAnimation()}/>{animation.name}
                        </TableCell>
                        <TableCell>{animation.fps}</TableCell>
                        <TableCell>{animation.tracks.length}</TableCell>
                        <TableCell>{animation.duration}</TableCell>
                    </TableRow>
                );
            }
        }

        return (
            <div>
                <div>
                    <Button raised onClick={this.convertToPdxMesh()}>Convert to .mesh</Button>
                </div>
                <ThreeJsViewer ref={(ref) => this.threeJsViewer = ref} objectScene={this.state.objectScene}/>
                <br />
                <Typography type="headline">Embedded animations</Typography>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>FPS</TableCell>
                            <TableCell>Tracks</TableCell>
                            <TableCell>Duration</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {animations}
                    </TableBody>
                </Table>
            </div>
        );
    }
});
