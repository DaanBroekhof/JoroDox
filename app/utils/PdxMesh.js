import * as THREE from 'three';
import { DDSLoader } from 'three-addons';
const jetpack = require('electron').remote.require('fs-jetpack');

export default class PdxMesh {
    static convertToThreeJsScene(pdxData, path) {
        let triangleCount = 0;
        let boneCount = 0;
        let skeletons = [];
        let wireframes = [];
        let colliders = [];
        let meshes = [];
        let labels = [];

        let maxExtent = 0;
        let maxExtentHeight = 0;

        path += (path === '' ? '' : '/');

        let scene = new THREE.Scene();

        // Iterate over 'shapes'
        for(let i = 0; i < pdxData.props['object'].children.length; i++)
        {
            if (pdxData.props['object'].children[i].type !== 'object')
                continue;

            let pdxShape = pdxData.props['object'].children[i];

            let bones = [];
            let bonesByName = {};
            if ('skeleton' in pdxShape.props)
            {
                let skeleton = pdxShape.props['skeleton'];

                let geometry = new THREE.Geometry();
                let material = new THREE.MeshBasicMaterial();
                material.wireframe = true;
                material.color = new THREE.Color(0x00FF00);

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


                let skeletonHelper = new THREE.SkeletonHelper(bones[0]);
                for (let k = 0; k < skeletonHelper.geometry.attributes.color.count; k += 2)
                {
                    skeletonHelper.geometry.attributes.color[k] = new THREE.Color( 1, 0, 0 );
                    skeletonHelper.geometry.attributes.color[k+1] = new THREE.Color( 1, 1, 1 );
                }
                scene.add(skeletonHelper);
                skeletons.push(skeletonHelper);

                scene.bones = bones;
                scene.bonesByName = bonesByName;
            }
            boneCount += bones.length;

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
                    let material = new THREE.MeshDepthMaterial();

                    let mesh = new THREE.SkinnedMesh(geometry, material);
                    mesh.name = pdxShape.children[j].name;
                    mesh.pdxData = pdxShape.children[j];
                    mesh.pdxPath = path;

                    PdxMesh.updatePdxMesh(mesh);

                    scene.add(mesh);

                    let wireframeGeometry = new THREE.WireframeGeometry(mesh);
                    let wireframe = new THREE.LineSegments( wireframeGeometry );
                    wireframe.material.depthTest = false;
                    wireframe.material.opacity = 1;
                    wireframe.material.transparent = true;
                    wireframe.material.color = new THREE.Color( 0xff0000 );
                    mesh.add(wireframe);
                    wireframes.push(wireframe);

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
                material.map = PdxMesh.loadDdsToTexture(mesh.pdxPath + pdxMaterial.diff);
                material.map.fileName = pdxMaterial.diff;
            }
            if ('n' in pdxMaterial && pdxMaterial.n !== 'nonormal.dds')
            {
                material.normalMap = this.loadDdsToTexture(mesh.pdxPath + pdxMaterial.n);
                material.normalMap.fileName = pdxMaterial.n;
            }
            if ('spec' in pdxMaterial && pdxMaterial.spec !== 'nospec.dds')
            {
                material.specularMap = this.loadDdsToTexture(mesh.pdxPath + pdxMaterial.spec);
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

            if (mesh.geometry.skinIndices.length)
                material.skinning = true;
            mesh.material = material;
        }

    }

    setPdxAnimation(viewScene, pdxAnimationData)
    {
        let deferred = $q.defer();

        let scene = viewScene.viewConfig.viewObject.object;

        if (!scene.bones || !scene.bones.length)
        {
            deferred.reject('Object does not contain bones.');
            return deferred.promise;
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
                if (scene.bonesByName[pdxAnimBone.name])
                    bone = scene.bonesByName[pdxAnimBone.name];
                if (!bone && alternativeNames[pdxAnimBone.name] && scene.bonesByName[alternativeNames[pdxAnimBone.name]])
                    bone = scene.bonesByName[alternativeNames[pdxAnimBone.name]];

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

        // Stop any existing animations
        for (let i = 0; i < viewScene.viewConfig.viewObject.animations.length; i++)
        {
            viewScene.viewConfig.viewObject.animations[i].stop();
        }
        viewScene.viewConfig.viewObject.animations = [];

        // 'Reset' skeleton and start new animation (if set)
        scene.traverse(function (subObject) {
            if (subObject instanceof THREE.SkinnedMesh)
                subObject.pose();
        });
        if (animationData)
        {
            let animation = new THREE.Animation(viewScene.viewConfig.viewObject.object.bones[0], animationData);
            animation.play();
            viewScene.viewConfig.viewObject.animations.push(animation);
        }
    }


    static loadDdsToTexture(file, geometry)
    {
        let ddsLoader = new DDSLoader();

        let texture = new THREE.CompressedTexture();
        let images = [];
        texture.image = images;

        jetpack.readAsync(file, 'buffer').then(function (buffer) {
            if (!buffer) {
                console.error('Could not load DDS texture `'+ file +'`');
                return;
            }

            let texDatas = ddsLoader._parser(buffer.buffer, true);

            if ( texDatas.isCubemap )
            {
                let faces = texDatas.mipmaps.length / texDatas.mipmapCount;

                for ( let f = 0; f < faces; f ++ )
                {
                    images[ f ] = { mipmaps : [] };

                    for ( let i = 0; i < texDatas.mipmapCount; i ++ )
                    {
                        images[ f ].mipmaps.push( texDatas.mipmaps[ f * texDatas.mipmapCount + i ] );
                        images[ f ].format = texDatas.format;
                        images[ f ].width = texDatas.width;
                        images[ f ].height = texDatas.height;
                    }
                }
            }
            else
            {
                texture.image.width = texDatas.width;
                texture.image.height = texDatas.height;
                texture.mipmaps = texDatas.mipmaps;
            }

            if ( texDatas.mipmapCount === 1 )
            {
                texture.minFilter = THREE.LinearFilter;
            }

            texture.format = texDatas.format;
            texture.needsUpdate = true;

            if (geometry)
            {
                geometry.buffersNeedUpdate = true;
                geometry.uvsNeedUpdate = true;
            }
        }, function () {
            let greyTexture = new Uint8Array(4);
            greyTexture[0] = 128;
            greyTexture[1] = 128;
            greyTexture[2] = 128;
            greyTexture[3] = 255;

            texture.mipmaps = [
                { "data": greyTexture, "width": 1, "height": 1 }
            ];
            texture.needsUpdate = true;
        });

        return texture;
    }
}