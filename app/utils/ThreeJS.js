import * as THREE from 'three';
import {DDSLoader} from 'three-addons';

const jetpack = require('electron').remote.require('fs-jetpack');

export default class ThreeJS {
  static loadDdsToTexture(file, geometry) {
    const ddsLoader = new DDSLoader();

    const texture = new THREE.CompressedTexture();
    const images = [];
    texture.image = images;

    texture.loadedPromise = jetpack.readAsync(file, 'buffer').then((buffer) => {
      if (!buffer) {
        console.error(`Could not load DDS texture file \`${file}\``);
        return;
      }

      /* eslint no-underscore-dangle: ["error", { "allow": ["ddsLoader", "_parser"] }] */
      const texDatas = ddsLoader._parser(buffer.buffer, true);

      // For some weird reason `format` may be the WebGL constant instead of the ThreeJS constant
      // See: https://github.com/mrdoob/three.js/blob/master/src/constants.js
      if (texDatas.format === 33777) {
        texDatas.format = THREE.RGBA_S3TC_DXT1_Format;
      } else if (texDatas.format === 33778) {
        texDatas.format = THREE.RGBA_S3TC_DXT3_Format;
      } else if (texDatas.format === 33779) {
        texDatas.format = THREE.RGBA_S3TC_DXT5_Format;
      } else if (texDatas.format === 33776) {
        texDatas.format = THREE.RGB_S3TC_DXT1_Format;
      }

      if (texDatas.width === 0 && texDatas.height === 0) {
        const greyTexture = new Uint8Array(4);
        greyTexture[0] = 128;
        greyTexture[1] = 128;
        greyTexture[2] = 128;
        greyTexture[3] = 255;

        texture.mipmaps = [
          {data: greyTexture, width: 1, height: 1}
        ];
        texture.needsUpdate = true;

        console.error(`Could not parse DDS texture \`${file}\``);
        return;
      }

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
      // do error
      const greyTexture = new Uint8Array(4);
      greyTexture[0] = 128;
      greyTexture[1] = 128;
      greyTexture[2] = 128;
      greyTexture[3] = 255;

      texture.mipmaps = [
        {data: greyTexture, width: 1, height: 1}
      ];
      texture.needsUpdate = true;
    }).catch((e) => console.error(e));

    return texture;
  }
}
