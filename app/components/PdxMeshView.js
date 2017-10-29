// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
const path = require('electron').remote.require('path');
import PdxData from '../utils/PdxData';
import PdxDataView from "./PdxDataView";
import * as THREE from 'three';
import PdxMesh from '../utils/PdxMesh';
import {Button} from "material-ui";

export default class PdxMeshView extends Component {

    constructor(props) {
        super(props);

        this.state = {
            fileTreeData: this.parseFile(props.file.path)
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.file.path !== this.props.file.path) {
            this.setState({
                fileTreeData: this.parseFile(nextProps.file.path)
            });
        }
    }

    parseFile(path) {
        let parser = new PdxData();
        let data = parser.readFromBuffer(new Uint8Array(jetpack.read(path, 'buffer')).buffer);

        return data;
    }

    componentDidMount () {
        this.createScene();
    }

    componentDidUpdate() {
        this.createScene();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
        this.camera.position.set(10,10,0);
        this.camera.up = new THREE.Vector3(0,1,0);
        this.camera.lookAt(new THREE.Vector3(0,0,0));

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

        // Grid
        let size = 100, step = 1;
        let geometry = new THREE.Geometry();
        let material = new THREE.LineBasicMaterial( { color: 0x303030 } );
        for ( let i = - size; i <= size; i += step )
        {
            geometry.vertices.push( new THREE.Vector3( - size, - 0.04, i ) );
            geometry.vertices.push( new THREE.Vector3(   size, - 0.04, i ) );
            geometry.vertices.push( new THREE.Vector3( i, - 0.04, - size ) );
            geometry.vertices.push( new THREE.Vector3( i, - 0.04,   size ) );
        }
        let line = new THREE.Line( geometry, material, THREE.LinePieces );
        this.scene.add( line );

        // Some particle lights
        this.particleLight = new THREE.Mesh( new THREE.SphereGeometry( 4, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
        this.scene.add(this.particleLight);
        let pointLight = new THREE.PointLight( 0xffffff, 4 );
        this.particleLight.add( pointLight );

        // General lights
        this.scene.add( new THREE.AmbientLight( 0xcccccc ) );

        // Some directional lights
        let directionalLight = new THREE.DirectionalLight(0xeeeeee);
        directionalLight.position.x = Math.random() - 0.5;
        directionalLight.position.y = Math.random() - 0.5;
        directionalLight.position.z = Math.random() - 0.5;
        directionalLight.position.normalize();
        this.scene.add( directionalLight );

        this.objectScene = PdxMesh.convertToThreeJsScene(this.state.fileTreeData, path.resolve(this.props.file.path, '..'));
        this.scene.add(this.objectScene.object);

        this.viewConfig = {
            distance: 20,
            update: null,
            showSkeletons: true,
            showWireframes: false,
            showColliders: true,
            showMeshes: true,
            showSpotlights: true,
            rotate: true,
            rotation: 0,
        };
        this.clock = new THREE.Clock();

        this.animateScene();
    }

    animateScene()
    {
        requestAnimationFrame(this.animateScene.bind(this));

        // Rotate camera
        if (this.viewConfig.rotate) {
            let delta = this.clock.getDelta();
            this.viewConfig.rotation += delta * 0.5;

            this.camera.position.x = Math.cos(this.viewConfig.rotation) * this.viewConfig.distance;
            this.camera.position.y = this.viewConfig.distance / 4;
            this.camera.position.z = Math.sin(this.viewConfig.rotation) * this.viewConfig.distance;

            this.camera.lookAt(this.scene.position);
        }

        // Rotate particle lights
        let timer = Date.now() * 0.0005;
        this.particleLight.visible = this.viewConfig.showSpotlights;
        this.particleLight.position.x = Math.sin(timer * 4) * 30009;
        this.particleLight.position.y = Math.cos(timer * 5) * 40000;
        this.particleLight.position.z = Math.cos(timer * 4) * 30009;


        this.renderer.render(this.scene, this.camera);
    }

    render() {
        return (
            <div>
                <div>
                    <Button raised>Skeleton</Button>
                    <Button raised>Mesh</Button>
                    <Button raised>Colliders</Button>
                    <Button raised>Spotlights</Button>
                    <Button raised>+</Button>
                    <Button raised>-</Button>
                </div>
                <canvas ref={canvas => this.canvas = canvas} style={{width: 800, height: 600}} />
                <PdxDataView file={this.props.file} />
            </div>
        );
    }
}
