// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
import PdxData from '../utils/PdxData';
import PdxDataView from "./PdxDataView";
import * as THREE from 'three';

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

    componentDidMount() {

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

        let geometry = new THREE.BoxGeometry(1, 1, 1);
        let material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);

        this.camera.position.z = 6;

        this.animateScene();
    }

    animateScene()
    {
        requestAnimationFrame(this.animateScene.bind(this));
        this.renderer.render(this.scene, this.camera);

        this.cube.rotation.x += 0.1;
        this.cube.rotation.y += 0.1;
    }

    render() {
        return (
            <div>
                <canvas ref={canvas => this.canvas = canvas} style={{width: 800, height: 600}} />
                <PdxDataView file={this.props.file} />
            </div>
        );
    }
}
