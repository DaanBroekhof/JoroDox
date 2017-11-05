// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
const path = require('electron').remote.require('path');
import PdxData from '../utils/PdxData';
import PdxDataView from "./PdxDataView";
import * as THREE from 'three';
import PdxMesh from '../utils/PdxMesh';
import {
    Button, Checkbox, FormControlLabel, FormGroup, Icon, IconButton, MenuItem, Select, Table, TableBody, TableCell,
    TableHead,
    TableRow, TextField, Typography
} from "material-ui";
import DeleteIcon from 'material-ui-icons/Delete';
import ColladaData from "../utils/ColladaData";
import ThreeJsViewer from "./ThreeJsViewer";
import {withRouter} from "react-router";

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
    ];

    pdxShaderDescriptions = {
        'PdxMeshStandard': '[EU4 + CK2] The default not-transparent texture shader.',
        'PdxMeshColor': '[EU4 + CK2] Shader which can blend the three \'national\' colors of the units country into the texture via the specular texture.',
        'PdxMeshTextureAtlas': '[EU4 + CK2] Shader which blends the texture with an image of the units country\'s flag.',
        'PdxMeshSnow': '[EU4 only] Shader which will add snow on top facing surfaces, when in a snowy location.',
        'PdxMeshAlphaBlend': '[EU4 only] Shader which will allow transparency via the alpha channel of the diffuse texture.',
        'PdxMeshAlphaBlendNoZWrite': '[EU4 only] A slower transparency shader with less transparency order glitches.',
        'PdxMeshStandard_NoFoW_NoTI': '[EU4 only] Shader for objects which should never be hidden by Fog of War or Terra Incognita.',
        'Collision': '[EU4 + CK2] \'Shader\' which will not render the mesh, but instead use it to check for (input) collision checking. (ie the clickable space of the item)',
        'JdxMeshShield': '[CK2-JoroDox] Model always faces the player, and slightly scaled differently on zoom level. JodoDox CK2 Shader extension required!',
        'JdxMeshShieldTextureAtlas': '[CK2-JoroDox] Custom PdxMeshTextureAtlas shader, which always faces the player, and scaled differently. JodoDox CK2 Shader extension required!',
    };

    constructor(props) {
        super(props);

        let fileTreeData = this.parseFile(props.file.path);

        this.state = {
            fileTreeData: fileTreeData,
            editFileTreeData: fileTreeData,
            textureFiles: this.findTextureFiles(path.dirname(props.file.path)),
            objectScene:  fileTreeData ? PdxMesh.convertToThreeJsScene(fileTreeData, path.resolve(this.props.file.path, '..')) : null,
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.file.path !== this.props.file.path || nextProps.file.changeTime !== this.props.file.changeTime) {
            let fileTreeData = this.parseFile(nextProps.file.path);
            this.setState({
                fileTreeData: fileTreeData,
                editFileTreeData: fileTreeData,
                textureFiles: this.findTextureFiles(path.dirname(nextProps.file.path)),
                objectScene: fileTreeData ? PdxMesh.convertToThreeJsScene(fileTreeData, path.resolve(nextProps.file.path, '..')) : null,
            });
        }
    }

    findTextureFiles(path) {
        let localJetpack = jetpack.cwd(path);

        return localJetpack.find('.', {matching: '*.dds', recursive: false, files: true, directories: false});
    }

    parseFile(path) {
        let parser = new PdxData();

        let data = null;
        try {
            data = parser.readFromBuffer(new Uint8Array(jetpack.read(path, 'buffer')).buffer);
        }
        catch (e) {

        }

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

    saveModifiedPdxMesh() {
        return () => {
            let data = (new PdxData).writeToBuffer(this.state.editFileTreeData);
            let newFile = this.props.file.path;
            jetpack.writeAsync(newFile, new Buffer(data)).then(() => {
                this.props.history.push('/fileview/'+ newFile);
            });
        };
    }

    setMeshProperty(mesh, propName, value) {

        mesh.props.material.props[propName] = value;

        this.setState({editFileTreeData: this.state.editFileTreeData});
    }

    render() {
        if (!this.state.fileTreeData) {
            return <p>Error loading PDX data.</p>;
        }

        let textureFilesOptions = this.state.textureFiles.map((file) => <option key={file} value={file}>{file}</option>);

        let meshConfig = [];
        for (let [key, meshObject] of Object.entries(this.state.editFileTreeData.props.object.props)) {
            let nr = 0;
            for (let meshObjectPart of meshObject.children) {
                if (meshObjectPart.name !== 'mesh')
                    continue;

                meshConfig.push(
                    <TableRow key={key + (nr++)}>
                        <TableCell>{meshObject.name}{meshObject.children.length > 1 ? '.'+ (nr) : ''}</TableCell>
                        <TableCell style={{maxWidth: 300}}>
                            <Select value={meshObjectPart.props.material.props.shader} onChange={(event) => this.setMeshProperty(meshObjectPart, 'shader', event.target.value)} native>
                                <option value={null}>Custom</option>
                                {this.pdxShaders.map((shader) => {
                                    return <option key={shader} value={shader}>{shader}</option>;
                                })}
                            </Select><br />
                            <TextField value={meshObjectPart.props.material.props.shader} style={{display: this.pdxShaders.includes(meshObjectPart.props.material.props.shader) ? 'none' : 'inherit'}} onChange={(event) => this.setMeshProperty(meshObjectPart, 'shader', event.target.value)} />
                            <p>{this.pdxShaderDescriptions[meshObjectPart.props.material.props.shader]}</p>
                        </TableCell>
                        <TableCell style={{minWidth: 300}}>
                            <span style={{display: 'inline-block', width: 100}}>Diffuse:</span>
                            <Select value={meshObjectPart.props.material.props.diff} onChange={(event) => this.setMeshProperty(meshObjectPart, 'diff', event.target.value)} native><option key={null} value={'nodiffuse.dss'}>- none -</option> {textureFilesOptions}</Select><br />
                            <span style={{display: 'inline-block', width: 100}}>Normal:</span>
                            <Select value={meshObjectPart.props.material.props.n} onChange={(event) => this.setMeshProperty(meshObjectPart, 'n', event.target.value)} native><option key={null} value={'nonormal.dss'}>- none -</option>{textureFilesOptions}</Select><br />
                            <span style={{display: 'inline-block', width: 100}}>Specular:</span>
                            <Select value={meshObjectPart.props.material.props.spec} onChange={(event) => this.setMeshProperty(meshObjectPart, 'spec' ,event.target.value)} native><option key={null} value={'nospec.dss'}>- none -</option>{textureFilesOptions}</Select><br />
                        </TableCell>
                    </TableRow>
                );
            }
        }

        return (
            <div>
                <div>
                    <Button raised onClick={this.convertToCollada()}>Convert to Collada (.dae)</Button>
                </div>

                <ThreeJsViewer ref={(ref) => this.threeJsViewer = ref} objectScene={this.state.objectScene}/>

                <br />
                <Typography type="headline">Meshes</Typography>
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
                    <Button raised onClick={this.saveModifiedPdxMesh()}>Save changes</Button>
                </div>
                <br />
                <Typography type="headline">PDX Mesh Data</Typography>
                <PdxDataView data={this.state.fileTreeData} file={this.props.file} style={{maxHeight: 800}} />
            </div>
        );
    }
})