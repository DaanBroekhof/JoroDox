import * as THREE from 'three';
import { DDSLoader } from 'three-addons';
import ThreeJS from "./ThreeJS";
import ComputeTangents from './threejs/ComputeTangents';
const jetpack = require('electron').remote.require('fs-jetpack');
const path = require('electron').remote.require('path');

export default class PdxMesh {
    static convertToThreeJsScene(pdxData, path) {
        let triangleCount = 0;
        let boneCount = 0;
        let skeletons = [];
        let locatorSkeletons = [];
        let wireframes = [];
        let colliders = [];
        let meshes = [];
        let labels = [];

        let maxExtent = 0;
        let maxExtentHeight = 0;

        path += (path === '' ? '' : '/');

        let scene = new THREE.Scene();

        // Iterate over 'shapes'
        let locatorBones = [];
        for(let i = 0; i < pdxData.props['object'].children.length; i++)
        {
            if (pdxData.props['object'].children[i].type !== 'object')
                continue;

            let pdxShape = pdxData.props['object'].children[i];

            // Get all animation bone data
            let bones = [];
            let bonesByName = {};
            if ('skeleton' in pdxShape.props)
            {
                let skeleton = pdxShape.props['skeleton'];

                // Iterate over 'bones', load all
                for(let j = 0; j < skeleton.children.length; j++)
                {
                    let bone = new THREE.Bone();
                    bone.name = skeleton.children[j].name;
                    bone.boneNr = j;

                    bonesByName[bone.name] = bone;
                    bones.push(bone);

                    let pdxBone = skeleton.children[j].props;
                    let boneTx = pdxBone.tx;

                    let parent = scene;
                    if ('pa' in pdxBone)
                        parent = bones[pdxBone.pa];

                    // NOTE: input is in ROW-major order
                    let matrix = new THREE.Matrix4().set(
                        boneTx[0], boneTx[3], boneTx[6], boneTx[9],
                        boneTx[1], boneTx[4], boneTx[7], boneTx[10],
                        boneTx[2], boneTx[5], boneTx[8], boneTx[11],
                        0, 0, 0, 1
                    );

                    if (boneTx.every(function (tx) { return tx === 0; }))
                    {
                        console.log('Bone `'+ bone.name +'` is outside skeleton.');
                        matrix = new THREE.Matrix4();
                    }
                    else
                    {
                        matrix = new THREE.Matrix4().getInverse(matrix, true);
                        bone.applyMatrix(matrix);
                    }

                    if (parent !== scene)
                    {
                        parent.updateMatrix();

                        let matrixWorldInverse = new THREE.Matrix4();
                        matrixWorldInverse.getInverse(parent.matrixWorld, true);
                        bone.applyMatrix(matrixWorldInverse);
                    }

                    parent.add(bone);

                    bone.updateMatrixWorld(true);
                    bone.updateMatrix();

                    if (pdxBone.ix !== bones.length - 1)
                        console.log('Bone #'+ pdxBone.ix.data +' is not entry #'+ (bones.length-1));
                }

                scene.bones = bones;
                scene.bonesByName = bonesByName;
            }
            boneCount += bones.length;

            // Iterate over 'locators' to find any attached to bones
            for(let i = 0; i < pdxData.props['locator'].children.length; i++) {
                let locator = pdxData.props['locator'].children[i];

                let parentBone = null;

                if (!locator.props.pa) {
                   continue;
                }
                else if (bonesByName[locator.props.pa]) {
                    parentBone = bonesByName[locator.props.pa];
                }
                else {
                    console.warn('Unknown locator parent bone `'+ locator.props.pa +'`');
                    continue;
                }

                let locatorBone = new THREE.Bone();
                locatorBone.name = "locator:"+ locator.name;
                locatorBone.applyQuaternion(new THREE.Quaternion(locator.props.q[0], locator.props.q[1], locator.props.q[2], locator.props.q[3]));
                locatorBone.position.add(new THREE.Vector3(locator.props.p[0], locator.props.p[1], locator.props.p[2]));

                let indicatorBone = new THREE.Bone();
                indicatorBone.name = "locator-direction:"+ locator.name;
                indicatorBone.position.add(new THREE.Vector3(0, 0, -0.5));

                parentBone.add(locatorBone);
                locatorBone.add(indicatorBone);

                locatorBones.push(locatorBone);
                locatorBones.push(indicatorBone);
            }

            // Create skeleton (including any locators attached to them)
            if (scene.bones) {
                let skeletonHelper = new THREE.SkeletonHelper(scene.bones[0]);
                for (let k = 0; k < skeletonHelper.geometry.attributes.color.array.length; k += 6) {
                    let isLocator = !scene.bones[(k/6)];

                    skeletonHelper.geometry.attributes.color.array[k] = isLocator ? 0 : 1;
                    skeletonHelper.geometry.attributes.color.array[k + 1] = 0;
                    skeletonHelper.geometry.attributes.color.array[k + 2] = isLocator ? 1 : 0;
                    skeletonHelper.geometry.attributes.color.array[k + 3] = 1;
                    skeletonHelper.geometry.attributes.color.array[k + 4] = 1;
                    skeletonHelper.geometry.attributes.color.array[k + 5] = 1;
                }
                scene.add(skeletonHelper);
                skeletons.push(skeletonHelper);
            }

            // Iterate over 'objects in shapes'
            for(let j = 0; j < pdxShape.children.length; j++)
            {
                if (pdxShape.children[j].type !== 'object')
                    continue;

                let pdxMesh = pdxShape.children[j].props;

                if ('aabb' in pdxMesh)
                {
                    maxExtent = Math.max(maxExtent, -pdxMesh.aabb.props.min[0], -pdxMesh.aabb.props.min[1], -pdxMesh.aabb.props.min[2]);
                    maxExtent = Math.max(maxExtent, pdxMesh.aabb.props.max[0], pdxMesh.aabb.props.max[1], pdxMesh.aabb.props.max[2]);
                    maxExtentHeight = Math.max(maxExtentHeight, pdxMesh.aabb.props.max[1]);
                }

                if ('p' in pdxMesh)
                {
                    let geometry = new THREE.Geometry();

                    // Vertices
                    for (let k = 0; k < pdxMesh.p.length; k += 3)
                        geometry.vertices.push(new THREE.Vector3(pdxMesh.p[k], pdxMesh.p[k+1], pdxMesh.p[k+2]));
                    // Normals
                    let normals = [];
                    if ('n' in pdxMesh)
                        for (let k = 0; k < pdxMesh.n.length; k += 3)
                            normals.push(new THREE.Vector3(pdxMesh.n[k], pdxMesh.n[k+1], pdxMesh.n[k+2]));
                    // Tangents
                    let tangents = [];
                    if ('ta' in pdxMesh)
                        for (let k = 0; k < pdxMesh.ta.length; k += 4)
                            tangents.push(new THREE.Vector4(pdxMesh.ta[k], pdxMesh.ta[k+1], pdxMesh.ta[k+2], pdxMesh.ta[k+3]));
                    // Texture mapping
                    let textureMapping = [];
                    if ('u0' in pdxMesh)
                    {
                        for (let k = 0; k < pdxMesh.u0.length; k += 2)
                        {
                            textureMapping.push(new THREE.Vector2(pdxMesh.u0[k], pdxMesh.u0[k+1]));
                        }
                    }
                    // Skin
                    if ('skin' in pdxMesh)
                    {
                        let skin = pdxMesh.skin.props;
                        let influencesPerVertex = skin.bones;
                        // Stored per 4, but if less is used, this is stored for optimalization?
                        for (let k = 0; k < skin.ix.length; k += 4)
                        {
                            let a =                               skin.ix[k];
                            let b = ( influencesPerVertex > 1 ) ? skin.ix[k + 1] : -1;
                            let c = ( influencesPerVertex > 2 ) ? skin.ix[k + 2] : -1;
                            let d = ( influencesPerVertex > 3 ) ? skin.ix[k + 3] : -1;

                            geometry.skinIndices.push(new THREE.Vector4(a, b, c, d));
                        }
                        for (let k = 0; k < skin.w.length; k += 4)
                        {
                            let a =                               skin.w[k];
                            let b = ( influencesPerVertex > 1 ) ? skin.w[k + 1] : 0;
                            let c = ( influencesPerVertex > 2 ) ? skin.w[k + 2] : 0;
                            let d = ( influencesPerVertex > 3 ) ? skin.w[k + 3] : 0;

                            geometry.skinWeights.push(new THREE.Vector4(a, b, c, d));
                        }
                    }

                    // Faces
                    for (let k = 0; k < pdxMesh.tri.length; k += 3)
                    {
                        let f = new THREE.Face3(pdxMesh.tri[k], pdxMesh.tri[k+1], pdxMesh.tri[k+2]);
                        if (normals.length > 0)
                        {
                            f.vertexNormals = [
                                normals[pdxMesh.tri[k]],
                                normals[pdxMesh.tri[k+1]],
                                normals[pdxMesh.tri[k+2]]
                            ];
                        }
                        if (tangents.length > 0)
                        {
                            f.vertexTangents = [
                                tangents[pdxMesh.tri[k]],
                                tangents[pdxMesh.tri[k+1]],
                                tangents[pdxMesh.tri[k+2]]
                            ];
                        }
                        if (textureMapping.length > 0)
                        {
                            geometry.faceVertexUvs[0].push([
                                textureMapping[pdxMesh.tri[k]],
                                textureMapping[pdxMesh.tri[k+1]],
                                textureMapping[pdxMesh.tri[k+2]]
                            ]);
                        }
                        geometry.faces.push(f);
                    }
                    triangleCount += geometry.faces.length + 1;

                    // Material
                    let material = new THREE.Material();

                    let mesh = new THREE.SkinnedMesh(geometry, material);
                    mesh.name = pdxShape.children[j].name;
                    mesh.pdxData = pdxShape.children[j];
                    mesh.pdxPath = path;

                    PdxMesh.updatePdxMesh(mesh);

                    scene.add(mesh);

                    let wireframeHelper = new THREE.WireframeHelper(mesh, 0xff0000);
                    mesh.add(wireframeHelper);
                    wireframes.push(wireframeHelper);
                    /*
                    let wireframeGeometry = new THREE.WireframeGeometry(mesh);
                    let wireframe = new THREE.LineSegments( wireframeGeometry );
                    wireframe.material.depthTest = false;
                    wireframe.material.opacity = 1;
                    wireframe.material.transparent = true;
                    wireframe.material.color = new THREE.Color( 0xff0000 );
                    mesh.add(wireframe);
                    wireframes.push(wireframe);
                    */

                    if (scene.bones && scene.bones.length)
                    {
                        mesh.add(scene.bones[0]);
                        mesh.bind(new THREE.Skeleton(scene.bones));
                    }

                    mesh.pose();

                    if ('material' in pdxMesh && pdxMesh.material.props.shader === 'Collision')
                        colliders.push(mesh);

                    meshes.push(mesh);
                }
            }
        }


        // Iterate over 'locators' to find those not attached to bones
        let rootLocatorBone = null;
        for(let i = 0; i < pdxData.props['locator'].children.length; i++) {
            let locator = pdxData.props['locator'].children[i];

            if (locator.props.pa) {
                continue;
            }
            if (!rootLocatorBone) {
                rootLocatorBone = new THREE.Bone();
                rootLocatorBone.name = 'locator-root';
                scene.add(rootLocatorBone);
                locatorBones.push(rootLocatorBone);
            }

            let locatorBone = new THREE.Bone();
            locatorBone.name = "locator:"+ locator.name;
            locatorBone.applyQuaternion(new THREE.Quaternion(locator.props.q[0], locator.props.q[1], locator.props.q[2], locator.props.q[3]));
            locatorBone.position.add(new THREE.Vector3(locator.props.p[0], locator.props.p[1], locator.props.p[2]));

            let indicatorBone = new THREE.Bone();
            indicatorBone.name = "locator-direction:"+ locator.name;
            indicatorBone.position.add(new THREE.Vector3(0, 0, -0.5));

            rootLocatorBone.add(locatorBone);
            locatorBone.add(indicatorBone);

            locatorBones.push(locatorBone);
            locatorBones.push(indicatorBone);
        }

        // Any locators bound to the root
        if (rootLocatorBone) {
            let skeletonHelper = new THREE.SkeletonHelper(rootLocatorBone);
            for (let k = 0; k < skeletonHelper.geometry.attributes.color.array.length; k += 6) {
                skeletonHelper.geometry.attributes.color.array[k] = 0;
                skeletonHelper.geometry.attributes.color.array[k + 1] = 0;
                skeletonHelper.geometry.attributes.color.array[k + 2] = 1;
                skeletonHelper.geometry.attributes.color.array[k + 3] = 1;
                skeletonHelper.geometry.attributes.color.array[k + 4] = 1;
                skeletonHelper.geometry.attributes.color.array[k + 5] = 1;
            }
            scene.add(skeletonHelper);
            locatorSkeletons.push(skeletonHelper);
        }


        return {
            'object': scene,
            'distance': maxExtent,
            'maxExtentHeight': maxExtentHeight,
            'labels': labels,
            'triangleCount': triangleCount,
            'boneCount': boneCount,
            'meshCount': meshes.length,
            'meshes': meshes,
            'animations': [],
            'colliders': colliders,
            'skeletons': skeletons,
            'wireframes': wireframes,
            'locatorCount': pdxData.props['locator'].children.length,
            'locatorBones': locatorBones,
            'locatorSkeletons': locatorSkeletons,
        };
    }

    static updatePdxMesh(mesh)
    {
        if (!mesh.pdxData)
            return;

        let pdxMaterial = mesh.pdxData.props.material.props;

        if (pdxMaterial.shader === 'Collision')
        {
            let material = new THREE.MeshBasicMaterial();
            material.wireframe = true;
            material.color = new THREE.Color(0, 1, 0);

            mesh.material = material;
        }
        else
        {
            if (!(pdxMaterial.shader === 'PdxMeshTextureAtlas'
                    || pdxMaterial.shader === 'PdxMeshAlphaBlendNoZWrite'
                    || pdxMaterial.shader === 'PdxMeshColor'
                    || pdxMaterial.shader === 'PdxMeshStandard'
                    || pdxMaterial.shader === 'PdxMeshSnow'
                    || pdxMaterial.shader === 'PdxMeshAlphaBlend'
                    || pdxMaterial.shader === 'PdxMeshStandard_NoFoW_NoTI'
                    || pdxMaterial.shader === 'JdxMeshShield'
                    || pdxMaterial.shader === 'JdxMeshShieldTextureAtlas'))
            {
                console.log('Unknown shader: '+ pdxMaterial.shader);
            }

            let material = new THREE.MeshPhongMaterial();
            if ('diff' in pdxMaterial && pdxMaterial.diff !== 'nodiff.dds')
            {
                material.map = ThreeJS.loadDdsToTexture(mesh.pdxPath + pdxMaterial.diff);
                material.map.fileName = pdxMaterial.diff;
            }
            if ('n' in pdxMaterial && pdxMaterial.n !== 'nonormal.dds')
            {
                material.normalMap = ThreeJS.loadDdsToTexture(mesh.pdxPath + pdxMaterial.n);
                material.normalMap.fileName = pdxMaterial.n;
            }
            if ('spec' in pdxMaterial && pdxMaterial.spec !== 'nospec.dds')
            {
                material.specularMap = ThreeJS.loadDdsToTexture(mesh.pdxPath + pdxMaterial.spec);
                material.specularMap.fileName = pdxMaterial.spec;
            }

            if (pdxMaterial.shader === 'PdxMeshAlphaBlendNoZWrite')
            {
                material.transparent = true;
            }
            if (pdxMaterial.shader === 'PdxMeshAlphaBlend')
            {
                material.transparent = true;
            }
            if (pdxMaterial.shader === 'PdxMeshPortrait')
            {
                material.transparent = true;
            }
            if (pdxMaterial.shader === 'PdxMeshNavigationButton')
            {
                material.transparent = true;
            }
            if (pdxMaterial.shader === 'PdxMeshAtmosphere' || pdxMaterial.pdxShader === 'PdxMeshAtmosphereStar' || pdxMaterial.shader === 'PdxMeshStar')
            {
                material.transparent = true;
                material.blending = THREE['MultiplyBlending'];

            }
            if (pdxMaterial.shader === 'PdxMeshClouds')
            {
                material.transparent = true;

            }
            if (pdxMaterial.shader.startsWith('PdxMeshAlphaAdditive')) {
                material.transparent = true;
                material.blending = THREE['AdditiveBlending'];
            }


            if (mesh.geometry.skinIndices.length)
                material.skinning = true;
            mesh.material = material;

            mesh.pdxShader = pdxMaterial.shader;
        }

    }

    static setPdxAnimation(scene, pdxAnimationData)
    {
        if (!scene.object.bones || !scene.object.bones.length)
        {
            return;
        }

        let animationData = null;

        if (pdxAnimationData)
        {
            let pdxAnimProps = pdxAnimationData.props.info.props;

            animationData = {
                'name': 'test',
                'fps': pdxAnimProps.fps,
                'length': pdxAnimProps.sa / pdxAnimProps.fps,
                'hierarchy': [],
                // PDX Extra:
                sampleCount: pdxAnimProps.sa,
            };

            let tBones = [];
            let qBones = [];
            let sBones = [];

            let alternativeNames = {
                'attack_L_hand': 'Left_hand_node',
                'attack_R_hand': 'Right_hand_node',
            };

            for (let k = 0; k < pdxAnimationData.props.info.children.length; k++)
            {
                let pdxAnimBone = pdxAnimationData.props.info.children[k];

                if (pdxAnimBone.type !== 'object')
                    continue;

                let bone = null;
                // Assign 'base' animation state
                if (scene.object.bonesByName[pdxAnimBone.name])
                    bone = scene.object.bonesByName[pdxAnimBone.name];
                if (!bone && alternativeNames[pdxAnimBone.name] && scene.object.bonesByName[alternativeNames[pdxAnimBone.name]])
                    bone = scene.object.bonesByName[alternativeNames[pdxAnimBone.name]];

                if (bone)
                {
                    animationData.hierarchy.push({
                        parent: bone.parent instanceof THREE.Bone ? bone.parent.boneNr : -1,
                        name: pdxAnimBone.name,
                        keys:[{time: 0, pos: pdxAnimBone.props.t, rot: pdxAnimBone.props.q, scl: [pdxAnimBone.props.s, pdxAnimBone.props.s, pdxAnimBone.props.s]}],
                        // PDX Extra:
                        sampleT: pdxAnimBone.props.sa.indexOf('t') !== -1,
                        sampleQ: pdxAnimBone.props.sa.indexOf('q') !== -1,
                        sampleS: pdxAnimBone.props.sa.indexOf('s') !== -1,
                        skipData: false,
                    });
                }
                else
                {
                    console.log('Animation bone '+ pdxAnimBone.name +' not found in model.');

                    animationData.hierarchy.push({
                        parent: -1,
                        name: pdxAnimBone.name,
                        keys:[{time: 0, pos: pdxAnimBone.props.t, rot: pdxAnimBone.props.q, scl: [pdxAnimBone.props.s, pdxAnimBone.props.s, pdxAnimBone.props.s]}],
                        // PDX Extra:
                        sampleT: pdxAnimBone.props.sa.indexOf('t') !== -1,
                        sampleQ: pdxAnimBone.props.sa.indexOf('q') !== -1,
                        sampleS: pdxAnimBone.props.sa.indexOf('s') !== -1,
                        skipData: true,
                    });
                }
            }


            let offsetT = 0;
            let offsetQ = 0;
            let offsetS = 0;
            let pdxAnimSamples = pdxAnimationData.props.samples.props;
            for (let sample = 0; sample < animationData.sampleCount; sample++ )
            {
                for(let k = 0; k < animationData.hierarchy.length; k++)
                {
                    let hier = animationData.hierarchy[k];
                    if (hier.sampleT || hier.sampleQ || hier.sampleS)
                    {
                        let key = {};

                        key.time = sample * (1/animationData.fps);

                        if (hier.sampleT)
                        {
                            key.pos = [pdxAnimSamples.t[offsetT], pdxAnimSamples.t[offsetT + 1], pdxAnimSamples.t[offsetT + 2]];
                            offsetT += 3;
                        }

                        if (hier.sampleQ)
                        {
                            key.rot = [pdxAnimSamples.q[offsetQ], pdxAnimSamples.q[offsetQ + 1], pdxAnimSamples.q[offsetQ + 2], pdxAnimSamples.q[offsetQ + 3]];
                            offsetQ += 4;
                        }

                        if (hier.sampleS)
                        {
                            key.scl = [pdxAnimSamples.s[offsetS], pdxAnimSamples.s[offsetS], pdxAnimSamples.s[offsetS]];
                            offsetS += 1;
                        }

                        hier.keys.push(key);
                    }
                }
            }
        }

        /*
        if (!scene.object.animations)
            scene.object.animations = new Array();

        // Stop any existing animations
        for (let i = 0; i < scene.object.animations.length; i++)
        {
            scene.object.animations[i].stop();
        }
        scene.object.animations = [];
        */
        if (scene.animationMixer)
            scene.animationMixer.stopAllAction();

        // 'Reset' skeleton and start new animation (if set)
        let subSkinnedMeshes = [];
        scene.object.traverse(function (subObject) {
            if (subObject instanceof THREE.SkinnedMesh) {
                subSkinnedMeshes.push(subObject);
                subObject.pose();
            }
        });

        if (animationData)
        {
            let animationClip = THREE.AnimationClip.parseAnimation(animationData, scene.object.bones);
            //scene.object.animations.push(animationClip);

            let mixer = new THREE.AnimationMixer(new THREE.AnimationObjectGroup(...subSkinnedMeshes));
            let action = mixer.clipAction(animationClip);
            action.play();
            scene.animationMixer = mixer;
        }
    }

    createFromThreeJsObject(object, options) {

        if (!options)
            options = {
                textureBaseName: 'unknown',
                pdxShader: 'PdxMeshStandard',
            };

        let pdxDataRoot = {name: 'pdxData', type: 'object', children: []};
        pdxDataRoot.children.push({name: 'pdxasset', type: 'int', data: [1, 0]});

        let objectsRoot = {name: 'object', type: 'object', children: []};
        pdxDataRoot.children.push(objectsRoot);
        pdxDataRoot.children.push({name: 'locator', type: 'object', children: []});

        let shapeRoot = {name: 'jorodoxShape', type: 'object', children: []};
        objectsRoot.children.push(shapeRoot);

        // Get bones
        let boneList = this.getBoneListRooted(object);
        let boneData = [];
        let boneNrToHeirarchyBoneNr = [];
        boneNrToHeirarchyBoneNr[-1] = -1;
        if (boneList.length > 0)
        {
            let multipleRootBones = (boneList[0].name === 'AddedRoot');

            for (let i = 0; i < boneList.length; i++)
            {
                // pdxmesh uses a 3x4 transform matrix for bones in the world space, whereas Three.js uses a 4x4 matrix (local&world space)
                // we have to transform it and snip off the 'skew' row

                boneList[i].updateMatrix();
                boneList[i].updateMatrixWorld(true);
                boneList[i].parent.updateMatrix();
                boneList[i].parent.updateMatrixWorld(true);

                // Get matrix of bone in world matrix
                let pdxMatrix = new THREE.Matrix4().multiplyMatrices(boneList[i].parent.matrixWorld, boneList[i].matrix);
                pdxMatrix = new THREE.Matrix4().getInverse(pdxMatrix, true);
                let m = pdxMatrix.elements;

                let parentBoneNr = boneList[i].parent.boneNr;

                // Set to added root bone
                if (!(boneList[i].parent instanceof THREE.Bone) && multipleRootBones && i !== 0)
                    parentBoneNr = 0;

                // NOTE: m is in COLUMN-major order
                boneData.push({
                    name: boneList[i].name,
                    type: 'object',
                    children: [
                        {name: 'ix', type: 'int', data: [i]},
                        {name: 'pa', type: 'int', data: [boneList[i].parent.boneNr]},
                        {name: 'tx', type: 'float', data: [
                                m[0], m[1], m[2],
                                m[4], m[5], m[6],
                                m[8], m[9], m[10],
                                m[12], m[13], m[14],
                            ]},
                    ]
                });

                if (parentBoneNr === undefined)
                {
                    // Remove 'pa' at root node
                    boneData[i].children = [boneData[i].children[0], boneData[i].children[2]];
                }
            }
        }

        // find all geometry
        object.traverse(function (subObject) {
            if (subObject instanceof THREE.Mesh)
            {
                if (subObject.skeleton && subObject.skeleton.bones)
                {
                    for (let i = 0; i < subObject.skeleton.bones.length; i++)
                    {
                        for (let k = 0; k < boneList.length; k++)
                        {
                            if (subObject.skeleton.bones[i].name === boneList[k].name)
                            {
                                boneNrToHeirarchyBoneNr[i] = k;
                                break;
                            }
                        }
                    }
                }

                // Bounding box
                let bb = new THREE.Box3();
                bb.setFromObject(subObject);

                // Scale / rotate to world
                subObject.geometry.applyMatrix(subObject.matrixWorld);

                // Calculate unique data-set indices for each vertex
                let getVertexHash = function (itemNr, attributes) {
                    let arr = [];
                    for (const [attributeName, attribute] of Object.entries(attributes)) {
                        arr.push(attribute.array.slice(itemNr * attribute.itemSize, (itemNr+1) * attribute.itemSize));
                    }
                    return arr.join('|');
                };
                let vertexIndex = [];
                let reverseVertexIndex = [];
                let nrVerts = subObject.geometry.attributes.position.count;
                let indexLookup = new Map();
                for (let k = 0; k < nrVerts; k++) {
                    let hash = getVertexHash(k, subObject.geometry.attributes);
                    if (!indexLookup.has(hash)) {
                        indexLookup.set(hash, reverseVertexIndex.length);
                        reverseVertexIndex[reverseVertexIndex.length] = k;
                    }
                    vertexIndex[k] = indexLookup.get(hash);
                }

                // Calculate vertex tangents
                ComputeTangents.computeTangents( subObject.geometry );

                // Apply index on each attribute
                let getIndexedAttribute = function (attribute, reverseVertexIndex) {
                    let data = [];
                    for (let i = 0; i < reverseVertexIndex.length; i++) {
                        data.push(...attribute.array.slice(attribute.itemSize * reverseVertexIndex[i], attribute.itemSize * (reverseVertexIndex[i] + 1)));
                    }
                    return data;
                };
                let indexedPositions = getIndexedAttribute(subObject.geometry.attributes.position, reverseVertexIndex);
                let indexedNormals = getIndexedAttribute(subObject.geometry.attributes.normal, reverseVertexIndex);
                let indexedTangents = getIndexedAttribute(subObject.geometry.attributes.tangent, reverseVertexIndex);
                let indexedSkinIndexes = getIndexedAttribute(subObject.geometry.attributes.skinIndex, reverseVertexIndex);
                let indexedSkinWeights = getIndexedAttribute(subObject.geometry.attributes.skinWeight, reverseVertexIndex);
                let indexedUVs = [];
                if (subObject.geometry.attributes.uv)
                    indexedUVs.push(getIndexedAttribute(subObject.geometry.attributes.uv, reverseVertexIndex));
                if (subObject.geometry.attributes.uv1)
                    indexedUVs.push(getIndexedAttribute(subObject.geometry.attributes.uv1, reverseVertexIndex));
                if (subObject.geometry.attributes.uv2)
                    indexedUVs.push(getIndexedAttribute(subObject.geometry.attributes.uv2, reverseVertexIndex));

                // Calculate some meta-data for Paradox texture skinning
                // - Max nr of skin-to-bone references per vertex
                // - Set '-1' of unused skin indexes
                let maxBonesUsed = 0;
                for (let i = 0; i < indexedSkinWeights.length; i += 4) {
                    for (let k = 0; k < 4; k++) {
                        if (indexedSkinWeights[i+k] === 0) {
                            indexedSkinIndexes[i+k] = -1;
                        }
                        else {
                            indexedSkinIndexes[i+k] = boneNrToHeirarchyBoneNr[indexedSkinIndexes[i+k]];
                        }
                    }
                    let bonesUsedInVertex = Math.ceil(indexedSkinWeights[i]) + Math.ceil(indexedSkinWeights[i+1]) + Math.ceil(indexedSkinWeights[i+2]) + Math.ceil(indexedSkinWeights[i+3]);
                    maxBonesUsed = Math.max(maxBonesUsed, bonesUsedInVertex);
                }

                let textureFiles = {
                    diffuse: options.textureBaseName +'_diffuse.dds',
                    normal: options.textureBaseName +'_normal.dds',
                    specular: options.textureBaseName +'_spec.dds',
                };
                if (subObject.material.map && subObject.material.map.filePath) {
                    textureFiles.diffuse = path.basename(subObject.material.map.filePath);
                }
                if (subObject.material.specularMap && subObject.material.specularMap.filePath) {
                    textureFiles.specular = path.basename(subObject.material.specularMap.filePath);
                }
                if (subObject.material.normalMap && subObject.material.normalMap.filePath) {
                    textureFiles.normal = path.basename(subObject.material.normalMap.filePath);
                }

                let mesh = {name: 'mesh', type: 'object', children: []};
                mesh.children.push({name: 'p', type: 'float', data: indexedPositions});
                mesh.children.push({name: 'n', type: 'float', data: indexedNormals});
                mesh.children.push({name: 'ta', type: 'float', data: indexedTangents});
                for (let i = 0; i < indexedUVs.length; i++)
                    mesh.children.push({name: 'u' + i, type: 'float', data: indexedUVs[i]});
                mesh.children.push({name: 'tri', type: 'int', data: vertexIndex});
                mesh.children.push({name: 'aabb', type: 'object', children: [
                        {name: 'min', type: 'float', data: [bb.min.x, bb.min.y, bb.min.z]},
                        {name: 'max', type: 'float', data: [bb.max.x, bb.max.y, bb.max.z]},
                    ]});
                mesh.children.push({name: 'material', type: 'object', children: [
                        {name: 'shader', type: 'string', data: options.pdxShader ? options.pdxShader : 'PdxMeshStandard', nullByteString: true},
                        {name: 'diff', type: 'string', data: textureFiles.diffuse, nullByteString: true},
                        {name: 'n', type: 'string', data: textureFiles.normal, nullByteString: true},
                        {name: 'spec', type: 'string', data: textureFiles.specular, nullByteString: true},
                    ]});
                shapeRoot.children.push(mesh);

                if (boneData.length)
                {
                    mesh.children.push({name: 'skin', type: 'object', children: [
                        {name: 'bones', type: 'int', data: [maxBonesUsed]},
                        {name: 'ix', type: 'int', data: indexedSkinIndexes},
                        {name: 'w', type: 'float', data: indexedSkinWeights},
                    ]});
                }
            }
        }.bind(this));

        if (boneData.length)
            shapeRoot.children.push({name: 'skeleton', type: 'object', children: boneData});

        return pdxDataRoot;
    }

    getBoneListRooted(object) {

        let boneList = this.getBoneList(object);

        if (boneList.length > 0)
        {
            let multipleRootBones = false;
            let filteredBoneList = [];
            let boneByName = {};
            for (let i = 0; i < boneList.length; i++)
            {
                // Skip double bones by name
                if (boneByName[boneList[i].name])
                    continue;

                boneByName[boneList[i].name] = boneList[i];

                filteredBoneList.push(boneList[i]);
                boneList[i].boneNr = filteredBoneList.length - 1;

                if (!(boneList[i].parent instanceof THREE.Bone) && i !== 0)
                {
                    multipleRootBones = true;
                }
            }

            // Multiple roots - add a new single root
            if (multipleRootBones)
            {
                let newRoot = new THREE.Bone();
                newRoot.name = 'AddedRoot';
                object.add(newRoot);
                filteredBoneList.unshift(newRoot);
            }
            return filteredBoneList;
        }

        return boneList;
    }

    getBoneList(object, parentNr) {

        let boneList = [];

        if (object instanceof THREE.Bone)
        {
            boneList.push(object);
            object.boneParentNr = parentNr;
        }

        for (let i = 0; i < object.children.length; i++)
        {
            boneList.push.apply(boneList, this.getBoneList(object.children[i]));
        }

        return boneList;
    }

    insertValues(array, offset, values) {
        for (let i = 0; i < values.length; i++)
        {
            array[offset + i] = values[i];
        }
        return array;
    }

    convertToPdxAnim(animation, viewObject) {
        let pdxDataRoot = {
            name: 'pdxData',
            type: 'object',
            children: [
                {name: 'pdxasset', type: 'int', data: [1, 0]},
            ]
        };

        // Re-order tracks by boneList order
        let tracksPerBone = [];
        let boneList = this.getBoneListRooted(viewObject);
        let sampleCount = 0;
        let trackCount = 0;
        let fps = 0;
        for (let i = 0; i < boneList.length; i++)
        {
            tracksPerBone[i] = [];
            for (let k = 0; k < animation.tracks.length; k++)
            {
                let trackFps = animation.tracks[k].times.length / animation.tracks[k].times[animation.tracks[k].times.length - 1];

                if (animation.tracks[k].name === boneList[i].uuid +'.position')
                {
                    tracksPerBone[i]['position'] = animation.tracks[k];
                    animation.tracks[k].found = true;
                }
                else if (animation.tracks[k].name === boneList[i].uuid +'.scale')
                {
                    tracksPerBone[i]['scale'] = animation.tracks[k];
                    animation.tracks[k].found = true;
                }
                else if (animation.tracks[k].name === boneList[i].uuid +'.quaternion')
                {
                    tracksPerBone[i]['quaternion'] = animation.tracks[k];
                    animation.tracks[k].found = true;
                }
                else {
                    continue;
                }
                trackCount++;
                sampleCount = Math.max(sampleCount, animation.tracks[k].times.length);
                fps = Math.max(fps, trackFps)
            }
        }
        for (let k = 0; k < animation.tracks.length; k++) {
            if (!animation.tracks[k].found)
                console.log('Could not find bone for track `' + animation.tracks[k].name + '`.');
        }

        let trackArray = [trackCount];
        let pdxInfo = {name: 'info', type: 'object', children: [
                {name: 'fps', type: 'float', data: [fps]},
                {name: 'sa', type: 'int', data: [sampleCount]},
                {name: 'j', type: 'int', data: trackArray},
            ]};
        pdxDataRoot.children.push(pdxInfo);

        // Set the 'start' positions of the animation, and detect if there are any changed from that start-position,
        // for each animation type (position, rotation and/or scale)
        let boneData = [];
        for (let i = 0; i < tracksPerBone.length; i++)
        {
            boneData[i] = {
                name: boneList[i].name,
                hasTransformChange: false,
                hasRotationChange: false,
                hasScaleChange: false,
                startPos: [0, 0, 0],
                startQuat: [0, 0, 0, 1],
                startScale: [1],
            };

            if (tracksPerBone[i]['position']) {
                boneData[i].startPos = tracksPerBone[i]['position'].values.slice(0, 3);
                for (let j = 0; j < tracksPerBone[i]['position'].values.length; j += 3) {
                    if (!this.epsilonArrayEquals(boneData[i].startPos, tracksPerBone[i]['position'].values.slice(j, j + 3))) {
                        boneData[i].hasTransformChange = true;
                        break;
                    }
                }
                if (!boneData[i].hasTransformChange)
                    trackArray[0]--;
            }
            if (tracksPerBone[i]['quaternion']) {
                boneData[i].startQuat = tracksPerBone[i]['quaternion'].values.slice(0, 4);
                for (let j = 0; j < tracksPerBone[i]['quaternion'].values.length; j += 4) {
                    if (!this.epsilonArrayEquals(boneData[i].startQuat, tracksPerBone[i]['quaternion'].values.slice(j, j + 4))) {
                        boneData[i].hasRotationChange = true;
                        break;
                    }
                }
                if (!boneData[i].hasRotationChange)
                    trackArray[0]--;
            }
            if (tracksPerBone[i]['scale']) {
                boneData[i].startScale = tracksPerBone[i]['scale'].values.slice(0, 1);
                for (let j = 0; j < tracksPerBone[i]['scale'].values.length; j += 3) {
                    if (!this.epsilonArrayEquals(boneData[i].startScale, tracksPerBone[i]['quaternion'].values.slice(j, j + 3))) {
                        boneData[i].hasScaleChange = true;
                        break;
                    }
                }
                if (!boneData[i].hasScaleChange)
                    trackArray[0]--;
            }

            let sampleFrom = '';
            if (boneData[i].hasTransformChange)
                sampleFrom += 't';
            if (boneData[i].hasRotationChange)
                sampleFrom += 'q';
            if (boneData[i].hasScaleChange)
                sampleFrom += 's';

            let pdxBoneData = {
                name: boneData[i].name,
                type: 'object',
                children: [
                    {name: 'sa', type: 'string', data: sampleFrom, nullByteString: true},
                    {name: 't', type: 'float', data: boneData[i].startPos},
                    {name: 'q', type: 'float', data: boneData[i].startQuat},
                    {name: 's', type: 'float', data: boneData[i].startScale},
                ]
            };

            pdxInfo.children.push(pdxBoneData);
        }

        // Collect all samples. We assume a smooth time-step, and no missing 'keys'.
        // (this is what the collada importer currently does)
        // (we could expand this to support interpolation, etc - but too much work)

        let pdxSamples = {name: 'samples', type: 'object', children: []};
        pdxDataRoot.children.push(pdxSamples);
        let samples = {
            t: [],
            q: [],
            s: [],
        };

        // We can interpolate values according to the highest fps & sample count
        for (let k = 0; k < sampleCount; k++)
        {
            let keyTime = k * (1 / fps);

            for (let i = 0; i < tracksPerBone.length; i++)
            {
                if (boneData[i].hasTransformChange) {
                    samples.t.push(...tracksPerBone[i]['position'].createInterpolant().evaluate(keyTime));
                }
                if (boneData[i].hasRotationChange) {
                    samples.q.push(...tracksPerBone[i]['quaternion'].createInterpolant().evaluate(keyTime));
                }
                if (boneData[i].hasScaleChange) {
                    let scaleValues = tracksPerBone[i]['scale'].createInterpolant().evaluate(keyTime);
                    samples.s.push(scaleValues[0]);

                    if (!this.epsilonEquals(scaleValues[0], scaleValues[1])
                        || !this.epsilonEquals(scaleValues[0], scaleValues[2]))
                    {
                        console.log('Usage of non-cubic scale!');
                    }
                }
            }
        }

        if (samples.t.length > 0)
            pdxSamples.children.push({name: 't', type: 'float', data: samples.t});
        if (samples.q.length > 0)
            pdxSamples.children.push({name: 'q', type: 'float', data: samples.q});
        if (samples.s.length > 0)
            pdxSamples.children.push({name: 's', type: 'float', data: samples.s});

        return pdxDataRoot;
    }


    epsilonEquals(a, b) {
        let epsilon = 0.00001;

        return (Math.abs(a - b) < epsilon);
    }

    epsilonArrayEquals(a, b) {
        let epsilon = 0.00001;

        for (let i = 0, l = a.length; i < l; i++)
        {
            if (Math.abs(a[i] - b[i]) > epsilon)
                return false;
        }
        return true;
    }
}