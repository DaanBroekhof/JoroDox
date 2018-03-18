import * as THREE from 'three';
import { DDSLoader } from 'three-addons';

const jetpack = require('electron').remote.require('fs-jetpack');

export default class ThreeJS {
  static loadDdsToTexture(file, geometry) {
    const ddsLoader = new DDSLoader();

    const texture = new THREE.CompressedTexture();
    const images = [];
    texture.image = images;

    jetpack.readAsync(file, 'buffer').then((buffer) => {
      if (!buffer) {
        console.error(`Could not load DDS texture file \`${file}\``);
        return;
      }

      const texDatas = ddsLoader._parser(buffer.buffer, true);

      if (texDatas.width === 0 && texDatas.height === 0) {
        const greyTexture = new Uint8Array(4);
        greyTexture[0] = 128;
        greyTexture[1] = 128;
        greyTexture[2] = 128;
        greyTexture[3] = 255;

        texture.mipmaps = [
          { data: greyTexture, width: 1, height: 1 }
        ];
        texture.needsUpdate = true;

        console.error(`Could not parse DDS texture \`${file}\``);
        return;
      }

      if (texDatas.isCubemap) {
        const faces = texDatas.mipmaps.length / texDatas.mipmapCount;

        for (let f = 0; f < faces; f++) {
          images[f] = { mipmaps: [] };

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
        { data: greyTexture, width: 1, height: 1 }
      ];
      texture.needsUpdate = true;
    });

    return texture;
  }
}
