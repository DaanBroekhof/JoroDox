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
const OrbitControls = require('../utils/threejs/OrbitControls')(THREE);

export default class ThreeJsViewer extends Component {

    constructor(props) {
        super(props);

        this.state = {
            distance: 20,
            cameraFocusHeight: 0,
            update: null,
            showSkeletons: true,
            showWireframes: false,
            showColliders: true,
            showMeshes: true,
            showSpotlights: true,
            rotate: false,
        };

        this.rotation = 0;
    }

    componentDidMount () {
        this.createScene();
    }

    componentDidUpdate() {
        this.createScene();
    }

    createScene() {
        if (this.props.objectScene === this.objectScene)
            return;

        this.objectScene = this.props.objectScene;
        let distance = (this.objectScene ? this.objectScene.distance * 4 : this.state.distance);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
        this.camera.up = new THREE.Vector3(0,1,0);
        this.camera.position.x = Math.cos(this.rotation) * distance;
        this.camera.position.y = distance / 4;
        this.camera.position.z = Math.sin(this.rotation) * distance;

        let c = new OrbitControls(this.camera, this.canvas);
        c.target = new THREE.Vector3(0, this.objectScene ? (this.objectScene.maxExtentHeight + this.state.cameraFocusHeight) / 2 : 0, 0);
        c.update();

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

        // Grid
        let size = 100, step = 1;
        let geometry = new THREE.Geometry();
        let material = new THREE.LineBasicMaterial({color: 0x303030});
        for (let i = - size; i <= size; i += step)
        {
            geometry.vertices.push(new THREE.Vector3( - size, - 0.04, i ));
            geometry.vertices.push(new THREE.Vector3(   size, - 0.04, i ));
            geometry.vertices.push(new THREE.Vector3( i, - 0.04, - size ));
            geometry.vertices.push(new THREE.Vector3( i, - 0.04,   size ));
        }
        let line = new THREE.Line(geometry, material, THREE.LineSegments);
        this.scene.add(line);

        // Some particle lights
        this.particleLight = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({color: 0xffffff }));
        this.scene.add(this.particleLight);
        let pointLight = new THREE.PointLight( 0xffffff, 4 );
        this.particleLight.add( pointLight );

        // General lights
        this.scene.add(new THREE.AmbientLight(0xcccccc ));

        // Some directional lights
        let directionalLight = new THREE.DirectionalLight(0xeeeeee);
        directionalLight.position.x = Math.random() - 0.5;
        directionalLight.position.y = Math.random() - 0.5;
        directionalLight.position.z = Math.random() - 0.5;
        directionalLight.position.normalize();
        this.scene.add( directionalLight );

        if (!this.objectScene)
            return;

        this.scene.add(this.objectScene.object);
        if (this.objectScene.skeletonHelper)
            this.scene.add(this.objectScene.skeletonHelper);
        this.setState({distance: this.objectScene.distance * 4});
        this.clock = new THREE.Clock();

        this.animateScene();
    }

    animateScene()
    {
        requestAnimationFrame(this.animateScene.bind(this));

        // Rotate camera
        let delta = this.clock.getDelta();
        if (this.state.rotate) {
            this.rotation += delta * 0.5;
            this.camera.position.x = Math.cos(this.rotation) * this.state.distance;
            this.camera.position.y = (this.state.distance + this.state.cameraFocusHeight) / 4;
            this.camera.position.z = Math.sin(this.rotation) * this.state.distance;
            this.camera.lookAt(new THREE.Vector3(0, this.objectScene ? (this.objectScene.maxExtentHeight + this.state.cameraFocusHeight) / 2 : 0, 0));
        }

        // Rotate particle lights
        let timer = Date.now() * 0.0005;
        this.particleLight.visible = this.state.showSpotlights;
        this.particleLight.position.x = Math.sin(timer * 4) * 30009;
        this.particleLight.position.y = Math.cos(timer * 5) * 40000;
        this.particleLight.position.z = Math.cos(timer * 4) * 30009;

        if (this.objectScene) {

            if (this.objectScene.skeletons) {
                for (let i = 0; i < this.objectScene.skeletons.length; i++) {
                    this.objectScene.skeletons[i].visible = this.state.showSkeletons;
                }
            }
            if (this.objectScene.wireframes) {
                for (let i = 0; i < this.objectScene.wireframes.length; i++) {
                    this.objectScene.wireframes[i].visible = this.state.showWireframes;
                }
            }
            if (this.objectScene.meshes) {
                for (let i = 0; i < this.objectScene.meshes.length; i++) {
                    this.objectScene.meshes[i].material.visible = this.state.showMeshes;
                }
            }
            if (this.objectScene.colliders) {
                for (let i = 0; i < this.objectScene.colliders.length; i++) {
                    this.objectScene.colliders[i].material.visible = this.state.showColliders;
                }
            }
        }

        if (this.objectScene.animationMixer)
            this.objectScene.animationMixer.update(delta);

        this.renderer.render(this.scene, this.camera);
    }

    toggleValue(name) {
        return (event, checked) => {
            this.setState({[name]: checked});
        }
    }

    render() {
        return (
            <div>
                <FormGroup row style={{alignItems: 'center'}}>
                    <FormControlLabel label="Skeletons" control={<Checkbox checked={this.state.showSkeletons} onChange={this.toggleValue('showSkeletons')} />} />
                    <FormControlLabel label="Mesh" control={<Checkbox checked={this.state.showMeshes} onChange={this.toggleValue('showMeshes')} />} />
                    <FormControlLabel label="Wireframes" control={<Checkbox checked={this.state.showWireframes} onChange={this.toggleValue('showWireframes')} />} />
                    <FormControlLabel label="Colliders" control={<Checkbox checked={this.state.showColliders} onChange={this.toggleValue('showColliders')} />} />
                    <FormControlLabel label="Spotlights" control={<Checkbox checked={this.state.showSpotlights} onChange={this.toggleValue('showSpotlights')} />} />

                    <FormControlLabel label="Rotate" control={<Checkbox defaultChecked={this.state.rotate} onChange={this.toggleValue('rotate')} />} />

                </FormGroup>

                <div style={{position: 'relative', display: 'inline-block'}}>
                    <canvas ref={canvas => this.canvas = canvas} style={{width: 900, height: 600}} />

                    <div style={{position: 'absolute', left: 10, top: 10, color: 'white', fontSize: '70%'}}>
                        Meshes: {this.props.objectScene ? this.props.objectScene.meshCount : '-'}<br />
                        Triangles: {this.props.objectScene ? this.props.objectScene.triangleCount : '-'}<br />
                        Bones: {this.props.objectScene ? this.props.objectScene.boneCount : '-'}<br />
                    </div>
                </div>
            </div>
        );
    }
}
