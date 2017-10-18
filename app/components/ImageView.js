// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
const TGA = require('../utils/TGA');

export default class ImageView extends Component {


    render() {
        let img = null;
        let imgSrc = null;
        if (this.props.file.path.match(/\.png$|.jpg|.bmp$/i)) {
            imgSrc = 'file:///' + this.props.file.path;
        }
        else if (this.props.file.path.match(/\.tga$/i)) {
            let tgaImage = new TGA();
            let buf = jetpack.read(this.props.file.path, 'buffer');
            tgaImage.load(buf);
            imgSrc = tgaImage.getDataURL('image/png');
        }

        return (
            <p>
                {img && <p>Dimensions: {img.getSize().width}x{img.getSize().height}</p>}
                {imgSrc && <img src={imgSrc} style={{maxWidth: '100%'}}/>}
            </p>
        );
    }
}
