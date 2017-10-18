// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');

export default class ImageView extends Component {


    render() {
        let img = null;
        let imgSrc = null;
        if (this.props.file.path.match(/\.png$|.jpg|.bmp$/i)) {
            imgSrc = 'file:///' + this.props.file.path;
        }

        return (
            <p>
                {img && <p>Dimensions: {img.getSize().width}x{img.getSize().height}</p>}
                {imgSrc && <img src={imgSrc} style={{maxWidth: '100%'}}/>}
            </p>
        );
    }
}
