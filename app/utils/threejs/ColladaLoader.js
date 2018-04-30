import * as THREE from 'three';

/**
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / https://github.com/Mugen87
 */

THREE.ColladaLoader = function (manager) {
  this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
};

THREE.ColladaLoader.prototype = {

  constructor: THREE.ColladaLoader,

  crossOrigin: 'Anonymous',

  load(url, onLoad, onProgress, onError) {
    const scope = this;

    const path = THREE.Loader.prototype.extractUrlBase(url);

    const loader = new THREE.FileLoader(scope.manager);
    loader.load(url, (text) => {
      onLoad(scope.parse(text, path));
    }, onProgress, onError);
  },

  options: {

    set convertUpAxis(value) {
      console.warn('THREE.ColladaLoader: options.convertUpAxis() has been removed. Up axis is converted automatically.');
    }

  },

  setCrossOrigin(value) {
    this.crossOrigin = value;
  },

  parse(text, path) {
    function getElementsByTagName(xml, name) {
      // Non recursive xml.getElementsByTagName() ...

      const array = [];
      const childNodes = xml.childNodes;

      for (let i = 0, l = childNodes.length; i < l; i++) {
        const child = childNodes[i];

        if (child.nodeName === name) {
          array.push(child);
        }
      }

      return array;
    }

    function parseStrings(text) {
      if (text.length === 0) return [];

      const parts = text.trim().split(/\s+/);
      const array = new Array(parts.length);

      for (let i = 0, l = parts.length; i < l; i++) {
        array[i] = parts[i];
      }

      return array;
    }

    function parseFloats(text) {
      if (text.length === 0) return [];

      const parts = text.trim().split(/\s+/);
      const array = new Array(parts.length);

      for (let i = 0, l = parts.length; i < l; i++) {
        array[i] = parseFloat(parts[i]);
      }

      return array;
    }

    function parseInts(text) {
      if (text.length === 0) return [];

      const parts = text.trim().split(/\s+/);
      const array = new Array(parts.length);

      for (let i = 0, l = parts.length; i < l; i++) {
        array[i] = parseInt(parts[i]);
      }

      return array;
    }

    function parseId(text) {
      return text.substring(1);
    }

    function generateId() {
      return `three_default_${count++}`;
    }

    function isEmpty(object) {
      return Object.keys(object).length === 0;
    }

    // asset

    function parseAsset(xml) {
      return {
        unit: parseAssetUnit(getElementsByTagName(xml, 'unit')[0]),
        upAxis: parseAssetUpAxis(getElementsByTagName(xml, 'up_axis')[0])
      };
    }

    function parseAssetUnit(xml) {
      return xml !== undefined ? parseFloat(xml.getAttribute('meter')) : 1;
    }

    function parseAssetUpAxis(xml) {
      return xml !== undefined ? xml.textContent : 'Y_UP';
    }

    // library

    function parseLibrary(xml, libraryName, nodeName, parser) {
      const library = getElementsByTagName(xml, libraryName)[0];

      if (library !== undefined) {
        const elements = getElementsByTagName(library, nodeName);

        for (let i = 0; i < elements.length; i++) {
          parser(elements[i]);
        }
      }
    }

    function buildLibrary(data, builder) {
      for (const name in data) {
        const object = data[name];
        object.build = builder(data[name]);
      }
    }

    // get

    function getBuild(data, builder) {
      if (data.build !== undefined) return data.build;

      data.build = builder(data);

      return data.build;
    }

    // animation

    function parseAnimation(xml) {
      const data = {
        sources: {},
        samplers: {},
        channels: {}
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        var id;

        switch (child.nodeName) {
          case 'source':
            id = child.getAttribute('id');
            data.sources[id] = parseSource(child);
            break;

          case 'sampler':
            id = child.getAttribute('id');
            data.samplers[id] = parseAnimationSampler(child);
            break;

          case 'channel':
            id = child.getAttribute('target');
            data.channels[id] = parseAnimationChannel(child);
            break;

          default:
            console.log(child);
        }
      }

      library.animations[xml.getAttribute('id')] = data;
    }

    function parseAnimationSampler(xml) {
      const data = {
        inputs: {},
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'input':
            var id = parseId(child.getAttribute('source'));
            var semantic = child.getAttribute('semantic');
            data.inputs[semantic] = id;
            break;
        }
      }

      return data;
    }

    function parseAnimationChannel(xml) {
      const data = {};

      const target = xml.getAttribute('target');

      // parsing SID Addressing Syntax

      let parts = target.split('/');

      const id = parts.shift();
      let sid = parts.shift();

      // check selection syntax

      const arraySyntax = (sid.indexOf('(') !== -1);
      const memberSyntax = (sid.indexOf('.') !== -1);

      if (memberSyntax) {
        //  member selection access

        parts = sid.split('.');
        sid = parts.shift();
        data.member = parts.shift();
      } else if (arraySyntax) {
        // array-access syntax. can be used to express fields in one-dimensional vectors or two-dimensional matrices.

        const indices = sid.split('(');
        sid = indices.shift();

        for (let i = 0; i < indices.length; i++) {
          indices[i] = parseInt(indices[i].replace(/\)/, ''));
        }

        data.indices = indices;
      }

      data.id = id;
      data.sid = sid;

      data.arraySyntax = arraySyntax;
      data.memberSyntax = memberSyntax;

      data.sampler = parseId(xml.getAttribute('source'));

      return data;
    }

    function buildAnimation(data) {
      const tracks = [];

      const channels = data.channels;
      const samplers = data.samplers;
      const sources = data.sources;

      for (const target in channels) {
        if (channels.hasOwnProperty(target)) {
          const channel = channels[target];
          const sampler = samplers[channel.sampler];

          const inputId = sampler.inputs.INPUT;
          const outputId = sampler.inputs.OUTPUT;

          const inputSource = sources[inputId];
          const outputSource = sources[outputId];

          const animation = buildAnimationChannel(channel, inputSource, outputSource);

          createKeyframeTracks(animation, tracks);
        }
      }

      return tracks;
    }

    function getAnimation(id) {
      return getBuild(library.animations[id], buildAnimation);
    }

    function buildAnimationChannel(channel, inputSource, outputSource) {
      const node = library.nodes[channel.id];
      const object3D = getNode(node.id);

      const transform = node.transforms[channel.sid];
      const defaultMatrix = node.matrix.clone().transpose();

      let time,
        stride;
      let i,
        il,
        j,
        jl;

      const data = {};

      // the collada spec allows the animation of data in various ways.
      // depending on the transform type (matrix, translate, rotate, scale), we execute different logic

      switch (transform) {
        case 'matrix':

          for (i = 0, il = inputSource.array.length; i < il; i++) {
            time = inputSource.array[i];
            stride = i * outputSource.stride;

            if (data[time] === undefined) data[time] = {};

            if (channel.arraySyntax === true) {
              const value = outputSource.array[stride];
              const index = channel.indices[0] + 4 * channel.indices[1];

              data[time][index] = value;
            } else {
              for (j = 0, jl = outputSource.stride; j < jl; j++) {
                data[time][j] = outputSource.array[stride + j];
              }
            }
          }

          break;

        case 'translate':
          console.warn('THREE.ColladaLoader: Animation transform type "%s" not yet implemented.', transform);
          break;

        case 'rotate':
          console.warn('THREE.ColladaLoader: Animation transform type "%s" not yet implemented.', transform);
          break;

        case 'scale':
          console.warn('THREE.ColladaLoader: Animation transform type "%s" not yet implemented.', transform);
          break;
      }

      const keyframes = prepareAnimationData(data, defaultMatrix);

      const animation = {
        name: object3D.uuid,
        keyframes
      };

      return animation;
    }

    function prepareAnimationData(data, defaultMatrix) {
      const keyframes = [];

      // transfer data into a sortable array

      for (const time in data) {
        keyframes.push({time: parseFloat(time), value: data[time]});
      }

      // ensure keyframes are sorted by time

      keyframes.sort(ascending);

      // now we clean up all animation data, so we can use them for keyframe tracks

      for (let i = 0; i < 16; i++) {
        transformAnimationData(keyframes, i, defaultMatrix.elements[i]);
      }

      return keyframes;

      // array sort function

      function ascending(a, b) {
        return a.time - b.time;
      }
    }

    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();

    function createKeyframeTracks(animation, tracks) {
      const keyframes = animation.keyframes;
      const name = animation.name;

      const times = [];
      const positionData = [];
      const quaternionData = [];
      const scaleData = [];

      for (let i = 0, l = keyframes.length; i < l; i++) {
        const keyframe = keyframes[i];

        const time = keyframe.time;
        const value = keyframe.value;

        matrix.fromArray(value).transpose();
        matrix.decompose(position, quaternion, scale);

        times.push(time);
        positionData.push(position.x, position.y, position.z);
        quaternionData.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        scaleData.push(scale.x, scale.y, scale.z);
      }

      if (positionData.length > 0) tracks.push(new THREE.VectorKeyframeTrack(`${name}.position`, times, positionData));
      if (quaternionData.length > 0) tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, quaternionData));
      if (scaleData.length > 0) tracks.push(new THREE.VectorKeyframeTrack(`${name}.scale`, times, scaleData));

      return tracks;
    }

    function transformAnimationData(keyframes, property, defaultValue) {
      let keyframe;

      let empty = true;
      let i,
        l;

      // check, if values of a property are missing in our keyframes

      for (i = 0, l = keyframes.length; i < l; i++) {
        keyframe = keyframes[i];

        if (keyframe.value[property] === undefined) {
          keyframe.value[property] = null; // mark as missing
        } else {
          empty = false;
        }
      }

      if (empty === true) {
        // no values at all, so we set a default value

        for (i = 0, l = keyframes.length; i < l; i++) {
          keyframe = keyframes[i];

          keyframe.value[property] = defaultValue;
        }
      } else {
        // filling gaps

        createMissingKeyframes(keyframes, property);
      }
    }

    function createMissingKeyframes(keyframes, property) {
      let prev,
        next;

      for (let i = 0, l = keyframes.length; i < l; i++) {
        const keyframe = keyframes[i];

        if (keyframe.value[property] === null) {
          prev = getPrev(keyframes, i, property);
          next = getNext(keyframes, i, property);

          if (prev === null) {
            keyframe.value[property] = next.value[property];
            continue;
          }

          if (next === null) {
            keyframe.value[property] = prev.value[property];
            continue;
          }

          interpolate(keyframe, prev, next, property);
        }
      }
    }

    function getPrev(keyframes, i, property) {
      while (i >= 0) {
        const keyframe = keyframes[i];

        if (keyframe.value[property] !== null) return keyframe;

        i--;
      }

      return null;
    }

    function getNext(keyframes, i, property) {
      while (i < keyframes.length) {
        const keyframe = keyframes[i];

        if (keyframe.value[property] !== null) return keyframe;

        i++;
      }

      return null;
    }

    function interpolate(key, prev, next, property) {
      if ((next.time - prev.time) === 0) {
        key.value[property] = prev.value[property];
        return;
      }

      key.value[property] = ((key.time - prev.time) * (next.value[property] - prev.value[property]) / (next.time - prev.time)) + prev.value[property];
    }

    // animation clips

    function parseAnimationClip(xml) {
      const data = {
        name: xml.getAttribute('id') || 'default',
        start: parseFloat(xml.getAttribute('start') || 0),
        end: parseFloat(xml.getAttribute('end') || 0),
        animations: []
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'instance_animation':
            data.animations.push(parseId(child.getAttribute('url')));
            break;
        }
      }

      library.clips[xml.getAttribute('id')] = data;
    }

    function buildAnimationClip(data) {
      const tracks = [];

      const name = data.name;
      const duration = (data.end - data.start) || -1;
      const animations = data.animations;

      for (let i = 0, il = animations.length; i < il; i++) {
        const animationTracks = getAnimation(animations[i]);

        for (let j = 0, jl = animationTracks.length; j < jl; j++) {
          tracks.push(animationTracks[j]);
        }
      }

      return new THREE.AnimationClip(name, duration, tracks);
    }

    function getAnimationClip(id) {
      return getBuild(library.clips[id], buildAnimationClip);
    }

    // controller

    function parseController(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'skin':
            // there is exactly one skin per controller
            data.id = parseId(child.getAttribute('source'));
            data.skin = parseSkin(child);
            break;

          case 'morph':
            data.id = parseId(child.getAttribute('source'));
            console.warn('THREE.ColladaLoader: Morph target animation not supported yet.');
            break;
        }
      }

      library.controllers[xml.getAttribute('id')] = data;
    }

    function parseSkin(xml) {
      const data = {
        sources: {}
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'bind_shape_matrix':
            data.bindShapeMatrix = parseFloats(child.textContent);
            break;

          case 'source':
            var id = child.getAttribute('id');
            data.sources[id] = parseSource(child);
            break;

          case 'joints':
            data.joints = parseJoints(child);
            break;

          case 'vertex_weights':
            data.vertexWeights = parseVertexWeights(child);
            break;
        }
      }

      return data;
    }

    function parseJoints(xml) {
      const data = {
        inputs: {}
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'input':
            var semantic = child.getAttribute('semantic');
            var id = parseId(child.getAttribute('source'));
            data.inputs[semantic] = id;
            break;
        }
      }

      return data;
    }

    function parseVertexWeights(xml) {
      const data = {
        inputs: {}
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'input':
            var semantic = child.getAttribute('semantic');
            var id = parseId(child.getAttribute('source'));
            var offset = parseInt(child.getAttribute('offset'));
            data.inputs[semantic] = {id, offset};
            break;

          case 'vcount':
            data.vcount = parseInts(child.textContent);
            break;

          case 'v':
            data.v = parseInts(child.textContent);
            break;
        }
      }

      return data;
    }

    function buildController(data) {
      const build = {
        id: data.id
      };

      const geometry = library.geometries[build.id];

      if (data.skin !== undefined) {
        build.skin = buildSkin(data.skin);

        // we enhance the 'sources' property of the corresponding geometry with our skin data

        geometry.sources.skinIndices = build.skin.indices;
        geometry.sources.skinWeights = build.skin.weights;
      }

      return build;
    }

    function buildSkin(data) {
      const BONE_LIMIT = 4;

      const build = {
        joints: [], // this must be an array to preserve the joint order
        indices: {
          array: [],
          stride: BONE_LIMIT
        },
        weights: {
          array: [],
          stride: BONE_LIMIT
        }
      };

      const sources = data.sources;
      const vertexWeights = data.vertexWeights;

      const vcount = vertexWeights.vcount;
      const v = vertexWeights.v;
      const jointOffset = vertexWeights.inputs.JOINT.offset;
      const weightOffset = vertexWeights.inputs.WEIGHT.offset;

      const jointSource = data.sources[data.joints.inputs.JOINT];
      const inverseSource = data.sources[data.joints.inputs.INV_BIND_MATRIX];

      const weights = sources[vertexWeights.inputs.WEIGHT.id].array;
      let stride = 0;

      let i,
        j,
        l;

      // procces skin data for each vertex

      for (i = 0, l = vcount.length; i < l; i++) {
        const jointCount = vcount[i]; // this is the amount of joints that affect a single vertex
        const vertexSkinData = [];

        for (j = 0; j < jointCount; j++) {
          const skinIndex = v[stride + jointOffset];
          const weightId = v[stride + weightOffset];
          const skinWeight = weights[weightId];

          vertexSkinData.push({index: skinIndex, weight: skinWeight});

          stride += 2;
        }

        // we sort the joints in descending order based on the weights.
        // this ensures, we only procced the most important joints of the vertex

        vertexSkinData.sort(descending);

        // now we provide for each vertex a set of four index and weight values.
        // the order of the skin data matches the order of vertices

        for (j = 0; j < BONE_LIMIT; j++) {
          const d = vertexSkinData[j];

          if (d !== undefined) {
            build.indices.array.push(d.index);
            build.weights.array.push(d.weight);
          } else {
            build.indices.array.push(0);
            build.weights.array.push(0);
          }
        }
      }

      // setup bind matrix

      build.bindMatrix = new THREE.Matrix4().fromArray(data.bindShapeMatrix).transpose();

      // process bones and inverse bind matrix data

      for (i = 0, l = jointSource.array.length; i < l; i++) {
        const name = jointSource.array[i];
        const boneInverse = new THREE.Matrix4().fromArray(inverseSource.array, i * inverseSource.stride).transpose();

        build.joints.push({name, boneInverse});
      }

      return build;

      // array sort function

      function descending(a, b) {
        return b.weight - a.weight;
      }
    }

    function getController(id) {
      return getBuild(library.controllers[id], buildController);
    }

    // image

    function parseImage(xml) {
      const data = {
        init_from: getElementsByTagName(xml, 'init_from')[0].textContent
      };

      library.images[xml.getAttribute('id')] = data;
    }

    function buildImage(data) {
      if (data.build !== undefined) return data.build;

      return data.init_from;
    }

    function getImage(id) {
      return getBuild(library.images[id], buildImage);
    }

    // effect

    function parseEffect(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'profile_COMMON':
            data.profile = parseEffectProfileCOMMON(child);
            break;
        }
      }

      library.effects[xml.getAttribute('id')] = data;
    }

    function parseEffectProfileCOMMON(xml) {
      const data = {
        surfaces: {},
        samplers: {}
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'newparam':
            parseEffectNewparam(child, data);
            break;

          case 'technique':
            data.technique = parseEffectTechnique(child);
            break;
        }
      }

      return data;
    }

    function parseEffectNewparam(xml, data) {
      const sid = xml.getAttribute('sid');

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'surface':
            data.surfaces[sid] = parseEffectSurface(child);
            break;

          case 'sampler2D':
            data.samplers[sid] = parseEffectSampler(child);
            break;
        }
      }
    }

    function parseEffectSurface(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'init_from':
            data.init_from = child.textContent;
            break;
        }
      }

      return data;
    }

    function parseEffectSampler(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'source':
            data.source = child.textContent;
            break;
        }
      }

      return data;
    }

    function parseEffectTechnique(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'constant':
          case 'lambert':
          case 'blinn':
          case 'phong':
            data.type = child.nodeName;
            data.parameters = parseEffectParameters(child);
            break;
        }
      }

      return data;
    }

    function parseEffectParameters(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'emission':
          case 'diffuse':
          case 'specular':
          case 'shininess':
          case 'transparent':
          case 'transparency':
            data[child.nodeName] = parseEffectParameter(child);
            break;
        }
      }

      return data;
    }

    function parseEffectParameter(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'color':
            data[child.nodeName] = parseFloats(child.textContent);
            break;

          case 'float':
            data[child.nodeName] = parseFloat(child.textContent);
            break;

          case 'texture':
            data[child.nodeName] = {id: child.getAttribute('texture'), extra: parseEffectParameterTexture(child)};
            break;
        }
      }

      return data;
    }

    function parseEffectParameterTexture(xml) {
      const data = {
        technique: {}
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'extra':
            parseEffectParameterTextureExtra(child, data);
            break;
        }
      }

      return data;
    }

    function parseEffectParameterTextureExtra(xml, data) {
      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'technique':
            parseEffectParameterTextureExtraTechnique(child, data);
            break;
        }
      }
    }

    function parseEffectParameterTextureExtraTechnique(xml, data) {
      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'repeatU':
          case 'repeatV':
          case 'offsetU':
          case 'offsetV':
            data.technique[child.nodeName] = parseFloat(child.textContent);
            break;

          case 'wrapU':
          case 'wrapV':

            // some files have values for wrapU/wrapV which become NaN via parseInt

            if (child.textContent.toUpperCase() === 'TRUE') {
              data.technique[child.nodeName] = 1;
            } else if (child.textContent.toUpperCase() === 'FALSE') {
              data.technique[child.nodeName] = 0;
            } else {
              data.technique[child.nodeName] = parseInt(child.textContent);
            }

            break;
        }
      }
    }

    function buildEffect(data) {
      return data;
    }

    function getEffect(id) {
      return getBuild(library.effects[id], buildEffect);
    }

    // material

    function parseMaterial(xml) {
      const data = {
        name: xml.getAttribute('name')
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'instance_effect':
            data.url = parseId(child.getAttribute('url'));
            break;
        }
      }

      library.materials[xml.getAttribute('id')] = data;
    }

    function buildMaterial(data) {
      const effect = getEffect(data.url);
      const technique = effect.profile.technique;

      let material;

      switch (technique.type) {
        case 'phong':
        case 'blinn':
          material = new THREE.MeshPhongMaterial();
          break;

        case 'lambert':
          material = new THREE.MeshLambertMaterial();
          break;

        default:
          material = new THREE.MeshBasicMaterial();
          break;
      }

      material.name = data.name;

      function getTexture(textureObject) {
        const sampler = effect.profile.samplers[textureObject.id];

        if (sampler !== undefined) {
          const surface = effect.profile.surfaces[sampler.source];

          const url = path + getImage(surface.init_from);
          const texture = textureLoader.get(url).load(url);

          const extra = textureObject.extra;

          if (extra !== undefined && extra.technique !== undefined && isEmpty(extra.technique) === false) {
            const technique = extra.technique;

            texture.wrapS = technique.wrapU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
            texture.wrapT = technique.wrapV ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;

            texture.offset.set(technique.offsetU || 0, technique.offsetV || 0);
            texture.repeat.set(technique.repeatU || 1, technique.repeatV || 1);
          } else {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
          }

          return texture;
        }

        console.error('THREE.ColladaLoader: Undefined sampler', textureObject.id);

        return null;
      }

      const parameters = technique.parameters;

      for (const key in parameters) {
        const parameter = parameters[key];

        switch (key) {
          case 'diffuse':
            if (parameter.color) material.color.fromArray(parameter.color);
            if (parameter.texture) material.map = getTexture(parameter.texture);
            break;
          case 'specular':
            if (parameter.color && material.specular) material.specular.fromArray(parameter.color);
            if (parameter.texture) material.specularMap = getTexture(parameter.texture);
            break;
          case 'shininess':
            if (parameter.float && material.shininess) { material.shininess = parameter.float; }
            break;
          case 'emission':
            if (parameter.color && material.emissive) { material.emissive.fromArray(parameter.color); }
            break;
          case 'transparent':
            // if ( parameter.texture ) material.alphaMap = getTexture( parameter.texture );
            material.transparent = true;
            break;
          case 'transparency':
            if (parameter.float !== undefined) material.opacity = parameter.float;
            material.transparent = true;
            break;
        }
      }

      return material;
    }

    function getMaterial(id) {
      return getBuild(library.materials[id], buildMaterial);
    }

    // camera

    function parseCamera(xml) {
      const data = {
        name: xml.getAttribute('name')
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'optics':
            data.optics = parseCameraOptics(child);
            break;
        }
      }

      library.cameras[xml.getAttribute('id')] = data;
    }

    function parseCameraOptics(xml) {
      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        switch (child.nodeName) {
          case 'technique_common':
            return parseCameraTechnique(child);
        }
      }

      return {};
    }

    function parseCameraTechnique(xml) {
      const data = {};

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        switch (child.nodeName) {
          case 'perspective':
          case 'orthographic':

            data.technique = child.nodeName;
            data.parameters = parseCameraParameters(child);

            break;
        }
      }

      return data;
    }

    function parseCameraParameters(xml) {
      const data = {};

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        switch (child.nodeName) {
          case 'xfov':
          case 'yfov':
          case 'xmag':
          case 'ymag':
          case 'znear':
          case 'zfar':
          case 'aspect_ratio':
            data[child.nodeName] = parseFloat(child.textContent);
            break;
        }
      }

      return data;
    }

    function buildCamera(data) {
      let camera;

      switch (data.optics.technique) {
        case 'perspective':
          camera = new THREE.PerspectiveCamera(
            data.optics.parameters.yfov,
            data.optics.parameters.aspect_ratio,
            data.optics.parameters.znear,
            data.optics.parameters.zfar
          );
          break;

        case 'orthographic':
          var ymag = data.optics.parameters.ymag;
          var xmag = data.optics.parameters.xmag;
          var aspectRatio = data.optics.parameters.aspect_ratio;

          xmag = (xmag === undefined) ? (ymag * aspectRatio) : xmag;
          ymag = (ymag === undefined) ? (xmag / aspectRatio) : ymag;

          xmag *= 0.5;
          ymag *= 0.5;

          camera = new THREE.OrthographicCamera(
            -xmag, xmag, ymag, -ymag, // left, right, top, bottom
            data.optics.parameters.znear,
            data.optics.parameters.zfar
          );
          break;

        default:
          camera = new THREE.PerspectiveCamera();
          break;
      }

      camera.name = data.name;

      return camera;
    }

    function getCamera(id) {
      return getBuild(library.cameras[id], buildCamera);
    }

    // light

    function parseLight(xml) {
      let data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'technique_common':
            data = parseLightTechnique(child);
            break;
        }
      }

      library.lights[xml.getAttribute('id')] = data;
    }

    function parseLightTechnique(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'directional':
          case 'point':
          case 'spot':
          case 'ambient':

            data.technique = child.nodeName;
            data.parameters = parseLightParameters(child);
        }
      }

      return data;
    }

    function parseLightParameters(xml) {
      const data = {};

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'color':
            var array = parseFloats(child.textContent);
            data.color = new THREE.Color().fromArray(array);
            break;

          case 'falloff_angle':
            data.falloffAngle = parseFloat(child.textContent);
            break;

          case 'quadratic_attenuation':
            var f = parseFloat(child.textContent);
            data.distance = f ? Math.sqrt(1 / f) : 0;
            break;
        }
      }

      return data;
    }

    function buildLight(data) {
      let light;

      switch (data.technique) {
        case 'directional':
          light = new THREE.DirectionalLight();
          break;

        case 'point':
          light = new THREE.PointLight();
          break;

        case 'spot':
          light = new THREE.SpotLight();
          break;

        case 'ambient':
          light = new THREE.AmbientLight();
          break;
      }

      if (data.parameters.color) light.color.copy(data.parameters.color);
      if (data.parameters.distance) light.distance = data.parameters.distance;

      return light;
    }

    function getLight(id) {
      return getBuild(library.lights[id], buildLight);
    }

    // geometry

    function parseGeometry(xml) {
      const data = {
        name: xml.getAttribute('name'),
        sources: {},
        vertices: {},
        primitives: []
      };

      const mesh = getElementsByTagName(xml, 'mesh')[0];

      // the following tags inside geometry are not supported yet (see https://github.com/mrdoob/three.js/pull/12606): convex_mesh, spline, brep
      if (mesh === undefined) return;

      for (let i = 0; i < mesh.childNodes.length; i++) {
        const child = mesh.childNodes[i];

        if (child.nodeType !== 1) continue;

        const id = child.getAttribute('id');

        switch (child.nodeName) {
          case 'source':
            data.sources[id] = parseSource(child);
            break;

          case 'vertices':
            // data.sources[ id ] = data.sources[ parseId( getElementsByTagName( child, 'input' )[ 0 ].getAttribute( 'source' ) ) ];
            data.vertices = parseGeometryVertices(child);
            break;

          case 'polygons':
            console.warn('THREE.ColladaLoader: Unsupported primitive type: ', child.nodeName);
            break;

          case 'lines':
          case 'linestrips':
          case 'polylist':
          case 'triangles':
            data.primitives.push(parseGeometryPrimitive(child));
            break;

          default:
            console.log(child);
        }
      }

      library.geometries[xml.getAttribute('id')] = data;
    }

    function parseSource(xml) {
      const data = {
        array: [],
        stride: 3
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'float_array':
            data.array = parseFloats(child.textContent);
            break;

          case 'Name_array':
            data.array = parseStrings(child.textContent);
            break;

          case 'technique_common':
            var accessor = getElementsByTagName(child, 'accessor')[0];

            if (accessor !== undefined) {
              data.stride = parseInt(accessor.getAttribute('stride'));
            }
            break;
        }
      }

      return data;
    }

    function parseGeometryVertices(xml) {
      const data = {};

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        data[child.getAttribute('semantic')] = parseId(child.getAttribute('source'));
      }

      return data;
    }

    function parseGeometryPrimitive(xml) {
      const primitive = {
        type: xml.nodeName,
        material: xml.getAttribute('material'),
        count: parseInt(xml.getAttribute('count')),
        inputs: {},
        stride: 0
      };

      for (let i = 0, l = xml.childNodes.length; i < l; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'input':
            var id = parseId(child.getAttribute('source'));
            var semantic = child.getAttribute('semantic');
            var offset = parseInt(child.getAttribute('offset'));
            primitive.inputs[semantic] = {id, offset};
            primitive.stride = Math.max(primitive.stride, offset + 1);
            break;

          case 'vcount':
            primitive.vcount = parseInts(child.textContent);
            break;

          case 'p':
            primitive.p = parseInts(child.textContent);
            break;
        }
      }

      return primitive;
    }

    function groupPrimitives(primitives) {
      const build = {};

      for (let i = 0; i < primitives.length; i++) {
        const primitive = primitives[i];

        if (build[primitive.type] === undefined) build[primitive.type] = [];

        build[primitive.type].push(primitive);
      }

      return build;
    }

    function buildGeometry(data) {
      const build = {};

      const sources = data.sources;
      const vertices = data.vertices;
      const primitives = data.primitives;

      if (primitives.length === 0) return {};

      // our goal is to create one buffer geoemtry for a single type of primitives
      // first, we group all primitives by their type

      const groupedPrimitives = groupPrimitives(primitives);

      for (const type in groupedPrimitives) {
        // second, we create for each type of primitives (polylist,triangles or lines) a buffer geometry

        build[type] = buildGeometryType(groupedPrimitives[type], sources, vertices);
      }

      return build;
    }

    function buildGeometryType(primitives, sources, vertices) {
      const build = {};

      const position = {array: [], stride: 0};
      const normal = {array: [], stride: 0};
      const uv = {array: [], stride: 0};
      const color = {array: [], stride: 0};

      const skinIndex = {array: [], stride: 4};
      const skinWeight = {array: [], stride: 4};

      const geometry = new THREE.BufferGeometry();

      const materialKeys = [];

      let start = 0,
        count = 0;

      for (let p = 0; p < primitives.length; p++) {
        const primitive = primitives[p];
        const inputs = primitive.inputs;
        let triangleCount = 1;

        if (primitive.vcount && primitive.vcount[0] === 4) {
          triangleCount = 2; // one quad -> two triangles
        }

        // groups

        if (primitive.type === 'lines' || primitive.type === 'linestrips') {
          count = primitive.count * 2;
        } else {
          count = primitive.count * 3 * triangleCount;
        }

        geometry.addGroup(start, count, p);
        start += count;

        // material

        if (primitive.material) {
          materialKeys.push(primitive.material);
        }

        // geometry data

        for (const name in inputs) {
          const input = inputs[name];

          switch (name)	{
            case 'VERTEX':
              for (const key in vertices) {
                const id = vertices[key];

                switch (key) {
                  case 'POSITION':
                    buildGeometryData(primitive, sources[id], input.offset, position.array);
                    position.stride = sources[id].stride;

                    if (sources.skinWeights && sources.skinIndices) {
                      buildGeometryData(primitive, sources.skinIndices, input.offset, skinIndex.array);
                      buildGeometryData(primitive, sources.skinWeights, input.offset, skinWeight.array);
                    }
                    break;

                  case 'NORMAL':
                    buildGeometryData(primitive, sources[id], input.offset, normal.array);
                    normal.stride = sources[id].stride;
                    break;

                  case 'COLOR':
                    buildGeometryData(primitive, sources[id], input.offset, color.array);
                    color.stride = sources[id].stride;
                    break;

                  case 'TEXCOORD':
                    buildGeometryData(primitive, sources[id], input.offset, uv.array);
                    uv.stride = sources[id].stride;
                    break;

                  default:
                    console.warn('THREE.ColladaLoader: Semantic "%s" not handled in geometry build process.', key);
                }
              }
              break;

            case 'NORMAL':
              buildGeometryData(primitive, sources[input.id], input.offset, normal.array);
              normal.stride = sources[input.id].stride;
              break;

            case 'COLOR':
              buildGeometryData(primitive, sources[input.id], input.offset, color.array);
              color.stride = sources[input.id].stride;
              break;

            case 'TEXCOORD':
              buildGeometryData(primitive, sources[input.id], input.offset, uv.array);
              uv.stride = sources[input.id].stride;
              break;
          }
        }
      }

      // build geometry

      if (position.array.length > 0) geometry.addAttribute('position', new THREE.Float32BufferAttribute(position.array, position.stride));
      if (normal.array.length > 0) geometry.addAttribute('normal', new THREE.Float32BufferAttribute(normal.array, normal.stride));
      if (color.array.length > 0) geometry.addAttribute('color', new THREE.Float32BufferAttribute(color.array, color.stride));
      if (uv.array.length > 0) geometry.addAttribute('uv', new THREE.Float32BufferAttribute(uv.array, uv.stride));

      if (skinIndex.array.length > 0) geometry.addAttribute('skinIndex', new THREE.Float32BufferAttribute(skinIndex.array, skinIndex.stride));
      if (skinWeight.array.length > 0) geometry.addAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight.array, skinWeight.stride));

      build.data = geometry;
      build.type = primitives[0].type;
      build.materialKeys = materialKeys;

      return build;
    }

    function buildGeometryData(primitive, source, offset, array) {
      const indices = primitive.p;
      const stride = primitive.stride;
      const vcount = primitive.vcount;

      function pushVector(i) {
        let index = indices[i + offset] * sourceStride;
        const length = index + sourceStride;

        for (; index < length; index++) {
          array.push(sourceArray[index]);
        }
      }

      let maxcount = 0;

      var sourceArray = source.array;
      var sourceStride = source.stride;

      if (primitive.vcount !== undefined) {
        let index = 0;

        for (var i = 0, l = vcount.length; i < l; i++) {
          const count = vcount[i];

          if (count === 4) {
            var a = index + stride * 0;
            var b = index + stride * 1;
            var c = index + stride * 2;
            const d = index + stride * 3;

            pushVector(a); pushVector(b); pushVector(d);
            pushVector(b); pushVector(c); pushVector(d);
          } else if (count === 3) {
            var a = index + stride * 0;
            var b = index + stride * 1;
            var c = index + stride * 2;

            pushVector(a); pushVector(b); pushVector(c);
          } else {
            maxcount = Math.max(maxcount, count);
          }

          index += stride * count;
        }

        if (maxcount > 0) {
          console.log('THREE.ColladaLoader: Geometry has faces with more than 4 vertices.');
        }
      } else {
        for (var i = 0, l = indices.length; i < l; i += stride) {
          pushVector(i);
        }
      }
    }

    function getGeometry(id) {
      return getBuild(library.geometries[id], buildGeometry);
    }

    // kinematics

    function parseKinematicsModel(xml) {
      const data = {
        name: xml.getAttribute('name') || '',
        joints: {},
        links: []
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'technique_common':
            parseKinematicsTechniqueCommon(child, data);
            break;
        }
      }

      library.kinematicsModels[xml.getAttribute('id')] = data;
    }

    function buildKinematicsModel(data) {
      if (data.build !== undefined) return data.build;

      return data;
    }

    function getKinematicsModel(id) {
      return getBuild(library.kinematicsModels[id], buildKinematicsModel);
    }

    function parseKinematicsTechniqueCommon(xml, data) {
      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'joint':
            data.joints[child.getAttribute('sid')] = parseKinematicsJoint(child);
            break;

          case 'link':
            data.links.push(parseKinematicsLink(child));
            break;
        }
      }
    }

    function parseKinematicsJoint(xml) {
      let data;

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'prismatic':
          case 'revolute':
            data = parseKinematicsJointParameter(child);
            break;
        }
      }

      return data;
    }

    function parseKinematicsJointParameter(xml, data) {
      var data = {
        sid: xml.getAttribute('sid'),
        name: xml.getAttribute('name') || '',
        axis: new THREE.Vector3(),
        limits: {
          min: 0,
          max: 0
        },
        type: xml.nodeName,
        static: false,
        zeroPosition: 0,
        middlePosition: 0
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'axis':
            var array = parseFloats(child.textContent);
            data.axis.fromArray(array);
            break;
          case 'limits':
            var max = child.getElementsByTagName('max')[0];
            var min = child.getElementsByTagName('min')[0];

            data.limits.max = parseFloat(max.textContent);
            data.limits.min = parseFloat(min.textContent);
            break;
        }
      }

      // if min is equal to or greater than max, consider the joint static

      if (data.limits.min >= data.limits.max) {
        data.static = true;
      }

      // calculate middle position

      data.middlePosition = (data.limits.min + data.limits.max) / 2.0;

      return data;
    }

    function parseKinematicsLink(xml) {
      const data = {
        sid: xml.getAttribute('sid'),
        name: xml.getAttribute('name') || '',
        attachments: [],
        transforms: []
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'attachment_full':
            data.attachments.push(parseKinematicsAttachment(child));
            break;

          case 'matrix':
          case 'translate':
          case 'rotate':
            data.transforms.push(parseKinematicsTransform(child));
            break;
        }
      }

      return data;
    }

    function parseKinematicsAttachment(xml) {
      const data = {
        joint: xml.getAttribute('joint').split('/').pop(),
        transforms: [],
        links: []
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'link':
            data.links.push(parseKinematicsLink(child));
            break;

          case 'matrix':
          case 'translate':
          case 'rotate':
            data.transforms.push(parseKinematicsTransform(child));
            break;
        }
      }

      return data;
    }

    function parseKinematicsTransform(xml) {
      const data = {
        type: xml.nodeName
      };

      const array = parseFloats(xml.textContent);

      switch (data.type) {
        case 'matrix':
          data.obj = new THREE.Matrix4();
          data.obj.fromArray(array).transpose();
          break;

        case 'translate':
          data.obj = new THREE.Vector3();
          data.obj.fromArray(array);
          break;

        case 'rotate':
          data.obj = new THREE.Vector3();
          data.obj.fromArray(array);
          data.angle = THREE.Math.degToRad(array[3]);
          break;
      }

      return data;
    }

    function parseKinematicsScene(xml) {
      const data = {
        bindJointAxis: []
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'bind_joint_axis':
            data.bindJointAxis.push(parseKinematicsBindJointAxis(child));
            break;
        }
      }

      library.kinematicsScenes[parseId(xml.getAttribute('url'))] = data;
    }

    function parseKinematicsBindJointAxis(xml) {
      const data = {
        target: xml.getAttribute('target').split('/').pop()
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'axis':
            var param = child.getElementsByTagName('param')[0];
            data.axis = param.textContent;
            var tmpJointIndex = data.axis.split('inst_').pop().split('axis')[0];
            data.jointIndex = tmpJointIndex.substr(0, tmpJointIndex.length - 1);
            break;
        }
      }

      return data;
    }

    function buildKinematicsScene(data) {
      if (data.build !== undefined) return data.build;

      return data;
    }

    function getKinematicsScene(id) {
      return getBuild(library.kinematicsScenes[id], buildKinematicsScene);
    }

    function setupKinematics() {
      const kinematicsModelId = Object.keys(library.kinematicsModels)[0];
      const kinematicsSceneId = Object.keys(library.kinematicsScenes)[0];
      const visualSceneId = Object.keys(library.visualScenes)[0];

      if (kinematicsModelId === undefined || kinematicsSceneId === undefined) return;

      const kinematicsModel = getKinematicsModel(kinematicsModelId);
      const kinematicsScene = getKinematicsScene(kinematicsSceneId);
      const visualScene = getVisualScene(visualSceneId);

      const bindJointAxis = kinematicsScene.bindJointAxis;
      const jointMap = {};

      for (let i = 0, l = bindJointAxis.length; i < l; i++) {
        const axis = bindJointAxis[i];

        // the result of the following query is an element of type 'translate', 'rotate','scale' or 'matrix'

        const targetElement = collada.querySelector(`[sid="${axis.target}"]`);

        if (targetElement) {
          // get the parent of the transfrom element

          const parentVisualElement = targetElement.parentElement;

          // connect the joint of the kinematics model with the element in the visual scene

          connect(axis.jointIndex, parentVisualElement);
        }
      }

      function connect(jointIndex, visualElement) {
        const visualElementName = visualElement.getAttribute('name');
        const joint = kinematicsModel.joints[jointIndex];

        visualScene.traverse((object) => {
          if (object.name === visualElementName) {
            jointMap[jointIndex] = {
              object,
              transforms: buildTransformList(visualElement),
              joint,
              position: joint.zeroPosition
            };
          }
        });
      }

      const m0 = new THREE.Matrix4();

      kinematics = {

        joints: kinematicsModel && kinematicsModel.joints,

        getJointValue(jointIndex) {
          const jointData = jointMap[jointIndex];

          if (jointData) {
            return jointData.position;
          }

          console.warn(`THREE.ColladaLoader: Joint ${jointIndex} doesn't exist.`);
        },

        setJointValue(jointIndex, value) {
          const jointData = jointMap[jointIndex];

          if (jointData) {
            const joint = jointData.joint;

            if (value > joint.limits.max || value < joint.limits.min) {
              console.warn(`THREE.ColladaLoader: Joint ${jointIndex} value ${value} outside of limits (min: ${joint.limits.min}, max: ${joint.limits.max}).`);
            } else if (joint.static) {
              console.warn(`THREE.ColladaLoader: Joint ${jointIndex} is static.`);
            } else {
              const object = jointData.object;
              const axis = joint.axis;
              const transforms = jointData.transforms;

              matrix.identity();

              // each update, we have to apply all transforms in the correct order

              for (let i = 0; i < transforms.length; i++) {
                const transform = transforms[i];

                // if there is a connection of the transform node with a joint, apply the joint value

                if (transform.sid && transform.sid.indexOf(jointIndex) !== -1) {
                  switch (joint.type) {
                    case 'revolute':
                      matrix.multiply(m0.makeRotationAxis(axis, THREE.Math.degToRad(value)));
                      break;

                    case 'prismatic':
                      matrix.multiply(m0.makeTranslation(axis.x * value, axis.y * value, axis.z * value));
                      break;

                    default:
                      console.warn(`THREE.ColladaLoader: Unknown joint type: ${joint.type}`);
                      break;
                  }
                } else {
                  switch (transform.type) {
                    case 'matrix':
                      matrix.multiply(transform.obj);
                      break;

                    case 'translate':
                      matrix.multiply(m0.makeTranslation(transform.obj.x, transform.obj.y, transform.obj.z));
                      break;

                    case 'scale':
                      matrix.scale(transform.obj);
                      break;

                    case 'rotate':
                      matrix.multiply(m0.makeRotationAxis(transform.obj, transform.angle));
                      break;
                  }
                }
              }

              object.matrix.copy(matrix);
              object.matrix.decompose(object.position, object.quaternion, object.scale);

              jointMap[jointIndex].position = value;
            }
          } else {
            console.log(`THREE.ColladaLoader: ${jointIndex} does not exist.`);
          }
        }

      };
    }

    function buildTransformList(node) {
      const transforms = [];

      const xml = collada.querySelector(`[id="${node.id}"]`);

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'matrix':
            var array = parseFloats(child.textContent);
            var matrix = new THREE.Matrix4().fromArray(array).transpose();
            transforms.push({
              sid: child.getAttribute('sid'),
              type: child.nodeName,
              obj: matrix
            });
            break;

          case 'translate':
          case 'scale':
            var array = parseFloats(child.textContent);
            var vector = new THREE.Vector3().fromArray(array);
            transforms.push({
              sid: child.getAttribute('sid'),
              type: child.nodeName,
              obj: vector
            });
            break;

          case 'rotate':
            var array = parseFloats(child.textContent);
            var vector = new THREE.Vector3().fromArray(array);
            var angle = THREE.Math.degToRad(array[3]);
            transforms.push({
              sid: child.getAttribute('sid'),
              type: child.nodeName,
              obj: vector,
              angle
            });
            break;
        }
      }

      return transforms;
    }

    // nodes

    function prepareNodes(xml) {
      const elements = xml.getElementsByTagName('node');

      // ensure all node elements have id attributes

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        if (element.hasAttribute('id') === false) {
          element.setAttribute('id', generateId());
        }
      }
    }

    var matrix = new THREE.Matrix4();
    const vector = new THREE.Vector3();

    function parseNode(xml) {
      const data = {
        name: xml.getAttribute('name') || '',
        type: xml.getAttribute('type'),
        id: xml.getAttribute('id'),
        sid: xml.getAttribute('sid'),
        matrix: new THREE.Matrix4(),
        nodes: [],
        instanceCameras: [],
        instanceControllers: [],
        instanceLights: [],
        instanceGeometries: [],
        instanceNodes: [],
        transforms: {}
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        if (child.nodeType !== 1) continue;

        switch (child.nodeName) {
          case 'node':
            data.nodes.push(child.getAttribute('id'));
            parseNode(child);
            break;

          case 'instance_camera':
            data.instanceCameras.push(parseId(child.getAttribute('url')));
            break;

          case 'instance_controller':
            data.instanceControllers.push(parseNodeInstance(child));
            break;

          case 'instance_light':
            data.instanceLights.push(parseId(child.getAttribute('url')));
            break;

          case 'instance_geometry':
            data.instanceGeometries.push(parseNodeInstance(child));
            break;

          case 'instance_node':
            data.instanceNodes.push(parseId(child.getAttribute('url')));
            break;

          case 'matrix':
            var array = parseFloats(child.textContent);
            data.matrix.multiply(matrix.fromArray(array).transpose());
            data.transforms[child.getAttribute('sid')] = child.nodeName;
            break;

          case 'translate':
            var array = parseFloats(child.textContent);
            vector.fromArray(array);
            data.matrix.multiply(matrix.makeTranslation(vector.x, vector.y, vector.z));
            data.transforms[child.getAttribute('sid')] = child.nodeName;
            break;

          case 'rotate':
            var array = parseFloats(child.textContent);
            var angle = THREE.Math.degToRad(array[3]);
            data.matrix.multiply(matrix.makeRotationAxis(vector.fromArray(array), angle));
            data.transforms[child.getAttribute('sid')] = child.nodeName;
            break;

          case 'scale':
            var array = parseFloats(child.textContent);
            data.matrix.scale(vector.fromArray(array));
            data.transforms[child.getAttribute('sid')] = child.nodeName;
            break;

          case 'extra':
            break;

          default:
            console.log(child);
        }
      }

      library.nodes[data.id] = data;

      return data;
    }

    function parseNodeInstance(xml) {
      const data = {
        id: parseId(xml.getAttribute('url')),
        materials: {},
        skeletons: []
      };

      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];

        switch (child.nodeName) {
          case 'bind_material':
            var instances = child.getElementsByTagName('instance_material');

            for (let j = 0; j < instances.length; j++) {
              const instance = instances[j];
              const symbol = instance.getAttribute('symbol');
              const target = instance.getAttribute('target');

              data.materials[symbol] = parseId(target);
            }

            break;

          case 'skeleton':
            data.skeletons.push(parseId(child.textContent));
            break;

          default:
            break;
        }
      }

      return data;
    }

    function buildSkeleton(skeletons, joints) {
      const boneData = [];
      const sortedBoneData = [];

      let i,
        j,
        data;

      // a skeleton can have multiple root bones. collada expresses this
      // situtation with multiple "skeleton" tags per controller instance

      for (i = 0; i < skeletons.length; i++) {
        const skeleton = skeletons[i];
        const root = getNode(skeleton);

        // setup bone data for a single bone hierarchy

        buildBoneHierarchy(root, joints, boneData);
      }

      // sort bone data (the order is defined in the corresponding controller)

      for (i = 0; i < joints.length; i++) {
        for (j = 0; j < boneData.length; j++) {
          data = boneData[j];

          if (data.bone.name === joints[i].name) {
            sortedBoneData[i] = data;
            data.processed = true;
            break;
          }
        }
      }

      // add unprocessed bone data at the end of the list

      for (i = 0; i < boneData.length; i++) {
        data = boneData[i];

        if (data.processed === false) {
          sortedBoneData.push(data);
          data.processed = true;
        }
      }

      // setup arrays for skeleton creation

      const bones = [];
      const boneInverses = [];

      for (i = 0; i < sortedBoneData.length; i++) {
        data = sortedBoneData[i];

        bones.push(data.bone);
        boneInverses.push(data.boneInverse);
      }

      return new THREE.Skeleton(bones, boneInverses);
    }

    function buildBoneHierarchy(root, joints, boneData) {
      // setup bone data from visual scene

      root.traverse((object) => {
        if (object.isBone === true) {
          let boneInverse;

          // retrieve the boneInverse from the controller data

          for (let i = 0; i < joints.length; i++) {
            const joint = joints[i];

            if (joint.name === object.name) {
              boneInverse = joint.boneInverse;
              break;
            }
          }

          if (boneInverse === undefined) {
            // Unfortunately, there can be joints in the visual scene that are not part of the
            // corresponding controller. In this case, we have to create a dummy boneInverse matrix
            // for the respective bone. This bone won't affect any vertices, because there are no skin indices
            // and weights defined for it. But we still have to add the bone to the sorted bone list in order to
            // ensure a correct animation of the model.

            boneInverse = new THREE.Matrix4();
          }

          boneData.push({bone: object, boneInverse, processed: false});
        }
      });
    }

    function buildNode(data) {
      const objects = [];

      const matrix = data.matrix;
      const nodes = data.nodes;
      const type = data.type;
      const instanceCameras = data.instanceCameras;
      const instanceControllers = data.instanceControllers;
      const instanceLights = data.instanceLights;
      const instanceGeometries = data.instanceGeometries;
      const instanceNodes = data.instanceNodes;

      // nodes

      for (var i = 0, l = nodes.length; i < l; i++) {
        objects.push(getNode(nodes[i]));
      }

      // instance cameras

      for (var i = 0, l = instanceCameras.length; i < l; i++) {
        objects.push(getCamera(instanceCameras[i]).clone());
      }

      // instance controllers

      for (var i = 0, l = instanceControllers.length; i < l; i++) {
        var instance = instanceControllers[i];
        const controller = getController(instance.id);
        var geometries = getGeometry(controller.id);
        var newObjects = buildObjects(geometries, instance.materials);

        const skeletons = instance.skeletons;
        const joints = controller.skin.joints;

        const skeleton = buildSkeleton(skeletons, joints);

        for (var j = 0, jl = newObjects.length; j < jl; j++) {
          var object = newObjects[j];

          if (object.isSkinnedMesh) {
            object.bind(skeleton, controller.skin.bindMatrix);
            object.normalizeSkinWeights();
          }

          objects.push(object);
        }
      }

      // instance lights

      for (var i = 0, l = instanceLights.length; i < l; i++) {
        objects.push(getLight(instanceLights[i]).clone());
      }

      // instance geometries

      for (var i = 0, l = instanceGeometries.length; i < l; i++) {
        var instance = instanceGeometries[i];

        // a single geometry instance in collada can lead to multiple object3Ds.
        // this is the case when primitives are combined like triangles and lines

        var geometries = getGeometry(instance.id);
        var newObjects = buildObjects(geometries, instance.materials);

        for (var j = 0, jl = newObjects.length; j < jl; j++) {
          objects.push(newObjects[j]);
        }
      }

      // instance nodes

      for (var i = 0, l = instanceNodes.length; i < l; i++) {
        objects.push(getNode(instanceNodes[i]).clone());
      }

      var object;

      if (nodes.length === 0 && objects.length === 1) {
        object = objects[0];
      } else {
        object = (type === 'JOINT') ? new THREE.Bone() : new THREE.Group();

        for (var i = 0; i < objects.length; i++) {
          object.add(objects[i]);
        }
      }

      object.name = (type === 'JOINT') ? data.sid : data.name;
      object.matrix.copy(matrix);
      object.matrix.decompose(object.position, object.quaternion, object.scale);

      return object;
    }

    function resolveMaterialBinding(keys, instanceMaterials) {
      const materials = [];

      for (let i = 0, l = keys.length; i < l; i++) {
        const id = instanceMaterials[keys[i]];
        // TODO: Figure out why the ID is not known?
        if (id) { materials.push(getMaterial(id)); }
      }

      return materials;
    }

    function buildObjects(geometries, instanceMaterials) {
      const objects = [];

      for (const type in geometries) {
        const geometry = geometries[type];

        const materials = resolveMaterialBinding(geometry.materialKeys, instanceMaterials);

        // handle case if no materials are defined

        if (materials.length === 0) {
          if (type === 'lines' || type === 'linestrips') {
            materials.push(new THREE.LineBasicMaterial());
          } else {
            materials.push(new THREE.MeshPhongMaterial());
          }
        }

        // regard skinning

        const skinning = (geometry.data.attributes.skinIndex !== undefined);

        if (skinning) {
          for (let i = 0, l = materials.length; i < l; i++) {
            materials[i].skinning = true;
          }
        }

        // choose between a single or multi materials (material array)

        const material = (materials.length === 1) ? materials[0] : materials;

        // now create a specific 3D object

        var object;

        switch (type) {
          case 'lines':
            object = new THREE.LineSegments(geometry.data, material);
            break;

          case 'linestrips':
            object = new THREE.Line(geometry.data, material);
            break;

          case 'triangles':
          case 'polylist':
            if (skinning) {
              object = new THREE.SkinnedMesh(geometry.data, material);
            } else {
              object = new THREE.Mesh(geometry.data, material);
            }
            break;
        }

        objects.push(object);
      }

      return objects;
    }

    function getNode(id) {
      return getBuild(library.nodes[id], buildNode);
    }

    // visual scenes

    function parseVisualScene(xml) {
      const data = {
        name: xml.getAttribute('name'),
        children: []
      };

      prepareNodes(xml);

      const elements = getElementsByTagName(xml, 'node');

      for (let i = 0; i < elements.length; i++) {
        data.children.push(parseNode(elements[i]));
      }

      library.visualScenes[xml.getAttribute('id')] = data;
    }

    function buildVisualScene(data) {
      const group = new THREE.Group();
      group.name = data.name;

      const children = data.children;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.id === null) {
          group.add(buildNode(child));
        } else {
          // if there is an ID, let's try to get the finished build (e.g. joints are already build)

          group.add(getNode(child.id));
        }
      }

      return group;
    }

    function getVisualScene(id) {
      return getBuild(library.visualScenes[id], buildVisualScene);
    }

    // scenes

    function parseScene(xml) {
      const instance = getElementsByTagName(xml, 'instance_visual_scene')[0];
      return getVisualScene(parseId(instance.getAttribute('url')));
    }

    function setupAnimations() {
      const clips = library.clips;

      if (isEmpty(clips) === true) {
        if (isEmpty(library.animations) === false) {
          // if there are animations but no clips, we create a default clip for playback

          const tracks = [];

          for (var id in library.animations) {
            const animationTracks = getAnimation(id);

            for (let i = 0, l = animationTracks.length; i < l; i++) {
              tracks.push(animationTracks[i]);
            }
          }

          animations.push(new THREE.AnimationClip('default', -1, tracks));
        }
      } else {
        for (var id in clips) {
          animations.push(getAnimationClip(id));
        }
      }
    }

    console.time('THREE.ColladaLoader');

    if (text.length === 0) {
      return {scene: new THREE.Scene()};
    }

    console.time('THREE.ColladaLoader: DOMParser');

    const xml = new DOMParser().parseFromString(text, 'application/xml');

    console.timeEnd('THREE.ColladaLoader: DOMParser');

    var collada = getElementsByTagName(xml, 'COLLADA')[0];

    // metadata

    const version = collada.getAttribute('version');
    console.log('THREE.ColladaLoader: File version', version);

    const asset = parseAsset(getElementsByTagName(collada, 'asset')[0]);
    var textureLoader = THREE.Loader.Handlers;
    //        var textureLoader = new THREE.TextureLoader( this.manager );
    //        textureLoader.setPath( path ).setCrossOrigin( this.crossOrigin );
    //

    var animations = [];
    var kinematics = {};
    var count = 0;

    //

    var library = {
      animations: {},
      clips: {},
      controllers: {},
      images: {},
      effects: {},
      materials: {},
      cameras: {},
      lights: {},
      geometries: {},
      nodes: {},
      visualScenes: {},
      kinematicsModels: {},
      kinematicsScenes: {}
    };

    console.time('THREE.ColladaLoader: Parse');

    parseLibrary(collada, 'library_animations', 'animation', parseAnimation);
    parseLibrary(collada, 'library_animation_clips', 'animation_clip', parseAnimationClip);
    parseLibrary(collada, 'library_controllers', 'controller', parseController);
    parseLibrary(collada, 'library_images', 'image', parseImage);
    parseLibrary(collada, 'library_effects', 'effect', parseEffect);
    parseLibrary(collada, 'library_materials', 'material', parseMaterial);
    parseLibrary(collada, 'library_cameras', 'camera', parseCamera);
    parseLibrary(collada, 'library_lights', 'light', parseLight);
    parseLibrary(collada, 'library_geometries', 'geometry', parseGeometry);
    parseLibrary(collada, 'library_nodes', 'node', parseNode);
    parseLibrary(collada, 'library_visual_scenes', 'visual_scene', parseVisualScene);
    parseLibrary(collada, 'library_kinematics_models', 'kinematics_model', parseKinematicsModel);
    parseLibrary(collada, 'scene', 'instance_kinematics_scene', parseKinematicsScene);

    console.timeEnd('THREE.ColladaLoader: Parse');

    console.time('THREE.ColladaLoader: Build');

    buildLibrary(library.animations, buildAnimation);
    buildLibrary(library.clips, buildAnimationClip);
    buildLibrary(library.controllers, buildController);
    buildLibrary(library.images, buildImage);
    buildLibrary(library.effects, buildEffect);
    buildLibrary(library.materials, buildMaterial);
    buildLibrary(library.cameras, buildCamera);
    buildLibrary(library.lights, buildLight);
    buildLibrary(library.geometries, buildGeometry);
    buildLibrary(library.visualScenes, buildVisualScene);

    console.timeEnd('THREE.ColladaLoader: Build');

    setupAnimations();
    setupKinematics();

    const scene = parseScene(getElementsByTagName(collada, 'scene')[0]);

    if (asset.upAxis === 'Z_UP') {
      scene.rotation.x = -Math.PI / 2;
    }

    scene.scale.multiplyScalar(asset.unit);

    console.timeEnd('THREE.ColladaLoader');

    return {
      animations,
      kinematics,
      library,
      scene
    };
  }

};

export default THREE.ColladaLoader;
