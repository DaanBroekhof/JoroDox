import ColladaLoader from 'threejs/ColladaLoader';

export default class PdxRendering {
    handlerAdded: false;

    insertValues(array, offset, values) {
      for (let i = 0; i < values.length; i++) {
        array[offset + i] = values[i];
      }
      return array;
    }

    getBoneList(object, parentNr) {
      const boneList = [];

      if (object instanceof THREE.Bone) {
        boneList.push(object);
        object.boneParentNr = parentNr;
      }

      for (let i = 0; i < object.children.length; i++) {
        boneList.push(...this.getBoneList(object.children[i]));
      }

      return boneList;
    }

    getBoneListRooted(object) {
      const boneList = this.getBoneList(object);

      if (boneList.length > 0) {
        let multipleRootBones = false;
        const filteredBoneList = [];
        const boneByName = {};
        for (let i = 0; i < boneList.length; i++) {
          // Skip double bones by name
          if (boneByName[boneList[i].name]) { continue; }

          boneByName[boneList[i].name] = boneList[i];

          filteredBoneList.push(boneList[i]);
          boneList[i].boneNr = filteredBoneList.length - 1;

          if (!(boneList[i].parent instanceof THREE.Bone) && i !== 0) {
            multipleRootBones = true;
          }
        }

        // Multiple roots - add a new single root
        if (multipleRootBones) {
          const newRoot = new THREE.Bone();
          newRoot.name = 'AddedRoot';
          object.add(newRoot);
          filteredBoneList.unshift(newRoot);
        }
        return filteredBoneList;
      }

      return boneList;
    }


    epsilonEquals(a, b) {
      const epsilon = 0.00001;

      return (Math.abs(a - b) < epsilon);
    }

    epsilonArrayEquals(a, b) {
      const epsilon = 0.00001;

      for (let i = 0, l = a.length; i < l; i++) {
        if (Math.abs(a[i] - b[i]) > epsilon) { return false; }
      }
      return true;
    }

    convertMultipleToPdxAnim(animations, viewObject) {
      const pdxDataRoot = {
        name: 'pdxData',
        type: 'object',
        subNodes: [
          {name: 'pdxasset', type: 'int', data: [1, 0]},
        ]
      };

        // Re-order hierarchy by boneList order
      const multiHierarchies = [];
      const boneList = this.getBoneListRooted(viewObject);
      let sampleCount = 0;
      for (let i = 0; i < boneList.length; i++) {
        multiHierarchies[i] = [];
        for (let j = 0; j < animations.length; j++) {
          const animation = animations[j].animation;
          for (let k = 0; k < animation.data.hierarchy.length; k++) {
            if (animation.data.hierarchy[k].name === boneList[i].name) {
              multiHierarchies[i].push(animation.data.hierarchy[k]);
              sampleCount = Math.max(sampleCount, animation.data.hierarchy[k].keys.length);
              break;
            }
          }
        }
      }

      const pdxInfo = {
        name: 'info',
        type: 'object',
        subNodes: [
          {name: 'fps', type: 'float', data: [animation.data.fps]},
          {name: 'sa', type: 'int', data: [sampleCount]},
          {name: 'j', type: 'int', data: [multiHierarchies.length]},
        ]
      };
      pdxDataRoot.subNodes.push(pdxInfo);

      // Set the 'start' positions of the animation, and detect if there are any changed from that start-position,
      // for each animation type (position, rotation and/or scale)
      const boneData = [];
      for (let i = 0; i < multiHierarchies.length; i++) {
        boneData[i] = {
          name: boneList[i].name,
          hasTransformChange: false,
          hasRotationChange: false,
          hasScaleChange: false,
          startPos: [0, 0, 0],
          startQuat: [0, 0, 0, 1],
          startScale: [1],
        };

        for (let j = 0; j < multiHierarchies[i].length; j++) {
          animNode = multiHierarchies[i][j];

          const startKey = animNode.keys[0];

          animNode.hasTransformChange = animNode.keys.some((key) => !this.epsilonArrayEquals(key.pos, startKey.pos));
          animNode.hasRotationChange = animNode.keys.some((key) => !this.epsilonArrayEquals(key.rot.toArray(), startKey.rot.toArray()));
          animNode.hasScaleChange = animNode.keys.some((key) => !this.epsilonArrayEquals(key.scl, startKey.scl));

          boneData[i].hasTransformChange = boneData[i].hasTransformChange || animNode.hasTransformChange;
          boneData[i].hasRotationChange = boneData[i].hasRotationChange || animNode.hasRotationChange;
          boneData[i].hasScaleChange = boneData[i].hasScaleChange || animNode.hasScaleChange;

          boneData[i].startPos = animNode.keys[0].pos;
          boneData[i].startQuat = animNode.keys[0].rot.toArray();
          boneData[i].startScale = [animNode.keys[0].scl[0]];
        }

        let sampleFrom = '';
        if (boneData[i].hasTransformChange) { sampleFrom += 't'; }
        if (boneData[i].hasRotationChange) { sampleFrom += 'q'; }
        if (boneData[i].hasScaleChange) { sampleFrom += 's'; }

        const pdxBoneData = {
          name: boneData[i].name,
          type: 'object',
          subNodes: [
            {
              name: 'sa', type: 'string', data: sampleFrom, nullByteString: true
            },
            {name: 't', type: 'float', data: boneData[i].startPos},
            {name: 'q', type: 'float', data: boneData[i].startQuat},
            {name: 's', type: 'float', data: boneData[i].startScale},
          ]
        };

        pdxInfo.subNodes.push(pdxBoneData);
      }

      // Collect all samples. We assume a smooth time-step, and no missing 'keys'.
      // (this is what the collada importer currently does)
      // (we could expand this to support interpolation, etc - but too much work)

      const pdxSamples = {name: 'samples', type: 'object', subNodes: []};
      pdxDataRoot.subNodes.push(pdxSamples);
      const samples = {
        t: [],
        q: [],
        s: [],
      };

      for (let k = 0; k < sampleCount; k++) {
        // Assume all keys have same key time (for now)
        // Take first keyTime found
        let keyTime = null;

        for (let i = 0; i < multiHierarchies.length; i++) {
          for (let j = 0; j < multiHierarchies[i].length; j++) {
            const animNode = multiHierarchies[i][j];
            const key = animNode.keys[k];
            const boneInfo = boneData[i];

            if (keyTime === null) { keyTime = key.time; }

            if (keyTime !== key.time) {
              console.log('Key frames are not equally timed!');
              console.log(key);
            }

            if (animNode.hasTransformChange) { samples.t.push(key.pos[0], key.pos[1], key.pos[2]); }
            if (animNode.hasRotationChange) { samples.q.push(key.rot.x, key.rot.y, key.rot.z, key.rot.w); }
            if (animNode.hasScaleChange) {
              if (!this.epsilonEquals(key.scl[0], key.scl[1]) || !this.epsilonEquals(key.scl[0], key.scl[2]) || !this.epsilonEquals(key.scl[1], key.scl[2])) {
                console.log('Usage of non-cubic scale!');
                console.log(key);
              }

              samples.s.push(key.scl[0]);
            }
          }
        }
      }

      if (samples.t.length > 0) { pdxSamples.subNodes.push({name: 't', type: 'float', data: samples.t}); }
      if (samples.q.length > 0) { pdxSamples.subNodes.push({name: 'q', type: 'float', data: samples.q}); }
      if (samples.s.length > 0) { pdxSamples.subNodes.push({name: 's', type: 'float', data: samples.s}); }

      return pdxDataRoot;
    }

    convertToPdxmesh(object, options) {
      if (!options) {
        options = {
          textureBaseName: 'unknown',
          pdxShader: 'PdxMeshStandard',
        };
      }

      const pdxDataRoot = {name: 'pdxData', type: 'object', subNodes: []};
      pdxDataRoot.subNodes.push({name: 'pdxasset', type: 'int', data: [1, 0]});

      const objectsRoot = {name: 'object', type: 'object', subNodes: []};
      pdxDataRoot.subNodes.push(objectsRoot);
      pdxDataRoot.subNodes.push({name: 'locator', type: 'object', subNodes: []});

      const shapeRoot = {name: 'jorodoxShape', type: 'object', subNodes: []};
      objectsRoot.subNodes.push(shapeRoot);

      // 'internal' function
      const getVertexNrForUniqueData = function (vertNr, uv, normal, vertexToUniqueData, verts, skinIds, skinWeights) {
        if (!vertexToUniqueData[vertNr]) {
          vertexToUniqueData[vertNr] = [{uv, normal, v: vertNr}];
          return vertNr;
        }

        // See if we already mapped this UV before
        let foundVertNr = false;
        for (let j = 0, jl = vertexToUniqueData[vertNr].length; j < jl; j++) {
          foundVertNr = vertexToUniqueData[vertNr][j].v;

          if (!vertexToUniqueData[vertNr][j].normal.equals(normal)) {
            foundVertNr = false;
          } else {
            for (let i = 0; i < vertexToUniqueData[vertNr][j].uv.length; i++) {
              if (!uv[i] || !vertexToUniqueData[vertNr][j].uv[i].equals(uv[i])) {
                foundVertNr = false;
                break;
              }
            }
          }

          if (foundVertNr !== false) { return foundVertNr; }
        }

        // Create new vert, copy of existing
        verts.push(verts[vertNr * 3]);
        verts.push(verts[vertNr * 3 + 1]);
        verts.push(verts[vertNr * 3 + 2]);

        // Don't forget skin
        skinIds.push(skinIds[vertNr * 4]);
        skinIds.push(skinIds[vertNr * 4 + 1]);
        skinIds.push(skinIds[vertNr * 4 + 2]);
        skinIds.push(skinIds[vertNr * 4 + 2]);
        skinWeights.push(skinWeights[vertNr * 4]);
        skinWeights.push(skinWeights[vertNr * 4 + 1]);
        skinWeights.push(skinWeights[vertNr * 4 + 2]);
        skinWeights.push(skinWeights[vertNr * 4 + 2]);

        const newVert = ((verts.length / 3) - 1) | 0; // '| 0' = cast to int

        vertexToUniqueData[vertNr].push({uv, normal, v: newVert});

        return newVert;
      };

        // Get bones
      const boneList = this.getBoneListRooted(object);
      const boneData = [];
      const boneNrToHeirarchyBoneNr = [];
      boneNrToHeirarchyBoneNr[-1] = -1;
      if (boneList.length > 0) {
        const multipleRootBones = (boneList[0].name === 'AddedRoot');

        for (let i = 0; i < boneList.length; i++) {
          // pdxmesh uses a 3x4 transform matrix for bones in the world space, whereas Three.js uses a 4x4 matrix (local&world space) - we just have to transform it and snip of the 'skew' row

          boneList[i].updateMatrix();
          boneList[i].updateMatrixWorld(true);
          boneList[i].parent.updateMatrix();
          boneList[i].parent.updateMatrixWorld(true);

          // Get matrix of bone in world matrix
          let pdxMatrix = new THREE.Matrix4().multiplyMatrices(boneList[i].parent.matrixWorld, boneList[i].matrix);
          pdxMatrix = new THREE.Matrix4().getInverse(pdxMatrix, true);
          const m = pdxMatrix.elements;

          let parentBoneNr = boneList[i].parent.boneNr;

          // Set to added root bone
          if (!(boneList[i].parent instanceof THREE.Bone) && multipleRootBones && i !== 0) { parentBoneNr = 0; }

          // NOTE: m is in COLUMN-major order
          boneData.push({
            name: boneList[i].name,
            type: 'object',
            subNodes: [
              {name: 'ix', type: 'int', data: [i]},
              {name: 'pa', type: 'int', data: [boneList[i].parent.boneNr]},
              {
                name: 'tx',
                type: 'float',
                data: [
                  m[0], m[1], m[2],
                  m[4], m[5], m[6],
                  m[8], m[9], m[10],
                  m[12], m[13], m[14],
                ]
              },
            ]
          });

          if (parentBoneNr === undefined) {
            // Remove 'pa' at root node
            boneData[i].subNodes = [boneData[i].subNodes[0], boneData[i].subNodes[2]];
          }
        }
      }

      // find all geometry
      object.traverse((subObject) => {
        if (subObject instanceof THREE.Mesh) {
          if (subObject.geometry.bones) {
            for (let i = 0; i < subObject.geometry.bones.length; i++) {
              for (let k = 0; k < boneList.length; k++) {
                if (subObject.geometry.bones[i].name === boneList[k].name) {
                  boneNrToHeirarchyBoneNr[i] = k;
                  break;
                }
              }
            }
          }

          // Bounding box
          const bb = new THREE.Box3();
          bb.setFromObject(subObject);

          // Scale / rotate to world
          subObject.geometry.applyMatrix(subObject.matrixWorld);

          // Vertices
          const verts = [];
          for (let k = 0, l = subObject.geometry.vertices.length; k < l; k++) {
            verts.push(...subObject.geometry.vertices[k].toArray());
          }

          // Face-stored data
          const tri = [];
          const normals = [];
          const tangents = [];
          const uvs = [];

          if (!subObject.geometry.hasTangents && subObject.geometry.faceVertexUvs[0].length) { subObject.geometry.computeTangents(); }

          // Assume skinIds as long as skinWeights
          const skinIds = [];
          const skinWeights = [];
          let bonesUsed = 0;
          for (let k = 0, l = subObject.geometry.skinIndices.length; k < l; k++) {
            skinIds.push(
              subObject.geometry.skinWeights[k].x ? boneNrToHeirarchyBoneNr[subObject.geometry.skinIndices[k].x] : -1,
              subObject.geometry.skinWeights[k].y ? boneNrToHeirarchyBoneNr[subObject.geometry.skinIndices[k].y] : -1,
              subObject.geometry.skinWeights[k].z ? boneNrToHeirarchyBoneNr[subObject.geometry.skinIndices[k].z] : -1,
              subObject.geometry.skinWeights[k].w ? boneNrToHeirarchyBoneNr[subObject.geometry.skinIndices[k].w] : -1
            );
            skinWeights.push(
              subObject.geometry.skinWeights[k].x,
              subObject.geometry.skinWeights[k].y,
              subObject.geometry.skinWeights[k].z,
              subObject.geometry.skinWeights[k].w
            );

            const used = Math.ceil(subObject.geometry.skinWeights[k].x) + Math.ceil(subObject.geometry.skinWeights[k].y) + Math.ceil(subObject.geometry.skinWeights[k].z) + Math.ceil(subObject.geometry.skinWeights[k].w);

            bonesUsed = Math.max(used, bonesUsed);
          }

          // See if we have any multi-UV vertices, split those
          const vertexToUniqueData = [];
          const uvCount = subObject.geometry.faceVertexUvs.length;
          for (let k = 0, l = subObject.geometry.faces.length; k < l; k++) {
            const face = subObject.geometry.faces[k];
            const faceUvs = [];
            for (let j = 0; j < 3; j++) {
              faceUvs[j] = [];
              for (let i = 0; i < uvCount; i++) {
                if (subObject.geometry.faceVertexUvs[i][k]) { faceUvs[j][i] = subObject.geometry.faceVertexUvs[i][k][j]; }
              }
            }

            face.a = getVertexNrForUniqueData(face.a, faceUvs[0], face.vertexNormals[0], vertexToUniqueData, verts, skinIds, skinWeights);
            face.b = getVertexNrForUniqueData(face.b, faceUvs[1], face.vertexNormals[1], vertexToUniqueData, verts, skinIds, skinWeights);
            face.c = getVertexNrForUniqueData(face.c, faceUvs[2], face.vertexNormals[2], vertexToUniqueData, verts, skinIds, skinWeights);
          }


          // Process all faces
          for (let k = 0, l = subObject.geometry.faces.length; k < l; k++) {
            const face = subObject.geometry.faces[k];
            tri.push(face.a, face.b, face.c);

            this.insertValues(normals, face.a * 3, face.vertexNormals[0].toArray());
            this.insertValues(normals, face.b * 3, face.vertexNormals[1].toArray());
            this.insertValues(normals, face.c * 3, face.vertexNormals[2].toArray());

            if (face.vertexTangents.length) {
              this.insertValues(tangents, face.a * 4, face.vertexTangents[0].toArray());
              this.insertValues(tangents, face.b * 4, face.vertexTangents[1].toArray());
              this.insertValues(tangents, face.c * 4, face.vertexTangents[2].toArray());
            } else {
              this.insertValues(tangents, face.a * 4, new THREE.Vector4().toArray());
              this.insertValues(tangents, face.b * 4, new THREE.Vector4().toArray());
              this.insertValues(tangents, face.c * 4, new THREE.Vector4().toArray());
            }


            for (let i = 0; i < uvCount; i++) {
              if (!uvs[i]) { uvs[i] = []; }
              if (subObject.geometry.faceVertexUvs[i]) {
                const uv = subObject.geometry.faceVertexUvs[i][k];

                if (uv) {
                  const flipY = !subObject.material.map || subObject.material.map.flipY;

                  uvs[i][face.a * 2] = uv[0].x;
                  uvs[i][face.a * 2 + 1] = flipY ? 1 - uv[0].y : uv[0].y;
                  uvs[i][face.b * 2] = uv[1].x;
                  uvs[i][face.b * 2 + 1] = flipY ? 1 - uv[1].y : uv[1].y;
                  uvs[i][face.c * 2] = uv[2].x;
                  uvs[i][face.c * 2 + 1] = flipY ? 1 - uv[2].y : uv[2].y;
                } else {
                  uvs[i][face.a * 2] = 0;
                  uvs[i][face.a * 2 + 1] = 0;
                  uvs[i][face.b * 2] = 0;
                  uvs[i][face.b * 2 + 1] = 0;
                  uvs[i][face.c * 2] = 0;
                  uvs[i][face.c * 2 + 1] = 0;
                }
              }
            }
          }

          const mesh = {name: 'mesh', type: 'object', subNodes: []};
          mesh.subNodes.push({name: 'p', type: 'float', data: verts});
          mesh.subNodes.push({name: 'n', type: 'float', data: normals});
          mesh.subNodes.push({name: 'ta', type: 'float', data: tangents});
          for (let i = 0; i < uvCount; i++) { mesh.subNodes.push({name: `u${i}`, type: 'float', data: uvs[i]}); }
          mesh.subNodes.push({name: 'tri', type: 'int', data: tri});
          mesh.subNodes.push({
            name: 'aabb',
            type: 'object',
            subNodes: [
              {name: 'min', type: 'float', data: [bb.min.x, bb.min.y, bb.min.z]},
              {name: 'max', type: 'float', data: [bb.max.x, bb.max.y, bb.max.z]},
            ]
          });
          mesh.subNodes.push({
            name: 'material',
            type: 'object',
            subNodes: [
              {
                name: 'shader', type: 'string', data: options.pdxShader ? options.pdxShader : 'PdxMeshStandard', nullByteString: true
              },
              {
                name: 'diff', type: 'string', data: `${options.textureBaseName}_diffuse.dds`, nullByteString: true
              },
              {
                name: 'n', type: 'string', data: `${options.textureBaseName}_normal.dds`, nullByteString: true
              },
              {
                name: 'spec', type: 'string', data: `${options.textureBaseName}_spec.dds`, nullByteString: true
              },
            ]
          });
          shapeRoot.subNodes.push(mesh);

          if (boneData.length) {
            mesh.subNodes.push({
              name: 'skin',
              type: 'object',
              subNodes: [
                {name: 'bones', type: 'int', data: [bonesUsed]},
                {name: 'ix', type: 'int', data: skinIds},
                {name: 'w', type: 'float', data: skinWeights},
              ]
            });
          }
        }
      });

      if (boneData.length) { shapeRoot.subNodes.push({name: 'skeleton', type: 'object', subNodes: boneData}); }


      return pdxDataRoot;
    }

    flipMatrixArray(data) {
      return [
        data[0], data[4], data[8], data[12],
        data[1], data[5], data[9], data[13],
        data[2], data[6], data[10], data[14],
        data[3], data[7], data[11], data[15]
      ];
    }

    convertToColladaData(viewObject, options) {
      if (!options) {
        options = {
          textureBaseName: 'unknown',
          pdxShader: 'PdxMeshStandard',
        };
      }

      const colladaData = {
        images: [],
        // 'effects': [],
        materials: [],
        geometries: [],
        animations: [],
        controllers: [],
        geometryInstance: [],
        scene: [],
        skeleton: null,
        nodeCount: 0,
      };

      const rootObject = {
        name: 'Scene',
        type: 'SCENE',
        threeJs: viewObject.object,
        children: [],
      };

      colladaData.scene = rootObject;

      // 'internal' function
      const getVertexNrForUniqueData = function (vertNr, uv, normal, vertexToUniqueData, verts, skinIds, skinWeights) {
        if (!vertexToUniqueData[vertNr]) {
          vertexToUniqueData[vertNr] = [{uv, normal, v: vertNr}];
          return vertNr;
        }

        // See if we already mapped this UV before
        let foundVertNr = false;
        for (let j = 0, jl = vertexToUniqueData[vertNr].length; j < jl; j++) {
          foundVertNr = vertexToUniqueData[vertNr][j].v;

          if (!vertexToUniqueData[vertNr][j].normal || !vertexToUniqueData[vertNr][j].normal.equals(normal)) {
            foundVertNr = false;
          } else {
            for (let i = 0; i < vertexToUniqueData[vertNr][j].uv.length; i++) {
              if (!uv[i] || !vertexToUniqueData[vertNr][j].uv[i].equals(uv[i])) {
                foundVertNr = false;
                break;
              }
            }
          }

          if (foundVertNr !== false) { return foundVertNr; }
        }

        // Create new vert, copy of existing
        verts.push(verts[vertNr * 3]);
        verts.push(verts[vertNr * 3 + 1]);
        verts.push(verts[vertNr * 3 + 2]);

        // Don't forget skin
        skinIds.push(skinIds[vertNr * 4]);
        skinIds.push(skinIds[vertNr * 4 + 1]);
        skinIds.push(skinIds[vertNr * 4 + 2]);
        skinIds.push(skinIds[vertNr * 4 + 2]);
        skinWeights.push(skinWeights[vertNr * 4]);
        skinWeights.push(skinWeights[vertNr * 4 + 1]);
        skinWeights.push(skinWeights[vertNr * 4 + 2]);
        skinWeights.push(skinWeights[vertNr * 4 + 2]);

        const newVert = ((verts.length / 3) - 1) | 0; // '| 0' = cast to int

        vertexToUniqueData[vertNr].push({uv, normal, v: newVert});

        return newVert;
      };


        // find all geometry
      angular.forEach(viewObject.meshes, (subObject) => {
        const objectName = `${subObject.name}-${colladaData.nodeCount}`;
        const childNode = {
          name: objectName,
          type: 'NODE',
          matrix: subObject.matrixWorld,
          threeJs: subObject,
          controller: null,
          geometry: null,
          children: [],
          isCollider: viewObject.colliders.indexOf(subObject) !== -1,
          material: {
            name: `${objectName}-material-${colladaData.materials.length}`,
            diff: subObject.material.map && subObject.material.map.fileName ? {name: `${objectName}-effect-${colladaData.materials.length}-diff`, fileName: subObject.material.map.fileName} : null,
            normal: subObject.material.normalMap && subObject.material.normalMap.fileName ? {name: `${objectName}-effect-${colladaData.materials.length}-normal`, fileName: subObject.material.normalMap.fileName} : null,
            spec: subObject.material.specularMap && subObject.material.specularMap.fileName ? {name: `${objectName}-effect-${colladaData.materials.length}-spec`, fileName: subObject.material.specularMap.fileName} : null,
          }
        };
        childNode.material.node = childNode;
        colladaData.nodeCount++;

        rootObject.children.push(childNode);
        colladaData.materials.push(childNode.material);
        if (childNode.material.diff) { colladaData.images.push(childNode.material.diff); }
        if (childNode.material.normal) { colladaData.images.push(childNode.material.normal); }
        if (childNode.material.spec) { colladaData.images.push(childNode.material.spec); }

        if (childNode.isCollider) { childNode.material.transparency = 0.5; }

        if (!childNode.isCollider && subObject.skeleton && subObject.skeleton.bones.length > 0) {
          // Skin controller
          const controller = {
            name: `${objectName}-skin`,

            object: childNode,

            skinSource: childNode.mesh,
            bindShapeMatrix: subObject.bindMatrix.toArray(),
            jointNameList: [],
            jointPoseList: [],

            skinWeights: [],
            skinVertexInfluenceCount: [],
            skinVertexInfluences: [],
          };
          // Weightcount always 4

          colladaData.controllers.push(controller);
          childNode.controller = controller;

          const flip = this.flipMatrixArray;
          function loadBone(bone) {
            controller.jointNameList.push(bone.name);
            controller.jointPoseList.push.apply(controller.jointPoseList, flip(new THREE.Matrix4().getInverse(bone.matrixWorld).toArray()));
            // controller.jointPoseList.push.apply(controller.jointPoseList, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

            angular.forEach(bone.children, loadBone);
          }
          loadBone(subObject.skeleton.bones[0]);
          if (!colladaData.skeleton || colladaData.skeleton.bones[0] !== subObject.skeleton.bones[0]) {
            colladaData.skeleton = subObject.skeleton;
            colladaData.scene.children.unshift(subObject.skeleton.bones[0]);
          }
        }


        // Vertices
        const verts = [];
        for (let k = 0, l = subObject.geometry.vertices.length; k < l; k++) {
          verts.push(...subObject.geometry.vertices[k].toArray());
        }

        // Face-stored data
        const tri = [];
        const normals = [];
        const tangents = [];
        const uvs = [];

        if (!subObject.geometry.hasTangents && subObject.geometry.faceVertexUvs[0].length) { subObject.geometry.computeTangents(); }

        // Assume skinIds as long as skinWeights
        const skinIds = [];
        const skinWeights = [];
        let bonesUsed = 0;
        for (let k = 0, l = subObject.geometry.skinIndices.length; k < l; k++) {
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

          const used = Math.ceil(subObject.geometry.skinWeights[k].x) + Math.ceil(subObject.geometry.skinWeights[k].y) + Math.ceil(subObject.geometry.skinWeights[k].z) + Math.ceil(subObject.geometry.skinWeights[k].w);

          bonesUsed = Math.max(used, bonesUsed);
        }

        // See if we have any multi-UV vertices, split those
        const vertexToUniqueData = [];
        let uvCount = subObject.geometry.faceVertexUvs.length;
        if (subObject.geometry.faceVertexUvs[0].length === 0) { uvCount--; }
        for (let k = 0, l = subObject.geometry.faces.length; k < l; k++) {
          const face = subObject.geometry.faces[k];
          const faceUvs = [];
          for (let j = 0; j < 3; j++) {
            faceUvs[j] = [];
            for (let i = 0; i < uvCount; i++) {
              if (subObject.geometry.faceVertexUvs[i][k]) { faceUvs[j][i] = subObject.geometry.faceVertexUvs[i][k][j]; }
            }
          }

          face.a = getVertexNrForUniqueData(face.a, faceUvs[0], face.vertexNormals[0], vertexToUniqueData, verts, skinIds, skinWeights);
          face.b = getVertexNrForUniqueData(face.b, faceUvs[1], face.vertexNormals[1], vertexToUniqueData, verts, skinIds, skinWeights);
          face.c = getVertexNrForUniqueData(face.c, faceUvs[2], face.vertexNormals[2], vertexToUniqueData, verts, skinIds, skinWeights);
        }


        // Process all faces
        for (let k = 0, l = subObject.geometry.faces.length; k < l; k++) {
          const face = subObject.geometry.faces[k];
          tri.push(face.a, face.b, face.c);

          if (!face.vertexNormals[0]) { this.insertValues(normals, face.a * 3, [0, 0, 0]); } else { this.insertValues(normals, face.a * 3, face.vertexNormals[0].toArray()); }
          if (!face.vertexNormals[1]) { this.insertValues(normals, face.b * 3, [0, 0, 0]); } else { this.insertValues(normals, face.b * 3, face.vertexNormals[1].toArray()); }
          if (!face.vertexNormals[2]) { this.insertValues(normals, face.c * 3, [0, 0, 0]); } else { this.insertValues(normals, face.c * 3, face.vertexNormals[2].toArray()); }

          if (face.vertexTangents.length) {
            this.insertValues(tangents, face.a * 4, face.vertexTangents[0].toArray());
            this.insertValues(tangents, face.b * 4, face.vertexTangents[1].toArray());
            this.insertValues(tangents, face.c * 4, face.vertexTangents[2].toArray());
          } else {
            this.insertValues(tangents, face.a * 4, new THREE.Vector4().toArray());
            this.insertValues(tangents, face.b * 4, new THREE.Vector4().toArray());
            this.insertValues(tangents, face.c * 4, new THREE.Vector4().toArray());
          }


          for (let i = 0; i < uvCount; i++) {
            if (!uvs[i]) { uvs[i] = []; }
            if (subObject.geometry.faceVertexUvs[i]) {
              const uv = subObject.geometry.faceVertexUvs[i][k];

              if (uv) {
                const flipY = true;

                uvs[i][face.a * 2] = uv[0].x;
                uvs[i][face.a * 2 + 1] = flipY ? 1 - uv[0].y : uv[0].y;
                uvs[i][face.b * 2] = uv[1].x;
                uvs[i][face.b * 2 + 1] = flipY ? 1 - uv[1].y : uv[1].y;
                uvs[i][face.c * 2] = uv[2].x;
                uvs[i][face.c * 2 + 1] = flipY ? 1 - uv[2].y : uv[2].y;
              } else {
                uvs[i][face.a * 2] = 0;
                uvs[i][face.a * 2 + 1] = 0;
                uvs[i][face.b * 2] = 0;
                uvs[i][face.b * 2 + 1] = 0;
                uvs[i][face.c * 2] = 0;
                uvs[i][face.c * 2 + 1] = 0;
              }
            }
          }
        }

        const polylist = [];
        // Vertex position, Vertex normal + UVs count
        // Polylist can be mixed indices for each, but we have flattened them already
        const inputCount = uvCount + 2;
        // var inputCount = 2;
        for (let i = 0, l = tri.length; i < l; i++) {
          for (let j = 0; j < inputCount; j++) { polylist.push(tri[i]); }
        }

        // Geometry load
        const geometry = {
          name: `${objectName}-geometry`,
          vertices: verts,
          normals,
          uvs,
          polylist,
          polycount: tri.length / 3,
        };
        // Polysize always 3


        colladaData.geometries.push(geometry);
        childNode.geometry = geometry;
        if (childNode.controller) { childNode.controller; }

        if (childNode.controller) {
          // Convert influences & weights

          for (let i = 0; i < skinIds.length; i += 4) {
            let influenceCount = 0;

            for (let j = 0; j < 4; j++) {
              if (skinIds[i + j] !== -1) {
                influenceCount = j + 1;
                childNode.controller.skinWeights.push(skinWeights[i + j]);
                childNode.controller.skinVertexInfluences.push(skinIds[i + j]);
                childNode.controller.skinVertexInfluences.push(childNode.controller.skinWeights.length - 1);
              }
            }
            childNode.controller.skinVertexInfluenceCount.push(influenceCount);
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
      });

      // if (boneData.length)
      //	shapeRoot.subNodes.push({name: 'skeleton', type: 'object', subNodes: boneData});

      console.log(colladaData);

      return colladaData;
    }

    convertToColladaXml(colladaData) {
      let xml = '<?xml version="1.0" encoding="utf-8"?>' + '\n';
      xml += '<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">' + '\n';
      xml += '  <asset>' + '\n';
      xml += '    <contributor>' + '\n';
      xml += '      <author>Jorodox User</author>' + '\n';
      xml += '      <authoring_tool>Jorodox Tool</authoring_tool>' + '\n';
      xml += '    </contributor>' + '\n';
      xml += `    <created>${$filter('date')(new Date(), 'yyyy-MM-ddTHH:mm:ss')}</created>` + '\n';
      xml += `    <modified>${$filter('date')(new Date(), 'yyyy-MM-ddTHH:mm:ss')}</modified>` + '\n';
      xml += '    <unit name="meter" meter="1"/>' + '\n';
      xml += '    <up_axis>Y_UP</up_axis>' + '\n';
      xml += '  </asset>' + '\n';
      xml += '  <library_images>' + '\n';
      angular.forEach(colladaData.images, (image) => {
        xml += `    <image id="${image.name}" name="${image.name}"><init_from>${image.fileName}</init_from></image>` + '\n';
      });
      xml += '  </library_images>' + '\n';


      xml += '  <library_effects>' + '\n';
      angular.forEach(colladaData.materials, (material) => {
        xml += `    <effect id="${material.name}-effect"><profile_COMMON>` + '\n';
        if (material.diff) {
          xml += `      <newparam sid="${material.diff.name}-diff-surface"><surface type="2D"><init_from>${material.diff.name}</init_from></surface></newparam>` + '\n';
          xml += `      <newparam sid="${material.diff.name}-diff-sampler"><sampler2D><source>${material.diff.name}-diff-surface</source></sampler2D></newparam>` + '\n';
        }
        if (material.normal) {
          xml += `      <newparam sid="${material.normal.name}-normal-surface"><surface type="2D"><init_from>${material.normal.name}</init_from></surface></newparam>` + '\n';
          xml += `      <newparam sid="${material.normal.name}-normal-sampler"><sampler2D><source>${material.normal.name}-normal-surface</source></sampler2D></newparam>` + '\n';
        }
        if (material.spec) {
          xml += `      <newparam sid="${material.spec.name}-spec-surface"><surface type="2D"><init_from>${material.spec.name}</init_from></surface></newparam>` + '\n';
          xml += `      <newparam sid="${material.spec.name}-spec-sampler"><sampler2D><source>${material.spec.name}-spec-surface</source></sampler2D></newparam>` + '\n';
        }
        xml += '      <technique sid="common">' + '\n';
        xml += '        <blinn>' + '\n';
        xml += '          <emission><color sid="emission">0 0 0 1</color></emission>' + '\n';
        xml += '          <ambient><color sid="ambient">0 0 0 1</color></ambient>' + '\n';
        if (material.diff) { xml += `          <diffuse><texture texture="${material.diff.name}-diff-sampler" texcoord="${material.node.geometry.name}-channel1"/></diffuse>` + '\n'; } else { xml += '          <diffuse><color sid="diffuse">0 0 0 1</color></diffuse>' + '\n'; }
        if (material.normal) { xml += `          <bump bumptype="NORMALMAP"><texture texture="${material.normal.name}-normal-sampler" texcoord="${material.node.geometry.name}-channel1"/></bump>` + '\n'; }
        if (material.spec) { xml += `          <specular><texture texture="${material.spec.name}-spec-sampler" texcoord="${material.node.geometry.name}-channel1"/></specular>` + '\n'; } else { xml += '          <specular><color sid="specular">0 0 0 1</color></specular>' + '\n'; }

        if (material.transparency) {
          xml += '          <transparent><color sid="transparent">1 1 1 1</color></transparent>' + '\n';
          xml += `          <transparency><float sid="transparency">${material.transparency}</float></transparency>` + '\n';
        }

        xml += '          <shininess><float sid="shininess">0</float></shininess>' + '\n';
        xml += '          <index_of_refraction><float sid="index_of_refraction">1</float></index_of_refraction>' + '\n';
        xml += '        </blinn>' + '\n';
        xml += '      </technique>' + '\n';
        xml += '  </profile_COMMON></effect>' + '\n';
      });

      xml += '  </library_effects>' + '\n';

      xml += '  <library_materials>' + '\n';
      angular.forEach(colladaData.materials, (material) => {
        xml += `   <material id="${material.name}" name="${material.name}"><instance_effect url="#${material.name}-effect"/></material>` + '\n';
      });
      xml += '  </library_materials>' + '\n';

      xml += '  <library_geometries>' + '\n';
      angular.forEach(colladaData.geometries, (geometry) => {
        xml += `   <geometry id="${geometry.name}" name="${geometry.name}-model">` + '\n';
        xml += '   <mesh>' + '\n';

        xml += `     <source id="${geometry.name}-positions" name="${geometry.name}-positions">` + '\n';
        xml += `       <float_array id="${geometry.name}-positions-array" count="${geometry.vertices.length}">${geometry.vertices.join(' ')}</float_array>` + '\n';
        xml += `       <technique_common><accessor source="#${geometry.name}-positions-array" count="${geometry.vertices.length / 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common>` + '\n';
        xml += '     </source>' + '\n';

        xml += `     <source id="${geometry.name}-normals" name="${geometry.name}-normals">` + '\n';
        xml += `       <float_array id="${geometry.name}-normals-array" count="${geometry.normals.length}">${geometry.normals.join(' ')}</float_array>` + '\n';
        xml += `       <technique_common><accessor source="#${geometry.name}-normals-array" count="${geometry.normals.length / 3}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common>` + '\n';
        xml += '     </source>' + '\n';

        angular.forEach(geometry.uvs, (uv, uvNr) => {
          xml += `     <source id="${geometry.name}-uv-${uvNr}" name="${geometry.name}-uv-${uvNr}">` + '\n';
          xml += `       <float_array id="${geometry.name}-uv-${uvNr}-array" count="${uv.length}">${uv.join(' ')}</float_array>` + '\n';
          xml += `       <technique_common><accessor source="#${geometry.name}-uv-${uvNr}-array" count="${uv.length / 2}" stride="2"><param name="S" type="float"/><param name="T" type="float"/></accessor></technique_common>` + '\n';
          xml += '     </source>' + '\n';
        });

        xml += `     <vertices id="${geometry.name}-vertices">` + '\n';
        xml += `       <input semantic="POSITION" source="#${geometry.name}-positions"/>` + '\n';
        xml += '     </vertices>' + '\n';

        xml += `     <polylist material="${geometry.name}-material" count="${geometry.polycount}">` + '\n';
        xml += `       <input semantic="VERTEX" source="#${geometry.name}-vertices" offset="0"/>` + '\n';
        xml += `       <input semantic="NORMAL" source="#${geometry.name}-normals" offset="1"/>` + '\n';
        angular.forEach(geometry.uvs, (uv, uvNr) => {
          xml += `       <input semantic="TEXCOORD" source="#${geometry.name}-uv-${uvNr}" offset="2" set="0"/>` + '\n';
        });
        xml += `       <vcount>${new Array(geometry.polycount + 1).join('3 ').trim()}</vcount>` + '\n';
        xml += `       <p>${geometry.polylist.join(' ')}</p>` + '\n';
        xml += '     </polylist>' + '\n';
        xml += '   </mesh>' + '\n';
        xml += '   </geometry>' + '\n';
      });
      xml += '  </library_geometries>' + '\n';

      xml += '  <library_animations>' + '\n';
      xml += '  </library_animations>' + '\n';

      xml += '  <library_controllers>' + '\n';
      angular.forEach(colladaData.controllers, (controller) => {
        xml += `   <controller id="${controller.name}" name="${controller.name}-name">` + '\n';
        xml += `     <skin source="#${controller.object.geometry.name}">` + '\n';
        xml += `       <bind_shape_matrix>${controller.bindShapeMatrix.join(' ')}</bind_shape_matrix>` + '\n';
        xml += `       <source id="${controller.name}-joints">` + '\n';
        xml += `         <Name_array id="${controller.name}-joints-array" count="${controller.jointNameList.length}">${controller.jointNameList.join(' ')}</Name_array>` + '\n';
        xml += `         <technique_common><accessor source="#${controller.name}-joints-array" count="${controller.jointNameList.length}" stride="1"><param name="JOINT" type="name"/></accessor></technique_common>` + '\n';
        xml += '       </source>' + '\n';
        xml += `       <source id="${controller.name}-bindposes">` + '\n';
        xml += `         <float_array id="${controller.name}-bindposes-array" count="${controller.jointPoseList.length}">${controller.jointPoseList.join(' ')}</float_array>` + '\n';
        xml += `         <technique_common><accessor source="#${controller.name}-bindposes-array" count="${controller.jointPoseList.length / 16}" stride="16"><param name="TRANSFORM" type="float4x4"/></accessor></technique_common>` + '\n';
        xml += '       </source>' + '\n';
        xml += `       <source id="${controller.name}-skinweights">` + '\n';
        xml += `         <float_array id="${controller.name}-skinweights-array" count="${controller.skinWeights.length}">${controller.skinWeights.join(' ')}</float_array>` + '\n';
        xml += `         <technique_common><accessor source="#${controller.name}-skinweights-array" count="${controller.skinWeights.length}" stride="1"><param name="WEIGHT" type="float"/></accessor></technique_common>` + '\n';
        xml += '       </source>' + '\n';

        xml += '       <joints>' + '\n';
        xml += `         <input semantic="JOINT" source="#${controller.name}-joints"/>` + '\n';
        xml += `         <input semantic="INV_BIND_MATRIX" source="#${controller.name}-bindposes"/>` + '\n';
        xml += '       </joints>' + '\n';
        xml += `       <vertex_weights count="${controller.skinWeights.length}">` + '\n';
        xml += `         <input semantic="JOINT" source="#${controller.name}-joints" offset="0"/>` + '\n';
        xml += `         <input semantic="WEIGHT" source="#${controller.name}-skinweights" offset="1"/>` + '\n';
        xml += `         <vcount>${controller.skinVertexInfluenceCount.join(' ')}</vcount>` + '\n';
        xml += `         <v>${controller.skinVertexInfluences.join(' ')}</v>` + '\n';
        xml += '       </vertex_weights>' + '\n';
        xml += '     </skin>' + '\n';
        xml += '   </controller>' + '\n';
      });
      xml += '  </library_controllers>' + '\n';

      const flip = this.flipMatrixArray;
      function printNode(node, indent) {
        let xml = '';

        if (node.type && node.type === 'SCENE') { xml += `${indent}<visual_scene id="${node.name}" name="${node.name}">` + '\n'; } else if (node.type && node.type == 'NODE') { xml += `${indent}<node id="${node.name}" name="${node.name}" type="NODE">` + '\n'; } else // Bone
        { xml += `${indent}<node id="${node.name}" name="${node.name}" sid="${node.name}" type="JOINT">` + '\n'; }

        if (node.matrix) { xml += `${indent}  <matrix sid="transform">${flip(node.matrix.toArray()).join(' ')}</matrix>` + '\n'; }

        if (node.controller) {
          xml += `${indent}  <instance_controller url="#${node.controller.name}">` + '\n';
          xml += `${indent}    <skeleton>#${colladaData.skeleton.bones[0].name}</skeleton>` + '\n';
          xml += `${indent}    <bind_material><technique_common>` + '\n';
          xml += `${indent}      <instance_material symbol="${node.material.name}" target="#${node.material.name}">` + '\n';
          xml += `${indent}        <bind_vertex_input semantic="${node.geometry.name}-channel1" input_semantic="TEXCOORD" input_set="0"/>` + '\n';
          xml += `${indent}      </instance_material>` + '\n';
          xml += `${indent}     </technique_common></bind_material>` + '\n';
          xml += `${indent}  </instance_controller>` + '\n';
        } else if (node.material && node.material.diff) {
          xml += `${indent}  <instance_geometry url="#${node.geometry.name}">` + '\n';
          xml += `${indent}    <bind_material><technique_common>` + '\n';
          xml += `${indent}      <instance_material symbol="${node.material.name}" target="#${node.material.name}">` + '\n';
          xml += `${indent}        <bind_vertex_input semantic="${node.geometry.name}-channel1" input_semantic="TEXCOORD" input_set="0"/>` + '\n';
          xml += `${indent}      </instance_material>` + '\n';
          xml += `${indent}    </technique_common></bind_material>` + '\n';
          xml += `${indent}  </instance_geometry>` + '\n';
        } else if (node.geometry) {
          xml += `${indent}  <instance_geometry url="#${node.geometry.name}">` + '\n';
          xml += `${indent}    <bind_material><technique_common>` + '\n';
          xml += `${indent}      <instance_material symbol="${node.material.name}" target="#${node.material.name}"></instance_material>` + '\n';
          xml += `${indent}    </technique_common></bind_material>` + '\n';
          xml += `${indent}  </instance_geometry>` + '\n';
        }

        if (node.children) {
          angular.forEach(node.children, (subNode) => {
            xml += printNode(subNode, `${indent}  `);
          });
        }

        if (node.type && node.type === 'SCENE') { xml += `${indent}</visual_scene>` + '\n'; } else { xml += `${indent}</node>` + '\n'; }

        return xml;
      }

      xml += '  <library_visual_scenes>' + '\n';
      xml += printNode(colladaData.scene, '    ');
      xml += '  </library_visual_scenes>' + '\n';

      xml += '  <scene><instance_visual_scene url="#Scene"/></scene>' + '\n';

      xml += '</COLLADA>' + '\n';

      return xml;
    }

    setThreeJsLoaderHandlers() {
      if (this.handlerAdded) { return; }

      THREE.Loader.Handlers.add(/^mod:\/\//, {
        load: function (path) {
          let texture = new THREE.Texture();

          const modPath = path.substr(6);

          if (modPath.substr(-4) === '.dds') {
            texture = this.loadDdsToTexture(modService.getFileBuffer(modPath));
          } else {
            modService.getFile(modPath).then((file) => {
              loadImage(file, (img) => {
                texture.image = img;
                texture.needsUpdate = true;
              });
            });
          }

          return texture;
        }.bind(this)
      });
      this.handlerAdded = true;
    }

    loadCollada(string, path) {
      const deferred = $q.defer();
      const loader = ColladaLoader();
      loader.options.convertUpAxis = true;

      let boneCount = 0;
      let triangleCount = 0;

      this.setThreeJsLoaderHandlers();

      const xmlParser = new DOMParser();
      const colladaXML = xmlParser.parseFromString(string, 'application/xml');
      loader.parse(colladaXML, (collada) => {
        const skeletons = [];
        const meshes = [];
        const animations = [];
        const wireframes = [];
        const update = function (viewScene) {
          for (let i = 0; i < skeletons.length; i++) {
            skeletons[i].visible = viewScene.viewConfig.showSkeletons;
            skeletons[i].update();
          }
          for (let i = 0; i < wireframes.length; i++) {
            wireframes[i].visible = viewScene.viewConfig.showWireframes;
          }
          for (let i = 0; i < meshes.length; i++) {
            meshes[i].material.visible = viewScene.viewConfig.showMeshes;
          }
        };

        collada.scene.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            meshes.push(node);
            triangleCount += node.geometry.faces.length + 1;

            const wireframeHelper = new THREE.WireframeHelper(node, 0xff0000);
            node.add(wireframeHelper);
            wireframes.push(wireframeHelper);
          }
          if (node instanceof THREE.SkinnedMesh) {
            if (node.geometry.animation) {
              const animation = new THREE.Animation(node, node.geometry.animation);
              animations.push(animation);
            }

            const skeletonHelper = new THREE.SkeletonHelper(node);
            for (let k = 0; k < skeletonHelper.geometry.colors.length; k += 2) {
              skeletonHelper.geometry.colors[k] = new THREE.Color(1, 0, 0);
              skeletonHelper.geometry.colors[k + 1] = new THREE.Color(1, 1, 1);
            }

            node.add(skeletonHelper);
            skeletons.push(skeletonHelper);

            boneCount += skeletonHelper.bones.length + 1;
          }
        });

        // Bounding box
        const bb = new THREE.Box3();
        bb.setFromObject(collada.scene);
        const distance = Math.max(-bb.min.x, -bb.min.y, -bb.min.z, bb.max.x, bb.max.y, bb.max.z);

        deferred.resolve({
          object: collada.scene,
          collada,
          distance,
          update,
          triangleCount,
          boneCount,
          meshCount: meshes.length,
          animations,
          skeletons,
          wireframes,
        });
      }, `mod://${path}/thefile.dae`);

      return deferred.promise;
    }

    loadThreeJson(json, path) {
      const deferred = $q.defer();
      const loader = new THREE.ObjectLoader();

      let boneCount = 0;
      let triangleCount = 0;

      this.setThreeJsLoaderHandlers();

      const data = JSON.parse(json);

      const threeJsData = {
        scene: loader.parse(data)
      };

      const skeletons = [];
      const meshes = [];
      const animations = [];
      const wireframes = [];
      const update = function (viewScene) {
        for (let i = 0; i < skeletons.length; i++) {
          skeletons[i].visible = viewScene.viewConfig.showSkeletons;
          skeletons[i].update();
        }
        for (let i = 0; i < wireframes.length; i++) {
          wireframes[i].visible = viewScene.viewConfig.showWireframes;
        }
        for (let i = 0; i < meshes.length; i++) {
          meshes[i].material.visible = viewScene.viewConfig.showMeshes;
        }
      };

      threeJsData.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          if (node.geometry.skinIndices.length > 0 && node.geometry.bones.length) {
            // Actually a SkinnedMesh

            const skinnedMesh = new THREE.SkinnedMesh(node.geometry, node.material);
            skinnedMesh.id = node.id;
            skinnedMesh.uuid = node.uuid;
            skinnedMesh.name = node.name;
            skinnedMesh.position = node.position;
            skinnedMesh.rotation = node.rotation;
            skinnedMesh.scale = node.scale;
            skinnedMesh.up = node.up;
            skinnedMesh.matrix = node.matrix;
            skinnedMesh.quaternion = node.quaternion;
            skinnedMesh.visible = node.visible;
            skinnedMesh.castShadow = node.castShadow;
            skinnedMesh.recieveShadow = node.recieveShadow;
            skinnedMesh.frustumCulled = node.frustumCulled;
            skinnedMesh.matrixAutoUpdate = node.matrixAutoUpdate;
            skinnedMesh.matrixWorldNeedsUpdate = node.matrixWorldNeedsUpdate;
            skinnedMesh.rotationAutoUpdate = node.rotationAutoUpdate;
            skinnedMesh.userData = node.userData;
            skinnedMesh.matrixWorld = node.matrixWorld;

            node.parent.add(skinnedMesh);

            for (let i = 0; i < node.children.length; i++) { skinnedMesh.add(node.children[i]); }

            node.parent.remove(node);

            node = skinnedMesh;
          }

          meshes.push(node);
          triangleCount += node.geometry.faces.length + 1;

          const wireframeHelper = new THREE.WireframeHelper(node, 0xff0000);
          node.add(wireframeHelper);
          wireframes.push(wireframeHelper);
        }
        if (node instanceof THREE.SkinnedMesh) {
          if (node.geometry.animation) {
            const animation = new THREE.Animation(node, node.geometry.animation);
            animations.push(animation);
          }

          const skeletonHelper = new THREE.SkeletonHelper(node);
          for (let k = 0; k < skeletonHelper.geometry.colors.length; k += 2) {
            skeletonHelper.geometry.colors[k] = new THREE.Color(1, 0, 0);
            skeletonHelper.geometry.colors[k + 1] = new THREE.Color(1, 1, 1);
          }

          node.add(skeletonHelper);
          skeletons.push(skeletonHelper);


          boneCount += skeletonHelper.bones.length + 1;
        }
      });

      // Bounding box
      const bb = new THREE.Box3();
      bb.setFromObject(threeJsData.scene);
      const distance = Math.max(-bb.min.x, -bb.min.y, -bb.min.z, bb.max.x, bb.max.y, bb.max.z);

      deferred.resolve({
        object: threeJsData.scene,
        threeJsData,
        distance,
        update,
        triangleCount,
        boneCount,
        meshCount: meshes.length,
        animations,
        skeletons,
        wireframes,
      });

      return deferred.promise;
    }

    loadPdxMesh(pdxData, path, pdxAnimationData) {
      const deferred = $q.defer();

      let triangleCount = 0;
      let boneCount = 0;
      const skeletons = [];
      const wireframes = [];
      const colliders = [];
      const meshes = [];
      const labels = [];

      const update = function (viewScene) {
        for (let i = 0; i < skeletons.length; i++) {
          skeletons[i].visible = viewScene.viewConfig.showSkeletons;
          skeletons[i].update();
        }
        for (let i = 0; i < wireframes.length; i++) {
          wireframes[i].visible = viewScene.viewConfig.showWireframes;
        }
        for (let i = 0; i < meshes.length; i++) {
          meshes[i].material.visible = viewScene.viewConfig.showMeshes;
        }
        for (let i = 0; i < colliders.length; i++) {
          colliders[i].material.visible = viewScene.viewConfig.showColliders;
        }
      };


      let maxExtent = 0;

      path += (path === '' ? '' : '/');

      const scene = new THREE.Scene();

      // Iterate over 'shapes'
      for (let i = 0; i < pdxData.props.object.subNodes.length; i++) {
        if (pdxData.props.object.subNodes[i].type !== 'object') { continue; }

        const pdxShape = pdxData.props.object.subNodes[i];

        const bones = [];
        const bonesByName = {};
        if ('skeleton' in pdxShape.props) {
          const skeleton = pdxShape.props.skeleton;

          const geometry = new THREE.Geometry();
          const material = new THREE.MeshBasicMaterial();
          material.wireframe = true;
          material.color = new THREE.Color(0x00FF00);

          // Iterate over 'bones', load all
          for (let j = 0; j < skeleton.subNodes.length; j++) {
            const bone = new THREE.Bone();
            bone.name = skeleton.subNodes[j].name;
            bone.boneNr = j;

            bonesByName[bone.name] = bone;
            bones.push(bone);

            const pdxBone = skeleton.subNodes[j].props;
            const boneTx = pdxBone.tx;

            let parent = scene;
            if ('pa' in pdxBone) { parent = bones[pdxBone.pa]; }

            // NOTE: input is in ROW-major order
            let matrix = new THREE.Matrix4().set(
              boneTx[0], boneTx[3], boneTx[6], boneTx[9],
              boneTx[1], boneTx[4], boneTx[7], boneTx[10],
              boneTx[2], boneTx[5], boneTx[8], boneTx[11],
              0, 0, 0, 1
            );

            if (boneTx.every((tx) => tx === 0)) {
              console.log(`Bone \`${bone.name}\` is outside skeleton.`);
              matrix = new THREE.Matrix4();
            } else {
              matrix = new THREE.Matrix4().getInverse(matrix, true);
              bone.applyMatrix(matrix);
            }

            if (parent !== scene) {
              parent.updateMatrix();

              const matrixWorldInverse = new THREE.Matrix4();
              matrixWorldInverse.getInverse(parent.matrixWorld, true);
              bone.applyMatrix(matrixWorldInverse);
            }

            parent.add(bone);

            bone.updateMatrixWorld(true);
            bone.updateMatrix();

            if (pdxBone.ix !== bones.length - 1) { console.log(`Bone #${pdxBone.ix.data} is not entry #${bones.length - 1}`); }
          }


          const skeletonHelper = new THREE.SkeletonHelper(bones[0]);
          for (let k = 0; k < skeletonHelper.geometry.colors.length; k += 2) {
            skeletonHelper.geometry.colors[k] = new THREE.Color(1, 0, 0);
            skeletonHelper.geometry.colors[k + 1] = new THREE.Color(1, 1, 1);
          }
          scene.add(skeletonHelper);
          skeletons.push(skeletonHelper);

          scene.bones = bones;
          scene.bonesByName = bonesByName;
        }
        boneCount += bones.length;

        // Iterate over 'objects in shapes'
        for (let j = 0; j < pdxShape.subNodes.length; j++) {
          if (pdxShape.subNodes[j].type !== 'object') { continue; }

          const pdxMesh = pdxShape.subNodes[j].props;

          if ('aabb' in pdxMesh) {
            maxExtent = Math.max(maxExtent, -pdxMesh.aabb.props.min[0], -pdxMesh.aabb.props.min[1], -pdxMesh.aabb.props.min[2]);
            maxExtent = Math.max(maxExtent, pdxMesh.aabb.props.max[0], pdxMesh.aabb.props.max[1], pdxMesh.aabb.props.max[2]);
          }

          if ('p' in pdxMesh) {
            const geometry = new THREE.Geometry();

            // Vertices
            for (let k = 0; k < pdxMesh.p.length; k += 3) { geometry.vertices.push(new THREE.Vector3(pdxMesh.p[k], pdxMesh.p[k + 1], pdxMesh.p[k + 2])); }
            // Normals
            const normals = [];
            if ('n' in pdxMesh) {
              for (let k = 0; k < pdxMesh.n.length; k += 3) { normals.push(new THREE.Vector3(pdxMesh.n[k], pdxMesh.n[k + 1], pdxMesh.n[k + 2])); }
            }
            // Tangents
            const tangents = [];
            if ('ta' in pdxMesh) {
              for (let k = 0; k < pdxMesh.ta.length; k += 4) { tangents.push(new THREE.Vector4(pdxMesh.ta[k], pdxMesh.ta[k + 1], pdxMesh.ta[k + 2], pdxMesh.ta[k + 3])); }
            }
            // Texture mapping
            const textureMapping = [];
            if ('u0' in pdxMesh) {
              for (let k = 0; k < pdxMesh.u0.length; k += 2) {
                textureMapping.push(new THREE.Vector2(pdxMesh.u0[k], pdxMesh.u0[k + 1]));
              }
            }
            // Skin
            if ('skin' in pdxMesh) {
              const skin = pdxMesh.skin.props;
              const influencesPerVertex = skin.bones;
              // Stored per 4, but if less is used, this is stored for optimalization?
              for (let k = 0; k < skin.ix.length; k += 4) {
                const a = skin.ix[k];
                const b = (influencesPerVertex > 1) ? skin.ix[k + 1] : -1;
                const c = (influencesPerVertex > 2) ? skin.ix[k + 2] : -1;
                const d = (influencesPerVertex > 3) ? skin.ix[k + 3] : -1;

                geometry.skinIndices.push(new THREE.Vector4(a, b, c, d));
              }
              for (let k = 0; k < skin.w.length; k += 4) {
                const a = skin.w[k];
                const b = (influencesPerVertex > 1) ? skin.w[k + 1] : 0;
                const c = (influencesPerVertex > 2) ? skin.w[k + 2] : 0;
                const d = (influencesPerVertex > 3) ? skin.w[k + 3] : 0;

                geometry.skinWeights.push(new THREE.Vector4(a, b, c, d));
              }
            }

            // Faces
            for (let k = 0; k < pdxMesh.tri.length; k += 3) {
              const f = new THREE.Face3(pdxMesh.tri[k], pdxMesh.tri[k + 1], pdxMesh.tri[k + 2]);
              if (normals.length > 0) {
                f.vertexNormals = [
                  normals[pdxMesh.tri[k]],
                  normals[pdxMesh.tri[k + 1]],
                  normals[pdxMesh.tri[k + 2]]
                ];
              }
              if (tangents.length > 0) {
                f.vertexTangents = [
                  tangents[pdxMesh.tri[k]],
                  tangents[pdxMesh.tri[k + 1]],
                  tangents[pdxMesh.tri[k + 2]]
                ];
              }
              if (textureMapping.length > 0) {
                geometry.faceVertexUvs[0].push([
                  textureMapping[pdxMesh.tri[k]],
                  textureMapping[pdxMesh.tri[k + 1]],
                  textureMapping[pdxMesh.tri[k + 2]]
                ]);
              }
              geometry.faces.push(f);
            }
            triangleCount += geometry.faces.length + 1;

            // Material
            const material = new THREE.MeshDepthMaterial();

            const mesh = new THREE.SkinnedMesh(geometry, material);
            mesh.name = pdxShape.subNodes[j].name;
            mesh.pdxData = pdxShape.subNodes[j];
            mesh.pdxPath = path;

            this.updatePdxMesh(mesh);

            scene.add(mesh);

            const wireframeHelper = new THREE.WireframeHelper(mesh, 0xff0000);
            mesh.add(wireframeHelper);
            wireframes.push(wireframeHelper);

            if (scene.bones && scene.bones.length) {
              mesh.add(scene.bones[0]);
              mesh.bind(new THREE.Skeleton(scene.bones));
            }

            mesh.pose();

            if ('material' in pdxMesh && pdxMesh.material.props.shader === 'Collision') { colliders.push(mesh); }

            meshes.push(mesh);
          }
        }
      }

      deferred.resolve({
        object: scene,
        distance: maxExtent,
        labels,
        update,
        triangleCount,
        boneCount,
        meshCount: meshes.length,
        meshes,
        animations: [],
        colliders,
      });

      return deferred.promise;
    }

    updatePdxMesh(mesh) {
      if (!mesh.pdxData) { return; }

      const pdxMaterial = mesh.pdxData.props.material.props;

      if (pdxMaterial.shader === 'Collision') {
        const material = new THREE.MeshBasicMaterial();
        material.wireframe = true;
        material.color = new THREE.Color(0, 1, 0);

        mesh.material = material;
      } else {
        if (!(pdxMaterial.shader === 'PdxMeshTextureAtlas'
                    || pdxMaterial.shader === 'PdxMeshAlphaBlendNoZWrite'
                    || pdxMaterial.shader === 'PdxMeshColor'
                    || pdxMaterial.shader === 'PdxMeshStandard'
                    || pdxMaterial.shader === 'PdxMeshSnow'
                    || pdxMaterial.shader === 'PdxMeshAlphaBlend'
                    || pdxMaterial.shader === 'PdxMeshStandard_NoFoW_NoTI'
                    || pdxMaterial.shader === 'JdxMeshShield'
                    || pdxMaterial.shader === 'JdxMeshShieldTextureAtlas')) {
          console.log(`Unknown shader: ${pdxMaterial.shader}`);
        }

        material = new THREE.MeshPhongMaterial();
        if ('diff' in pdxMaterial) {
          material.map = this.loadDdsToTexture(modService.getFileBuffer(mesh.pdxPath + pdxMaterial.diff)); // THREE.ImageUtils.loadTexture('img/barque_diffuse.png');
          material.map.fileName = pdxMaterial.diff;
        }
        if ('n' in pdxMaterial) {
          material.normalMap = this.loadDdsToTexture(modService.getFileBuffer(mesh.pdxPath + pdxMaterial.n));
          material.normalMap.fileName = pdxMaterial.n;
        }
        if ('spec' in pdxMaterial) {
          material.specularMap = this.loadDdsToTexture(modService.getFileBuffer(mesh.pdxPath + pdxMaterial.spec));
          material.specularMap.fileName = pdxMaterial.spec;
        }

        if (pdxMaterial.shader === 'PdxMeshAlphaBlendNoZWrite') {
          material.transparent = true;
        }
        if (pdxMaterial.shader === 'PdxMeshAlphaBlend') {
          material.transparent = true;
        }

        if (mesh.geometry.skinIndices.length) { material.skinning = true; }
      }

      mesh.material = material;
    }

    setPdxAnimation(viewScene, pdxAnimationData) {
      const deferred = $q.defer();

      const scene = viewScene.viewConfig.viewObject.object;

      if (!scene.bones || !scene.bones.length) {
        deferred.reject('Object does not contain bones.');
        return deferred.promise;
      }

      let animationData = null;

      if (pdxAnimationData) {
        const pdxAnimProps = pdxAnimationData.props.info.props;

        animationData = {
          name: 'test',
          fps: pdxAnimProps.fps,
          length: pdxAnimProps.sa / pdxAnimProps.fps,
          hierarchy: [],
          // PDX Extra:
          sampleCount: pdxAnimProps.sa,
        };

        const tBones = [];
        const qBones = [];
        const sBones = [];

        const alternativeNames = {
          attack_L_hand: 'Left_hand_node',
          attack_R_hand: 'Right_hand_node',
        };

        for (let k = 0; k < pdxAnimationData.props.info.subNodes.length; k++) {
          const pdxAnimBone = pdxAnimationData.props.info.subNodes[k];

          if (pdxAnimBone.type !== 'object') { continue; }

          let bone = null;
          // Assign 'base' animation state
          if (scene.bonesByName[pdxAnimBone.name]) { bone = scene.bonesByName[pdxAnimBone.name]; }
          if (!bone && alternativeNames[pdxAnimBone.name] && scene.bonesByName[alternativeNames[pdxAnimBone.name]]) { bone = scene.bonesByName[alternativeNames[pdxAnimBone.name]]; }

          if (bone) {
            animationData.hierarchy.push({
              parent: bone.parent instanceof THREE.Bone ? bone.parent.boneNr : -1,
              name: pdxAnimBone.name,
              keys: [{
                time: 0, pos: pdxAnimBone.props.t, rot: pdxAnimBone.props.q, scl: [pdxAnimBone.props.s, pdxAnimBone.props.s, pdxAnimBone.props.s]
              }],
              // PDX Extra:
              sampleT: pdxAnimBone.props.sa.indexOf('t') !== -1,
              sampleQ: pdxAnimBone.props.sa.indexOf('q') !== -1,
              sampleS: pdxAnimBone.props.sa.indexOf('s') !== -1,
              skipData: false,
            });
          } else {
            console.log(`Animation bone ${pdxAnimBone.name} not found in model.`);

            animationData.hierarchy.push({
              parent: -1,
              name: pdxAnimBone.name,
              keys: [{
                time: 0, pos: pdxAnimBone.props.t, rot: pdxAnimBone.props.q, scl: [pdxAnimBone.props.s, pdxAnimBone.props.s, pdxAnimBone.props.s]
              }],
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
        const pdxAnimSamples = pdxAnimationData.props.samples.props;
        for (let sample = 0; sample < animationData.sampleCount; sample++) {
          for (let k = 0; k < animationData.hierarchy.length; k++) {
            const hier = animationData.hierarchy[k];
            if (hier.sampleT || hier.sampleQ || hier.sampleS) {
              const key = {};

              key.time = sample * (1 / animationData.fps);

              if (hier.sampleT) {
                key.pos = [pdxAnimSamples.t[offsetT], pdxAnimSamples.t[offsetT + 1], pdxAnimSamples.t[offsetT + 2]];
                offsetT += 3;
              }

              if (hier.sampleQ) {
                key.rot = [pdxAnimSamples.q[offsetQ], pdxAnimSamples.q[offsetQ + 1], pdxAnimSamples.q[offsetQ + 2], pdxAnimSamples.q[offsetQ + 3]];
                offsetQ += 4;
              }

              if (hier.sampleS) {
                key.scl = [pdxAnimSamples.s[offsetS], pdxAnimSamples.s[offsetS], pdxAnimSamples.s[offsetS]];
                offsetS += 1;
              }

              hier.keys.push(key);
            }
          }
        }
      }

      // Stop any existing animations
      for (let i = 0; i < viewScene.viewConfig.viewObject.animations.length; i++) {
        viewScene.viewConfig.viewObject.animations[i].stop();
      }
      viewScene.viewConfig.viewObject.animations = [];

      // 'Reset' skeleton and start new animation (if set)
      scene.traverse((subObject) => {
        if (subObject instanceof THREE.SkinnedMesh) { subObject.pose(); }
      });
      if (animationData) {
        const animation = new THREE.Animation(viewScene.viewConfig.viewObject.object.bones[0], animationData);
        animation.play();
        viewScene.viewConfig.viewObject.animations.push(animation);
      }
    }


    loadDdsToTexture(bufferPromise, geometry) {
      const ddsLoader = new THREE.DDSLoader();

      const texture = new THREE.CompressedTexture();
      const images = [];
      texture.image = images;

      bufferPromise.then((buffer) => {
        const texDatas = ddsLoader._parser(buffer, true);

        if (texDatas.isCubemap) {
          const faces = texDatas.mipmaps.length / texDatas.mipmapCount;

          for (let f = 0; f < faces; f++) {
            images[f] = {mipmaps: []};

            for (let i = 0; i < texDatas.mipmapCount; i++) {
              images[f].mipmaps.push(texDatas.mipmaps[f * texDatas.mipmapCount + i]);
              images[f].format = texDatas.format;
              images[f].width = texDatas.width;
              images[f].height = texDatas.height;
            }
          }
        } else {
          texture.image.width = texDatas.width;
          texture.image.height = texDatas.height;
          texture.mipmaps = texDatas.mipmaps;
        }

        if (texDatas.mipmapCount === 1) {
          texture.minFilter = THREE.LinearFilter;
        }

        texture.format = texDatas.format;
        texture.needsUpdate = true;

        if (geometry) {
          geometry.buffersNeedUpdate = true;
          geometry.uvsNeedUpdate = true;
        }
      }, () => {
        const greyTexture = new Uint8Array(4);
        greyTexture[0] = 128;
        greyTexture[1] = 128;
        greyTexture[2] = 128;
        greyTexture[3] = 255;

        texture.mipmaps = [
          {data: greyTexture, width: 1, height: 1}
        ];
        texture.needsUpdate = true;
      });

      return texture;
    }

    createViewScene(container, width, height, viewConfig) {
      const deferred = $q.defer();

      let scene,
        camera,
        renderer;

      if (!viewConfig) {
        viewConfig = {
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
      }

      camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
      camera.position.set(0, 6, 0);

      scene = new THREE.Scene();

      // Grid
      let size = 100,
        step = 1;
      const geometry = new THREE.Geometry();
      const material = new THREE.LineBasicMaterial({color: 0x303030});
      for (let i = -size; i <= size; i += step) {
        geometry.vertices.push(new THREE.Vector3(-size, -0.04, i));
        geometry.vertices.push(new THREE.Vector3(size, -0.04, i));
        geometry.vertices.push(new THREE.Vector3(i, -0.04, -size));
        geometry.vertices.push(new THREE.Vector3(i, -0.04, size));
      }
      const line = new THREE.Line(geometry, material, THREE.LinePieces);
      scene.add(line);

      // Some particle lights
      const particleLight = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({color: 0xffffff}));
      scene.add(particleLight);

      // General lights
      scene.add(new THREE.AmbientLight(0xcccccc));

      const directionalLight = new THREE.DirectionalLight(0xeeeeee);
      directionalLight.position.x = Math.random() - 0.5;
      directionalLight.position.y = Math.random() - 0.5;
      directionalLight.position.z = Math.random() - 0.5;
      directionalLight.position.normalize();
      scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0xffffff, 4);
      particleLight.add(pointLight);

      // Prime the renderer & place in DOM
      renderer = new THREE.WebGLRenderer();
      renderer.setSize(width, height);
      container.appendChild(renderer.domElement);

      renderer.render(scene, camera);

      const clock = new THREE.Clock();

      let viewerDestroyed = false;

      const halfWidth = width / 2;
      const halfHeight = height / 2;

      function render() {
        // Crappy detection if view is destroyed...
        if (viewerDestroyed || !renderer.domElement.parentNode.baseURI) {
          viewerDestroyed = true;
          return;
        }

        const delta = clock.getDelta();

        if (viewConfig.rotate) { viewConfig.rotation += delta * 0.5; }

        camera.position.x = Math.cos(viewConfig.rotation) * viewConfig.distance;
        camera.position.y = viewConfig.distance / 4;
        camera.position.z = Math.sin(viewConfig.rotation) * viewConfig.distance;

        camera.lookAt(scene.position);

        const timer = Date.now() * 0.0005;

        particleLight.visible = viewConfig.showSpotlights;

        particleLight.position.x = Math.sin(timer * 4) * 30009;
        particleLight.position.y = Math.cos(timer * 5) * 40000;
        particleLight.position.z = Math.cos(timer * 4) * 30009;

        THREE.AnimationHandler.update(delta);

        if (viewConfig.viewObject && viewConfig.viewObject.labels) {
          for (let i = 0; i < viewConfig.viewObject.labels.length; i++) {
            const label = viewConfig.viewObject.labels[i];

            if (!label.div) {
              label.div = document.createElement('div');
              label.div.innerHTML = label.text;
              label.div.style.position = 'absolute';
              container.children[0].appendChild(label.div);
            }

            const pos = label.pos3d.clone().project(camera);

            label.div.style.left = `${Math.round(pos.x * halfWidth + halfWidth)}px`;
            label.div.style.top = `${Math.round(-pos.y * halfHeight + halfHeight)}px`;
          }
        }

        renderer.render(scene, camera);
      }

      const viewScene = {
        scene,
        renderer,
        camera,
        viewConfig,
      };

      function animate() {
        if (viewerDestroyed) { return; }

        requestAnimationFrame(animate);

        if (viewConfig.update) { viewConfig.update(viewScene); }

        render();
      }

      animate();

      /*
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        container.appendChild( stats.domElement );
        */
      deferred.resolve(viewScene);

      return deferred.promise;
    }
}
