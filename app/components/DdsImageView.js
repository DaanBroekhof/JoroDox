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
    this.loadDdsFile();
  }

  componentDidUpdate() {
    this.loadDdsFile();
  }

  loadDdsFile() {
    if (this.loadingFile) {
      return;
    }
    this.loadingFile = true;

    const texture = ThreeJS.loadDdsToTexture(this.props.file.path);

    return texture.loadedPromise.then(() => {
      const newState = {
        width: texture.image.width,
        height: texture.image.height,
        viewWidth: texture.image.width,
        viewHeight: texture.image.height,
      };

      const widthScale = this.canvas.clientWidth / newState.width;
      const heightScale = 600 / newState.height;

      newState.viewWidth *= Math.min(1, widthScale, heightScale);
      newState.viewHeight *= Math.min(1, widthScale, heightScale);

      return this.setState(newState, () => this.createScene(texture));
    });
  }

  createScene(texture) {
    if (this.hasRendered) {
      return;
    }

    this.hasRendered = true;

    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.state.viewHeight + 20;

    console.log('mooo')

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(canvasWidth / -2, canvasWidth / 2, canvasHeight / 2, canvasHeight / -2, 0.1, 100);
    this.camera.up = new THREE.Vector3(0, 1, 0);
    this.camera.position.x = 0;
    this.camera.position.y = 10;
    this.camera.position.z = 0;

    const c = new OrbitControls(this.camera, this.canvas);
    c.enableRotate = false;
    c.mouseButtons = {ORBIT: THREE.MOUSE.RIGHT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.LEFT};
    c.target = new THREE.Vector3(0, 0);
    c.update();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
    });
    this.renderer.setSize(canvasWidth, canvasHeight);

    // General lights
    this.scene.add(new THREE.AmbientLight(0xcccccc));

    // Image material
    this.imageMaterial = new THREE.MeshBasicMaterial();
    this.imageMaterial.map = texture;
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

      const quadGeometry = new THREE.PlaneGeometry(this.state.viewWidth, this.state.viewHeight);
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
            <canvas ref={canvas => { this.canvas = canvas; }} style={{display: 'block', width: '100%', height: this.state.viewHeight + 20, flexGrow: 1, cursor: 'move'}} />
          </div>
        </div>
      </div>
    );
  }
}
