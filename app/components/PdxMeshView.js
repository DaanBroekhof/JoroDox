// @flow
import React, {Component} from 'react';

const jetpack = require('electron').remote.require('fs-jetpack');
const path = require('electron').remote.require('path');

import PdxData from '../utils/PdxData';
import PdxDataView from './PdxDataView';
import * as THREE from 'three';
import PdxMesh from '../utils/PdxMesh';
import {
  Button, Checkbox, FormControlLabel, FormGroup, Icon, IconButton, MenuItem, Select, Table, TableBody, TableCell,
  TableHead,
  TableRow, TextField, Typography
} from 'material-ui';
import DeleteIcon from 'material-ui-icons/Delete';
import ColladaData from '../utils/ColladaData';
import ThreeJsViewer from './ThreeJsViewer';
import {withRouter} from 'react-router';

export default withRouter(class PdxMeshView extends Component {
    pdxShaders = [
      'PdxMeshStandard',
      'PdxMeshColor',
      'PdxMeshTextureAtlas',
      'PdxMeshSnow',
      'PdxMeshAlphaBlend',
      'PdxMeshAlphaBlendNoZWrite',
      'PdxMeshStandard_NoFoW_NoTI',
      'Collision',
      'JdxMeshShield',
      'JdxMeshShieldTextureAtlas',

      'PdxMeshStandardSkinned',
      'PdxMeshStandardShadow',
      'PdxMeshAlphaAdditive',
      'PdxMeshAlphaAdditiveSkinned',
      'PdxMeshAdvanced',
      'PdxMeshAdvancedSkinned',
      'PdxMeshAdvancedShadow',
      'PdxMeshTilingAO',
      'PdxMeshPortrait',


    ];

    pdxShaderDescriptions = {
      PdxMeshStandard: '[EU4 + CK2] The default not-transparent texture shader.',
      PdxMeshColor: '[EU4 + CK2] Shader which can blend the three \'national\' colors of the units country into the texture via the specular texture.',
      PdxMeshTextureAtlas: '[EU4 + CK2] Shader which blends the texture with an image of the units country\'s flag.',
      PdxMeshSnow: '[EU4 only] Shader which will add snow on top facing surfaces, when in a snowy location.',
      PdxMeshAlphaBlend: '[EU4 only] Shader which will allow transparency via the alpha channel of the diffuse texture.',
      PdxMeshAlphaBlendNoZWrite: '[EU4 only] A slower transparency shader with less transparency order glitches.',
      PdxMeshStandard_NoFoW_NoTI: '[EU4 only] Shader for objects which should never be hidden by Fog of War or Terra Incognita.',
      Collision: '[EU4 + CK2] \'Shader\' which will not render the mesh, but instead use it to check for (input) collision checking. (ie the clickable space of the item)',
      JdxMeshShield: '[CK2-JoroDox] Model always faces the player, and slightly scaled differently on zoom level. JodoDox CK2 Shader extension required!',
      JdxMeshShieldTextureAtlas: '[CK2-JoroDox] Custom PdxMeshTextureAtlas shader, which always faces the player, and scaled differently. JodoDox CK2 Shader extension required!',
    };

    constructor(props) {
      super(props);

      const fileTreeData = this.parseFile(props.file.path);

      let objectScene = null;
      if (fileTreeData) {
        try {
          objectScene = PdxMesh.convertToThreeJsScene(fileTreeData, path.resolve(this.props.file.path, '..'));
        } catch (exception) {
          console.log(exception);
        }
      }
      this.state = {
        fileTreeData,
        editFileTreeData: fileTreeData,
        textureFiles: this.findTextureFiles(path.dirname(props.file.path)),
        animationFiles: this.findAnimationFiles(path.dirname(props.file.path)),
        objectScene,
      };
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.file.path !== this.props.file.path || nextProps.file.changeTime !== this.props.file.changeTime) {
        const fileTreeData = this.parseFile(nextProps.file.path);

        let objectScene = null;
        if (fileTreeData) {
          try {
            objectScene = PdxMesh.convertToThreeJsScene(fileTreeData, path.resolve(nextProps.file.path, '..'));
          } catch (exception) {
            console.log(exception);
          }
        }
        this.setState({
          fileTreeData,
          editFileTreeData: fileTreeData,
          textureFiles: this.findTextureFiles(path.dirname(nextProps.file.path)),
          animationFiles: this.findAnimationFiles(path.dirname(nextProps.file.path)),
          objectScene,
        });
      }
    }

    findTextureFiles(path) {
      const localJetpack = jetpack.cwd(path);

      return localJetpack.find('.', {
        matching: '*.dds', recursive: false, files: true, directories: false
      });
    }

    findAnimationFiles(path) {
      const localJetpack = jetpack.cwd(path);
      return localJetpack.find('.', {
        matching: '*.anim', recursive: true, files: true, directories: false
      });
    }

    parseFile(path) {
      const parser = new PdxData();

      let data = null;
      try {
        data = parser.readFromBuffer(new Uint8Array(jetpack.read(path, 'buffer')).buffer);
      } catch (e) {

      }

      return data;
    }

    convertToCollada() {
      return () => {
        const colladaData = new ColladaData();
        const data = colladaData.createFromThreeJsObject(this.state.objectScene);
        const newFile = this.props.file.path.replace(/.mesh$/, '.dae');
        jetpack.writeAsync(newFile, data).then(() => {
          this.props.history.push(`/fileview/${newFile}`);
        });
      };
    }

    saveModifiedPdxMesh() {
      return () => {
        const data = (new PdxData()).writeToBuffer(this.state.editFileTreeData);
        const newFile = this.props.file.path;
        jetpack.writeAsync(newFile, new Buffer(data)).then(() => {
          this.props.history.push(`/fileview/${newFile}`);
        });
      };
    }

    setMeshProperty(mesh, propName, value) {
      mesh.props.material.props[propName] = value;

      this.setState({editFileTreeData: this.state.editFileTreeData});
    }

    setAnimation(animationFile) {
      const animationData = this.parseFile(path.dirname(this.props.file.path) + path.sep + animationFile);

      PdxMesh.setPdxAnimation(this.state.objectScene, animationData);
    }

    render() {
      if (!this.state.fileTreeData) {
        return <p>Error loading PDX data.</p>;
      }

      const textureFilesOptions = this.state.textureFiles.map((file) => <option key={file} value={file}>{file}</option>);

      const meshConfig = [];
      for (const [key, meshObject] of Object.entries(this.state.editFileTreeData.props.object.props)) {
        let nr = 0;
        if (!meshObject.children) { continue; }

        for (const meshObjectPart of meshObject.children) {
          if (meshObjectPart.name !== 'mesh') { continue; }

          meshConfig.push(<TableRow key={key + (nr++)}>
            <TableCell>{meshObject.name}{meshObject.children.length > 1 ? `.${nr}` : ''}</TableCell>
            <TableCell style={{maxWidth: 300}}>
              <Select value={meshObjectPart.props.material.props.shader} onChange={(event) => this.setMeshProperty(meshObjectPart, 'shader', event.target.value)} native>
                <option value={null}>Custom</option>
                {this.pdxShaders.map((shader) => <option key={shader} value={shader}>{shader}</option>)}
              </Select><br />
              <TextField value={meshObjectPart.props.material.props.shader} style={{display: this.pdxShaders.includes(meshObjectPart.props.material.props.shader) ? 'none' : 'inherit'}} onChange={(event) => this.setMeshProperty(meshObjectPart, 'shader', event.target.value)} />
              <p>{this.pdxShaderDescriptions[meshObjectPart.props.material.props.shader]}</p>
            </TableCell>
            <TableCell style={{minWidth: 300}}>
              <span style={{display: 'inline-block', width: 100}}>Diffuse:</span>
              <Select value={meshObjectPart.props.material.props.diff} onChange={(event) => this.setMeshProperty(meshObjectPart, 'diff', event.target.value)} native><option key={null} value="nodiffuse.dds">- none -</option> {textureFilesOptions}</Select><br />
              <span style={{display: 'inline-block', width: 100}}>Normal:</span>
              <Select value={meshObjectPart.props.material.props.n} onChange={(event) => this.setMeshProperty(meshObjectPart, 'n', event.target.value)} native><option key={null} value="nonormal.dds">- none -</option>{textureFilesOptions}</Select><br />
              <span style={{display: 'inline-block', width: 100}}>Specular:</span>
              <Select value={meshObjectPart.props.material.props.spec} onChange={(event) => this.setMeshProperty(meshObjectPart, 'spec', event.target.value)} native><option key={null} value="nospec.dds">- none -</option>{textureFilesOptions}</Select><br />
            </TableCell>
                          </TableRow>);
        }
      }

      return (
        <div>
          <div>
            <Button variant="raised" onClick={this.convertToCollada()}>Convert to Collada (.dae)</Button>
          </div>

          <ThreeJsViewer ref={(ref) => this.threeJsViewer = ref} objectScene={this.state.objectScene} />

          <br />
          <Typography variant="headline">Animation</Typography>
          <Select value={this.state.animationRun} onChange={(event) => this.setAnimation(event.target.value)} native>
            <option key={0} value={null}>- None -</option>
            {this.state.animationFiles.map((animationFile) =>
              <option key={animationFile} value={animationFile}>{animationFile}</option>)}
          </Select>
          <br />
          <Typography variant="headline">Meshes</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>PDX Shader</TableCell>
                <TableCell>Textures</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {meshConfig}
            </TableBody>
          </Table>
          <div>
            <Button variant="raised" onClick={this.saveModifiedPdxMesh()}>Save changes</Button>
          </div>
          <br />
          <Typography variant="headline">PDX Mesh Data</Typography>
          <PdxDataView data={this.state.fileTreeData} file={this.props.file} style={{maxHeight: 800}} />
        </div>
      );
    }
});
