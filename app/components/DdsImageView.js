// @flow
import React, {Component} from 'react';
import * as THREE from 'three';
import ThreeJS from '../utils/ThreeJS';

const OrbitControls = require('../utils/threejs/OrbitControls')(THREE);

export default class DdsImageView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      width: null,
      height: null,
    };

    this.rotation = 0;
  }

  componentDidMount() {
    this.createScene();
  }

  componentDidUpdate() {
    this.createScene();
  }

  createScene() {
    if (this.hasRendered) {
      return;
    }

    this.hasRendered = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
    this.camera.up = new THREE.Vector3(0, 1, 0);
    this.camera.position.x = 0;
    this.camera.position.y = 75;
    this.camera.position.z = 0;

    const c = new OrbitControls(this.camera, this.canvas);
    c.enableRotate = false;
    c.mouseButtons = {ORBIT: THREE.MOUSE.RIGHT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.LEFT};
    c.target = new THREE.Vector3(0, 0);
    c.update();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    // General lights
    this.scene.add(new THREE.AmbientLight(0xcccccc));

    // Image material
    this.imageMaterial = new THREE.MeshBasicMaterial();
    this.imageMaterial.map = ThreeJS.loadDdsToTexture(this.props.file.path);
    this.imageMaterial.map.minFilter = THREE.LinearFilter;
    this.imageMaterial.map.fileName = '';
    this.imageMaterial.map.flipY = true;
    this.imageMaterial.side = THREE.DoubleSide;

    this.clock = new THREE.Clock();

    this.animateScene();
  }

  animateScene() {
    requestAnimationFrame(this.animateScene.bind(this));

    if (!this.imageMaterial.sizeAdjusted && this.imageMaterial.map.image && this.imageMaterial.map.image.width) {
      this.imageMaterial.sizeAdjusted = true;

      this.setState({
        width: this.imageMaterial.map.image.width,
        height: this.imageMaterial.map.image.height,
      });

      const quadGeometry = new THREE.PlaneGeometry(this.imageMaterial.map.image.width / 10, this.imageMaterial.map.image.height / 10);
      this.imagePlane = new THREE.Mesh(quadGeometry, this.imageMaterial);
      this.imagePlane.lookAt(new THREE.Vector3(0, 1, 0));
      if (this.props.flipY) {
        this.imagePlane.scale.y = -1; // This is to counteract the flipY that WebGL does on textures
      }
      this.scene.add(this.imagePlane);
    }

    this.renderer.render(this.scene, this.camera);
  }

  render() {
    return (
      <div style={{display: 'flex', flexDirection: 'column'}}>
        {this.state.width && <p>Dimensions: {this.state.width}x{this.state.height}</p>}

        <div style={{position: 'relative', display: 'inline-block'}}>
          <div style={{
            border: '1px solid #eee',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            flex: '',
            backgroundImage: 'linear-gradient(45deg, #EEEEEE 25%, transparent 25%), linear-gradient(-45deg, #EEEEEE 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #EEEEEE 75%), linear-gradient(-45deg, transparent 75%, #EEEEEE 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
          >
            <canvas ref={canvas => { this.canvas = canvas; }} style={{display: 'block', width: '100%', minHeight: 600, flexGrow: 1, cursor: 'move'}} />
          </div>
        </div>
      </div>
    );
  }
}
