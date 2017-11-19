import * as THREE from 'three';
import { DDSLoader } from 'three-addons';
const jetpack = require('electron').remote.require('fs-jetpack');

export default class ThreeJS {
    static loadDdsToTexture(file, geometry)
    {
        let ddsLoader = new DDSLoader();

        let texture = new THREE.CompressedTexture();
        let images = [];
        texture.image = images;

        jetpack.readAsync(file, 'buffer').then(function (buffer) {
            if (!buffer) {
                console.error('Could not load DDS texture file `'+ file +'`');
                return;
            }

            let texDatas = ddsLoader._parser(buffer.buffer, true);

            if (texDatas.width === 0 && texDatas.height === 0) {
                console.error('Could not parse DDS texture `'+ file +'`');
                return;
            }

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
            // do error
        });

        return texture;
    }
}