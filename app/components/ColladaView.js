// @flow
import * as THREE from 'three';
import {withRouter} from 'react-router';
import React, {Component} from 'react';
import {Button, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, Typography} from 'material-ui';
import PdxData from '../utils/PdxData';
import PdxMesh from '../utils/PdxMesh';
import ColladaData from '../utils/ColladaData';
import ThreeJsViewer from './ThreeJsViewer';

const jetpack = require('electron').remote.require('fs-jetpack');
const path = require('electron').remote.require('path');

type Props = {
  file: object,
  history: object
};
type State = {
  objectScene: object
};

export default withRouter(class ColladaView extends Component<Props, State> {
  constructor(props) {
    super(props);

    this.threeJsViewer = null;

    this.state = {
      objectScene: null,
    };

    try {
      (new ColladaData()).convertToThreeJsScene(jetpack.read(this.props.file.path), path.resolve(this.props.file.path, '..')).then((objectScene) => {
        return this.setState({objectScene});
      }).catch((e) => console.log(e));
    } catch (e) {
      console.log(e);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.file.path !== this.props.file.path) {
      try {
        return (new ColladaData()).convertToThreeJsScene(jetpack.read(nextProps.file.path), path.resolve(nextProps.file.path, '..')).then((objectScene) => {
          return this.setState({objectScene});
        });
      } catch (e) {
        console.log(e);
      }
    }
  }

  threeJsViewer = null;

  convertToPdxMesh() {
    return () => {
      const pdxMesh = new PdxMesh();
      const pdxData = pdxMesh.createFromThreeJsObject(this.state.objectScene.object);
      const data = (new PdxData()).writeToBuffer(pdxData);
      const newFile = this.props.file.path.replace(/.dae/, '-copy.mesh');
      return jetpack.writeAsync(newFile, Buffer.from(data)).then(() => {
        return this.props.history.push(`/fileview/${newFile}`);
      });
    };
  }

  startAnimation(animation) {
    if (this.state.objectScene.animationMixer) {
      this.state.objectScene.animationMixer.stopAllAction();
    }

    const mixer = new THREE.AnimationMixer(this.state.objectScene.object);
    const action = mixer.clipAction(animation);
    action.play();
    this.state.objectScene.animationMixer = mixer;
  }

  stopAnimation(animation) {
    if (this.state.objectScene.animationMixer) {
      this.state.objectScene.animationMixer.stopAllAction();
    }

    this.state.objectScene.skeletons[0].pose();
  }

  convertToPdxAnimation(animation) {
    return () => {
      const pdxMesh = new PdxMesh();
      const pdxData = pdxMesh.convertToPdxAnim(animation, this.state.objectScene.object);
      const data = (new PdxData()).writeToBuffer(pdxData);
      const newFile = this.props.file.path.replace(/.dae/, `_${animation.name}.anim`);
      return jetpack.writeAsync(newFile, Buffer.from(data)).then(() => {
        return this.props.history.push(`/fileview/${newFile}`);
      });
    };
  }

  render() {
    const animations = [];
    if (this.state.objectScene && this.state.objectScene.animations) {
      this.state.objectScene.animations.forEach((animation) => {
        animations.push((
          <TableRow key={animation.uuid}>
            <TableCell><Checkbox
              onChange={(event, checked) => (checked ? this.startAnimation(animation) : this.stopAnimation())}
            />{animation.name}
            </TableCell>
            <TableCell>{animation.fps}</TableCell>
            <TableCell>{animation.tracks.length}</TableCell>
            <TableCell>{animation.duration}</TableCell>
            <TableCell><Button variant="raised" onClick={this.convertToPdxAnimation(animation)}>Convert to .anim</Button></TableCell>
          </TableRow>
        ));
      });
    }

    return (
      <div>
        <div>
          <Button variant="raised" onClick={this.convertToPdxMesh()}>Convert to .mesh</Button>
        </div>
        <ThreeJsViewer ref={(ref) => { this.threeJsViewer = ref; }} objectScene={this.state.objectScene} />
        <br />
        <Typography variant="headline">Embedded animations</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>FPS</TableCell>
              <TableCell>Tracks</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Convert</TableCell>
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
