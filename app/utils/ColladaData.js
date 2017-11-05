import * as THREE from 'three';
import ColladaLoader from './threejs/ColladaLoader.js';
import ThreeJS from "./ThreeJS";
const jetpack = require('electron').remote.require('fs-jetpack');

export default class ColladaData {

    createFromThreeJsObject(viewObject, options) {
        let data = this.createColladaDataFromThreeJsObject(viewObject, options);
        return this.convertColladaDataToColladaXml(data);
    }

    insertValues(array, offset, values) {
        for (let i = 0; i < values.length; i++)
        {
            array[offset + i] = values[i];
        }
        return array;
    }

    createColladaDataFromThreeJsObject(viewObject, options) {

        if (!options)
            options = {
                textureBaseName: 'unknown',
                pdxShader: 'PdxMeshStandard',
                flipY: true,
            };

        let colladaData = {
            'images': [],
            //'effects': [],
            'materials': [],
            'geometries': [],
            'animations': [],
            'controllers': [],
            'geometryInstance': [],
            'scene': [],
            'skeleton': null,
            'nodeCount': 0,
        };

        let rootObject = {
            'name': 'Scene',
            'type': 'SCENE',
            'threeJs': viewObject.object,
            'children': [],
        };

        colladaData.scene = rootObject;

        // 'internal' function
        let getVertexNrForUniqueData = function (vertNr, uv, normal, vertexToUniqueData, verts, skinIds, skinWeights)
        {
            if (!vertexToUniqueData[vertNr])
            {
                vertexToUniqueData[vertNr] = [{'uv': uv, 'normal': normal, v: vertNr}];
                return vertNr;
            }

            // See if we already mapped this UV before
            let foundVertNr = false;
            for (let j = 0, jl = vertexToUniqueData[vertNr].length; j < jl; j++)
            {
                foundVertNr = vertexToUniqueData[vertNr][j].v;

                if (!vertexToUniqueData[vertNr][j].normal || !vertexToUniqueData[vertNr][j].normal.equals(normal))
                {
                    foundVertNr = false;
                }
                else
                {
                    for (let i = 0; i < vertexToUniqueData[vertNr][j].uv.length; i++)
                    {
                        if (!uv[i] || !vertexToUniqueData[vertNr][j].uv[i].equals(uv[i]))
                        {
                            foundVertNr = false;
                            break;
                        }
                    }
                }

                if (foundVertNr !== false)
                    return foundVertNr;
            }

            // Create new vert, copy of existing
            verts.push(verts[vertNr*3]);
            verts.push(verts[vertNr*3+1]);
            verts.push(verts[vertNr*3+2]);

            // Don't forget skin
            skinIds.push(skinIds[vertNr*4]);
            skinIds.push(skinIds[vertNr*4+1]);
            skinIds.push(skinIds[vertNr*4+2]);
            skinIds.push(skinIds[vertNr*4+2]);
            skinWeights.push(skinWeights[vertNr*4]);
            skinWeights.push(skinWeights[vertNr*4+1]);
            skinWeights.push(skinWeights[vertNr*4+2]);
            skinWeights.push(skinWeights[vertNr*4+2]);

            let newVert = ((verts.length / 3) - 1) | 0; // '| 0' = cast to int

            vertexToUniqueData[vertNr].push({'uv': uv, 'normal': normal, v: newVert});

            return newVert;
        };



        // find all geometry
        for (let subObject of viewObject.meshes) {
            let objectName = subObject.name +'-'+ colladaData.nodeCount;
            let childNode = {
                'name': objectName,
                'type': 'NODE',
                'matrix': subObject.matrixWorld,
                'threeJs': subObject,
                'controller': null,
                'geometry' : null,
                'children': [],
                'isCollider': viewObject.colliders.indexOf(subObject) !== -1,
                'material': {
                    'name': objectName +'-material-'+ colladaData.materials.length,
                    'diff': subObject.material.map && subObject.material.map.fileName ? {'name': objectName +'-effect-'+ colladaData.materials.length +'-diff', 'fileName': subObject.material.map.fileName} : null,
                    'normal': subObject.material.normalMap && subObject.material.normalMap.fileName ? {'name': objectName +'-effect-'+ colladaData.materials.length +'-normal', 'fileName': subObject.material.normalMap.fileName } : null,
                    'spec': subObject.material.specularMap && subObject.material.specularMap.fileName ? {'name': objectName +'-effect-'+ colladaData.materials.length +'-spec', 'fileName': subObject.material.specularMap.fileName } : null,
                }
            };
            childNode.material.node = childNode;
            colladaData.nodeCount++;

            rootObject.children.push(childNode);
            colladaData.materials.push(childNode.material);
            if (childNode.material.diff)
                colladaData.images.push(childNode.material.diff);
            if (childNode.material.normal)
                colladaData.images.push(childNode.material.normal);
            if (childNode.material.spec)
                colladaData.images.push(childNode.material.spec);

            if (childNode.isCollider)
                childNode.material.transparency = 0.5;

            if (!childNode.isCollider && subObject.skeleton && subObject.skeleton.bones.length > 0)
            {
                // Skin controller
                let controller = {
                    'name': objectName +'-skin',

                    'object': childNode,

                    'skinSource': childNode.mesh,
                    'bindShapeMatrix': subObject.bindMatrix.toArray(),
                    'jointNameList': [],
                    'jointPoseList': [],

                    'skinWeights': [],
                    'skinVertexInfluenceCount': [],
                    'skinVertexInfluences': [],
                };
                // Weightcount always 4

                colladaData.controllers.push(controller);
                childNode.controller = controller;

                let flip = this.flipMatrixArray;
                function loadBone(bone)
                {
                    controller.jointNameList.push(bone.name);
                    controller.jointPoseList.push.apply(controller.jointPoseList, flip(new THREE.Matrix4().getInverse(bone.matrixWorld).toArray()));
                    //controller.jointPoseList.push.apply(controller.jointPoseList, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

                    bone.children.forEach(loadBone);
                }
                loadBone(subObject.skeleton.bones[0]);
                if (!colladaData.skeleton || colladaData.skeleton.bones[0] !== subObject.skeleton.bones[0])
                {
                    colladaData.skeleton = subObject.skeleton;
                    colladaData.scene.children.unshift(subObject.skeleton.bones[0]);
                }
            }


            // Vertices
            let verts = [];
            for (let k = 0, l = subObject.geometry.vertices.length; k < l; k++)
            {
                verts.push.apply(verts, subObject.geometry.vertices[k].toArray());
            }

            // Face-stored data
            let tri = [];
            let normals = [];
            let tangents = [];
            let uvs = [];

            if (!subObject.geometry.hasTangents && subObject.geometry.faceVertexUvs[0].length)
                subObject.geometry.computeTangents();

            // Assume skinIds as long as skinWeights
            let skinIds = [];
            let skinWeights = [];
            let bonesUsed = 0;
            for (let k = 0, l = subObject.geometry.skinIndices.length; k < l; k++)
            {
                skinIds.push(
                    subObject.geometry.skinWeights[k].x ? subObject.geometry.skinIndices[k].x : -1,
                    subObject.geometry.skinWeights[k].y ? subObject.geometry.skinIndices[k].y : -1,
                    subObject.geometry.skinWeights[k].z ? subObject.geometry.skinIndices[k].z : -1,
                    subObject.geometry.skinWeights[k].w ? subObject.geometry.skinIndices[k].w : -1
                );
                skinWeights.push(
                    subObject.geometry.skinWeights[k].x,
                    subObject.geometry.skinWeights[k].y,
                    subObject.geometry.skinWeights[k].z,
                    subObject.geometry.skinWeights[k].w
                );

                let used = Math.ceil(subObject.geometry.skinWeights[k].x) + Math.ceil((subObject.geometry.skinWeights[k].y)) + Math.ceil(subObject.geometry.skinWeights[k].z) + Math.ceil(subObject.geometry.skinWeights[k].w);

                bonesUsed = Math.max(used, bonesUsed);
            }

            // See if we have any multi-UV vertices, split those
            let vertexToUniqueData = [];
            let uvCount = subObject.geometry.faceVertexUvs.length;
            if (subObject.geometry.faceVertexUvs[0].length === 0)
                uvCount--;
            for (let k = 0, l = subObject.geometry.faces.length; k < l; k++)
            {
                let face = subObject.geometry.faces[k];
                let faceUvs = [];
                for (let j = 0; j < 3; j++)
                {
                    faceUvs[j] = [];
                    for (let i = 0; i < uvCount; i++)
                        if (subObject.geometry.faceVertexUvs[i][k])
                            faceUvs[j][i] = subObject.geometry.faceVertexUvs[i][k][j];
                }

                face.a = getVertexNrForUniqueData(face.a, faceUvs[0], face.vertexNormals[0], vertexToUniqueData, verts, skinIds, skinWeights);
                face.b = getVertexNrForUniqueData(face.b, faceUvs[1], face.vertexNormals[1], vertexToUniqueData, verts, skinIds, skinWeights);
                face.c = getVertexNrForUniqueData(face.c, faceUvs[2], face.vertexNormals[2], vertexToUniqueData, verts, skinIds, skinWeights);
            }


            // Process all faces
            for (let k = 0, l = subObject.geometry.faces.length; k < l; k++)
            {
                let face = subObject.geometry.faces[k];
                tri.push(face.a, face.b, face.c);

                if (!face.vertexNormals[0])
                    this.insertValues(normals, face.a*3, [0, 0, 0]);
                else
                    this.insertValues(normals, face.a*3, face.vertexNormals[0].toArray());
                if (!face.vertexNormals[1])
                    this.insertValues(normals, face.b*3, [0, 0, 0]);
                else
                    this.insertValues(normals, face.b*3, face.vertexNormals[1].toArray());
                if (!face.vertexNormals[2])
                    this.insertValues(normals, face.c*3, [0, 0, 0]);
                else
                    this.insertValues(normals, face.c*3, face.vertexNormals[2].toArray());

                if (face.vertexTangents && face.vertexTangents.length)
                {
                    this.insertValues(tangents, face.a*4, face.vertexTangents[0].toArray());
                    this.insertValues(tangents, face.b*4, face.vertexTangents[1].toArray());
                    this.insertValues(tangents, face.c*4, face.vertexTangents[2].toArray());
                }
                else
                {
                    this.insertValues(tangents, face.a*4, new THREE.Vector4().toArray());
                    this.insertValues(tangents, face.b*4, new THREE.Vector4().toArray());
                    this.insertValues(tangents, face.c*4, new THREE.Vector4().toArray());
                }


                for (let i = 0; i < uvCount; i++)
                {
                    if (!uvs[i])
                        uvs[i] = [];
                    if (subObject.geometry.faceVertexUvs[i])
                    {
                        let uv = subObject.geometry.faceVertexUvs[i][k];

                        if (uv)
                        {
                            let flipY = options.flipY;//subObject.material.map.flipY;

                            uvs[i][face.a*2] = uv[0].x;
                            uvs[i][face.a*2+1] = flipY? 1 - uv[0].y : uv[0].y;
                            uvs[i][face.b*2] = uv[1].x;
                            uvs[i][face.b*2+1] = flipY? 1 - uv[1].y : uv[1].y;
                            uvs[i][face.c*2] = uv[2].x;
                            uvs[i][face.c*2+1] = flipY? 1 - uv[2].y : uv[2].y;
                        }
                        else
                        {
                            uvs[i][face.a*2] = 0;
                            uvs[i][face.a*2+1] = 0;
                            uvs[i][face.b*2] = 0;
                            uvs[i][face.b*2+1] = 0;
                            uvs[i][face.c*2] = 0;
                            uvs[i][face.c*2+1] = 0;
                        }
                    }
                }
            }

            let polylist = [];
            // Vertex position, Vertex normal + UVs count
            // Polylist can be mixed indices for each, but we have flattened them already
            let inputCount = uvCount + 2;
            //var inputCount = 2;
            for (let i = 0, l = tri.length; i < l; i++)
            {
                for (let j = 0; j < inputCount; j++)
                    polylist.push(tri[i]);
            }

            // Geometry load
            let geometry = {
                'name': objectName +'-geometry',
                'vertices': verts,
                'normals': normals,
                'uvs': uvs,
                'polylist': polylist,
                'polycount': tri.length / 3,
            };
            // Polysize always 3


            colladaData.geometries.push(geometry);
            childNode.geometry = geometry;
            //if (childNode.controller)
            //    childNode.controller;

            if (childNode.controller)
            {
                // Convert influences & weights

                for (let i = 0; i < skinIds.length; i += 4)
                {
                    let influenceCount = 0;

                    for (let j = 0; j < 4; j++)
                    {
                        if (skinIds[i+j] !== -1)
                        {
                            influenceCount = j+1;
                            childNode.controller.skinWeights.push(skinWeights[i+j]);
                            childNode.controller.skinVertexInfluences.push(skinIds[i+j]);
                            childNode.controller.skinVertexInfluences.push(childNode.controller.skinWeights.length - 1);
                        }
                    }
                    childNode.controller.skinVertexInfluenceCount.push(influenceCount)
                }
            }

            /*
            let mesh = {name: 'mesh', type: 'object', subNodes: []};
            mesh.subNodes.push({name: 'p', type: 'float', data: verts});
            mesh.subNodes.push({name: 'n', type: 'float', data: normals});
            mesh.subNodes.push({name: 'ta', type: 'float', data: tangents});
            for (let i = 0; i < uvCount; i++)
                mesh.subNodes.push({name: 'u' + i, type: 'float', data: uvs[i]});
            mesh.subNodes.push({name: 'tri', type: 'int', data: tri});
            mesh.subNodes.push({name: 'aabb', type: 'object', subNodes: [
                {name: 'min', type: 'float', data: [bb.min.x, bb.min.y, bb.min.z]},
                {name: 'max', type: 'float', data: [bb.max.x, bb.max.y, bb.max.z]},
            ]});
            mesh.subNodes.push({name: 'material', type: 'object', subNodes: [
                {name: 'shader', type: 'string', data: options.pdxShader ? options.pdxShader : 'PdxMeshStandard', nullByteString: true},
                {name: 'diff', type: 'string', data: options.textureBaseName +'_diffuse.dds', nullByteString: true},
                {name: 'n', type: 'string', data: options.textureBaseName +'_normal.dds', nullByteString: true},
                {name: 'spec', type: 'string', data: options.textureBaseName +'_spec.dds', nullByteString: true},
            ]});
            shapeRoot.subNodes.push(mesh);
            */

        }

        //if (boneData.length)
        //	shapeRoot.subNodes.push({name: 'skeleton', type: 'object', subNodes: boneData});

        console.log(colladaData);

        return colladaData;
    }

    convertColladaDataToColladaXml(colladaData) {

        let xml = '<?xml version="1.0" encoding="utf-8"?>'+ "\n";
        xml += '<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">'+ "\n";
        xml += '  <asset>'+ "\n";
        xml += '    <contributor>'+ "\n";
        xml += '      <author>Jorodox User</author>'+ "\n";
        xml += '      <authoring_tool>Jorodox Tool</authoring_tool>'+ "\n";
        xml += '    </contributor>'+ "\n";
        xml += '    <created>'+ (new Date()).toISOString().replace(/\..*$/, '') +'</created>'+ "\n";
        xml += '    <modified>'+ (new Date()).toISOString().replace(/\..*$/, '') +'</modified>'+ "\n";
        xml += '    <unit name="meter" meter="1"/>'+ "\n";
        xml += '    <up_axis>Y_UP</up_axis>'+ "\n";
        xml += '  </asset>'+ "\n";
        xml += '  <library_images>'+ "\n";
        for (let image of colladaData.images) {
            xml += '    <image id="'+ image.name +'" name="'+ image.name +'"><init_from>'+ image.fileName +'</init_from></image>'+ "\n";
        }
        xml += '  </library_images>'+ "\n";


        xml += '  <library_effects>'+ "\n";
        for (let material of colladaData.materials) {

            xml += '    <effect id="'+ material.name +'-effect"><profile_COMMON>' + "\n";
            if (material.diff)
            {
                xml += '      <newparam sid="'+ material.diff.name +'-diff-surface"><surface type="2D"><init_from>'+ material.diff.name +'</init_from></surface></newparam>' + "\n";
                xml += '      <newparam sid="'+ material.diff.name +'-diff-sampler"><sampler2D><source>'+ material.diff.name +'-diff-surface</source></sampler2D></newparam>' + "\n";
            }
            if (material.normal)
            {
                xml += '      <newparam sid="'+ material.normal.name +'-normal-surface"><surface type="2D"><init_from>'+ material.normal.name +'</init_from></surface></newparam>' + "\n";
                xml += '      <newparam sid="'+ material.normal.name +'-normal-sampler"><sampler2D><source>'+ material.normal.name +'-normal-surface</source></sampler2D></newparam>' + "\n";
            }
            if (material.spec)
            {
                xml += '      <newparam sid="'+ material.spec.name +'-spec-surface"><surface type="2D"><init_from>'+ material.spec.name +'</init_from></surface></newparam>' + "\n";
                xml += '      <newparam sid="'+ material.spec.name +'-spec-sampler"><sampler2D><source>'+ material.spec.name +'-spec-surface</source></sampler2D></newparam>' + "\n";
            }
            xml += '      <technique sid="common">' + "\n";
            xml += '        <blinn>' + "\n";
            xml += '          <emission><color sid="emission">0 0 0 1</color></emission>' + "\n";
            xml += '          <ambient><color sid="ambient">0 0 0 1</color></ambient>' + "\n";
            if (material.diff)
                xml += '          <diffuse><texture texture="'+ material.diff.name +'-diff-sampler" texcoord="'+ material.node.geometry.name +'-channel1"/></diffuse>' + "\n";
            else
                xml += '          <diffuse><color sid="diffuse">0 0 0 1</color></diffuse>' + "\n";
            if (material.normal)
                xml += '          <bump bumptype="NORMALMAP"><texture texture="'+ material.normal.name +'-normal-sampler" texcoord="'+ material.node.geometry.name +'-channel1"/></bump>' + "\n";
            if (material.spec)
                xml += '          <specular><texture texture="'+ material.spec.name +'-spec-sampler" texcoord="'+ material.node.geometry.name +'-channel1"/></specular>' + "\n";
            else
                xml += '          <specular><color sid="specular">0 0 0 1</color></specular>' + "\n";

            if (material.transparency)
            {
                xml += '          <transparent><color sid="transparent">1 1 1 1</color></transparent>' + "\n";
                xml += '          <transparency><float sid="transparency">'+ material.transparency +'</float></transparency>' + "\n";
            }

            xml += '          <shininess><float sid="shininess">0</float></shininess>' + "\n";
            xml += '          <index_of_refraction><float sid="index_of_refraction">1</float></index_of_refraction>' + "\n";
            xml += '        </blinn>' + "\n";
            xml += '      </technique>' + "\n";
            xml += '  </profile_COMMON></effect>' + "\n";
        }

        xml += '  </library_effects>'+ "\n";

        xml += '  <library_materials>'+ "\n";
        for (let material of colladaData.materials) {
            xml += '   <material id="'+ material.name +'" name="'+ material.name +'"><instance_effect url="#'+ material.name +'-effect"/></material>'+ "\n";
        }
        xml += '  </library_materials>'+ "\n";

        xml += '  <library_geometries>'+ "\n";
        for (let geometry of colladaData.geometries) {
            xml += '   <geometry id="'+ geometry.name +'" name="'+ geometry.name +'-model">'+ "\n";
            xml += '   <mesh>'+ "\n";

            xml += '     <source id="'+ geometry.name +'-positions" name="'+ geometry.name +'-positions">'+ "\n";
            xml += '       <float_array id="'+ geometry.name +'-positions-array" count="'+ geometry.vertices.length +'">'+ geometry.vertices.join(' ') +'</float_array>'+ "\n";
            xml += '       <technique_common><accessor source="#'+ geometry.name +'-positions-array" count="'+ (geometry.vertices.length/3) +'" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common>'+ "\n";
            xml += '     </source>'+ "\n";

            xml += '     <source id="'+ geometry.name +'-normals" name="'+ geometry.name +'-normals">'+ "\n";
            xml += '       <float_array id="'+ geometry.name +'-normals-array" count="'+ geometry.normals.length +'">'+ geometry.normals.join(' ') +'</float_array>'+ "\n";
            xml += '       <technique_common><accessor source="#'+ geometry.name +'-normals-array" count="'+ (geometry.normals.length/3) +'" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common>'+ "\n";
            xml += '     </source>'+ "\n";

            geometry.uvs.forEach(function (uv, uvNr) {
                xml += '     <source id="'+ geometry.name +'-uv-'+ uvNr +'" name="'+ geometry.name +'-uv-'+ uvNr +'">'+ "\n";
                xml += '       <float_array id="'+ geometry.name +'-uv-'+ uvNr +'-array" count="'+ uv.length +'">'+ uv.join(' ') +'</float_array>'+ "\n";
                xml += '       <technique_common><accessor source="#'+ geometry.name +'-uv-'+ uvNr +'-array" count="'+ (uv.length/2) +'" stride="2"><param name="S" type="float"/><param name="T" type="float"/></accessor></technique_common>'+ "\n";
                xml += '     </source>'+ "\n";
            });

            xml += '     <vertices id="'+ geometry.name +'-vertices">'+ "\n";
            xml += '       <input semantic="POSITION" source="#'+ geometry.name +'-positions"/>'+ "\n";
            xml += '     </vertices>'+ "\n";

            xml += '     <polylist material="'+ geometry.name +'-material" count="'+ geometry.polycount +'">'+ "\n";
            xml += '       <input semantic="VERTEX" source="#'+ geometry.name +'-vertices" offset="0"/>'+ "\n";
            xml += '       <input semantic="NORMAL" source="#'+ geometry.name +'-normals" offset="1"/>'+ "\n";
            geometry.uvs.forEach(function (uv, uvNr) {
                xml += '       <input semantic="TEXCOORD" source="#'+ geometry.name +'-uv-'+ uvNr +'" offset="2" set="0"/>'+ "\n";
            });
            xml += '       <vcount>'+ (new Array(geometry.polycount + 1).join('3 ').trim()) +'</vcount>'+ "\n";
            xml += '       <p>'+ geometry.polylist.join(' ') +'</p>'+ "\n";
            xml += '     </polylist>'+ "\n";
            xml += '   </mesh>'+ "\n";
            xml += '   </geometry>'+ "\n";
        }
        xml += '  </library_geometries>'+ "\n";

        xml += '  <library_animations>'+ "\n";
        xml += '  </library_animations>'+ "\n";

        xml += '  <library_controllers>'+ "\n";
        for (let controller of colladaData.controllers) {
            xml += '   <controller id="'+ controller.name +'" name="'+ controller.name +'-name">'+ "\n";
            xml += '     <skin source="#'+ controller.object.geometry.name +'">'+ "\n";
            xml += '       <bind_shape_matrix>'+ controller.bindShapeMatrix.join(' ') +'</bind_shape_matrix>'+ "\n";
            xml += '       <source id="'+ controller.name +'-joints">'+ "\n";
            xml += '         <Name_array id="'+ controller.name +'-joints-array" count="'+ controller.jointNameList.length +'">'+ controller.jointNameList.join(' ') +'</Name_array>'+ "\n";
            xml += '         <technique_common><accessor source="#'+ controller.name +'-joints-array" count="'+ controller.jointNameList.length +'" stride="1"><param name="JOINT" type="name"/></accessor></technique_common>'+ "\n";
            xml += '       </source>'+ "\n";
            xml += '       <source id="'+ controller.name +'-bindposes">'+ "\n";
            xml += '         <float_array id="'+ controller.name +'-bindposes-array" count="'+ controller.jointPoseList.length +'">'+ controller.jointPoseList.join(' ') +'</float_array>'+ "\n";
            xml += '         <technique_common><accessor source="#'+ controller.name +'-bindposes-array" count="'+ (controller.jointPoseList.length / 16) +'" stride="16"><param name="TRANSFORM" type="float4x4"/></accessor></technique_common>'+ "\n";
            xml += '       </source>'+ "\n";
            xml += '       <source id="'+ controller.name +'-skinweights">'+ "\n";
            xml += '         <float_array id="'+ controller.name +'-skinweights-array" count="'+ controller.skinWeights.length +'">'+ controller.skinWeights.join(' ') +'</float_array>'+ "\n";
            xml += '         <technique_common><accessor source="#'+ controller.name +'-skinweights-array" count="'+ (controller.skinWeights.length) +'" stride="1"><param name="WEIGHT" type="float"/></accessor></technique_common>'+ "\n";
            xml += '       </source>'+ "\n";

            xml += '       <joints>'+ "\n";
            xml += '         <input semantic="JOINT" source="#'+ controller.name +'-joints"/>'+ "\n";
            xml += '         <input semantic="INV_BIND_MATRIX" source="#'+ controller.name +'-bindposes"/>'+ "\n";
            xml += '       </joints>'+ "\n";
            xml += '       <vertex_weights count="'+ controller.skinWeights.length +'">'+ "\n";
            xml += '         <input semantic="JOINT" source="#'+ controller.name +'-joints" offset="0"/>'+ "\n";
            xml += '         <input semantic="WEIGHT" source="#'+ controller.name +'-skinweights" offset="1"/>'+ "\n";
            xml += '         <vcount>'+ controller.skinVertexInfluenceCount.join(' ') +'</vcount>'+ "\n";
            xml += '         <v>'+ controller.skinVertexInfluences.join(' ') +'</v>'+ "\n";
            xml += '       </vertex_weights>'+ "\n";
            xml += '     </skin>'+ "\n";
            xml += '   </controller>'+ "\n";
        }
        xml += '  </library_controllers>'+ "\n";

        let flip = this.flipMatrixArray;
        function printNode(node, indent) {
            let xml = '';

            if (node.type && node.type === 'SCENE')
                xml += indent +'<visual_scene id="'+ node.name +'" name="'+ node.name +'">'+ "\n";
            else if (node.type && node.type === 'NODE')
                xml += indent +'<node id="'+ node.name +'" name="'+ node.name +'" type="NODE">'+ "\n";
            else // Bone
                xml += indent +'<node id="'+ node.name +'" name="'+ node.name +'" sid="'+ node.name +'" type="JOINT">'+ "\n";

            if (node.matrix)
                xml += indent +'  <matrix sid="transform">'+ flip(node.matrix.toArray()).join(' ') +'</matrix>'+ "\n";

            if (node.controller)
            {
                xml += indent +'  <instance_controller url="#'+ node.controller.name +'">'+ "\n";
                xml += indent +'    <skeleton>#'+ colladaData.skeleton.bones[0].name +'</skeleton>'+ "\n";
                xml += indent +'    <bind_material><technique_common>'+ "\n";
                xml += indent +'      <instance_material symbol="'+ node.material.name +'" target="#'+ node.material.name +'">'+ "\n";
                xml += indent +'        <bind_vertex_input semantic="'+ node.geometry.name +'-channel1" input_semantic="TEXCOORD" input_set="0"/>'+ "\n";
                xml += indent +'      </instance_material>'+ "\n";
                xml += indent +'     </technique_common></bind_material>'+ "\n";
                xml += indent +'  </instance_controller>'+ "\n";
            }
            else if (node.material && node.material.diff)
            {
                xml += indent +'  <instance_geometry url="#'+ node.geometry.name +'">'+ "\n";
                xml += indent +'    <bind_material><technique_common>'+ "\n";
                xml += indent +'      <instance_material symbol="'+ node.material.name +'" target="#'+ node.material.name +'">'+ "\n";
                xml += indent +'        <bind_vertex_input semantic="'+ node.geometry.name +'-channel1" input_semantic="TEXCOORD" input_set="0"/>'+ "\n";
                xml += indent +'      </instance_material>'+ "\n";
                xml += indent +'    </technique_common></bind_material>'+ "\n";
                xml += indent +'  </instance_geometry>'+ "\n";
            }
            else if (node.geometry)
            {
                xml += indent +'  <instance_geometry url="#'+ node.geometry.name +'">'+ "\n";
                xml += indent +'    <bind_material><technique_common>'+ "\n";
                xml += indent +'      <instance_material symbol="'+ node.material.name +'" target="#'+ node.material.name +'"></instance_material>'+ "\n";
                xml += indent +'    </technique_common></bind_material>'+ "\n";
                xml += indent +'  </instance_geometry>'+ "\n";
            }

            if (node.children)
            {
                for (let subNode of node.children) {
                    xml += printNode(subNode, indent + '  ');
                }
            }

            if (node.type && node.type === 'SCENE')
                xml += indent +'</visual_scene>'+ "\n";
            else
                xml += indent +'</node>'+ "\n";

            return xml;
        }

        xml += '  <library_visual_scenes>'+ "\n";
        xml += printNode(colladaData.scene, '    ');
        xml += '  </library_visual_scenes>'+ "\n";

        xml += '  <scene><instance_visual_scene url="#Scene"/></scene>'+ "\n";

        xml += '</COLLADA>'+ "\n";

        return xml;
    }

    static handlerAdded = false;
    setThreeJsLoaderHandlers() {
        if (ColladaData.handlerAdded)
            return;

        THREE.Loader.Handlers.add(/^mod:\/\//, {
            'load': function (path) {
                let texture = new THREE.Texture();

                let modPath = path.substr(6);

                if (modPath.substr(-4) === '.dds')
                {
                    texture = ThreeJS.loadDdsToTexture(modPath);
                    texture.filePath = modPath;
                    texture.flipY = false;
                }
                else
                {
                    let imageLoader = new THREE.ImageLoader();

                    imageLoader.load(
                        'file:///'+ modPath,
                        (image) => {
                            texture.image = image;
                            texture.needsUpdate = true;
                            texture.filePath = modPath;
                            texture.flipY = true;
                        }
                    );
                }

                return texture;
            }.bind(this)
        });
        ColladaData.handlerAdded = true;
    }

    convertToThreeJsScene(xmlString, path) {

        let resolvePromise = null;
        let rejectPromise = null;
        let promise = new Promise(function(resolve, reject) {
            resolvePromise = resolve;
            rejectPromise = reject;
        });

        let loader = ColladaLoader();
        loader.options.convertUpAxis = true;

        let boneCount = 0;
        let triangleCount = 0;

        this.setThreeJsLoaderHandlers();

        loader.parse(xmlString, function (collada) {

            let skeletons = [];
            let meshes = [];
            let animations = [];
            let wireframes = [];

            collada.scene.traverse(function (node)
            {
                if (node instanceof THREE.Mesh)
                {
                    meshes.push(node);
                    triangleCount += node.geometry.faces.length + 1;

                    let wireframeHelper = new THREE.WireframeHelper(node, 0xff0000);
                    node.add(wireframeHelper);
                    wireframes.push(wireframeHelper);
                    /*
                    let wireframeGeometry = new THREE.WireframeGeometry(node);
                    let wireframe = new THREE.LineSegments( wireframeGeometry );
                    wireframe.material.depthTest = false;
                    wireframe.material.opacity = 1;
                    wireframe.material.transparent = true;
                    wireframe.material.color = new THREE.Color( 0xff0000 );
                    node.add(wireframe);
                    wireframes.push(wireframe);
                    */
                }
                if (node instanceof THREE.SkinnedMesh)
                {
                    if (node.geometry.animation)
                    {
                        //let animation = new THREE.Animation(node, node.geometry.animation);
                        //animations.push(animation);
                    }

                    let skeletonHelper = new THREE.SkeletonHelper(node);
                    for (let k = 0; k < skeletonHelper.geometry.attributes.color.count; k += 2)
                    {
                        skeletonHelper.geometry.attributes.color[k] = new THREE.Color( 1, 0, 0 );
                        skeletonHelper.geometry.attributes.color[k+1] = new THREE.Color( 1, 1, 1 );
                    }

                    node.add(skeletonHelper);
                    skeletons.push(skeletonHelper);

                    boneCount += skeletonHelper.bones.length + 1;

                    // Flip the Y of texture UVs, because DDS textures are not flipped in WebGL :/
                    if (node.material.specularMap instanceof THREE.CompressedTexture) {
                        node.geometry.faceVertexUvs.forEach(function (v, k) {
                            v.forEach(function (vv, kk) {
                                node.geometry.faceVertexUvs[k][kk][0].y = 1 - node.geometry.faceVertexUvs[k][kk][0].y;
                                node.geometry.faceVertexUvs[k][kk][1].y = 1 - node.geometry.faceVertexUvs[k][kk][1].y;
                                node.geometry.faceVertexUvs[k][kk][2].y = 1 - node.geometry.faceVertexUvs[k][kk][2].y;
                            });
                        });
                    }
                }
            });

            // Bounding box
            let bb = new THREE.Box3();
            bb.setFromObject(collada.scene);
            let distance = Math.max(-bb.min.x, -bb.min.y, -bb.min.z, bb.max.x, bb.max.y, bb.max.z);

            resolvePromise({
                'object': collada.scene,
                'collada': collada,
                'distance': distance,
                'update': null,
                'triangleCount': triangleCount,
                'boneCount': boneCount,
                'meshes': meshes,
                'meshCount':  meshes.length,
                'animations': animations,
                'skeletons': skeletons,
                'wireframes': wireframes,
            });
        }, 'mod://' + path.replace(/\\/g, '/') +'/thefile.dae');

        return promise;
    }

    flipMatrixArray(data) {
        return [
            data[0], data[4], data[8], data[12],
            data[1], data[5], data[9], data[13],
            data[2], data[6], data[10], data[14],
            data[3], data[7], data[11], data[15]
        ];
    }
}