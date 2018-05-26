// @flow
import React, {Component} from 'react';

const jetpack = require('electron').remote.require('fs-jetpack');
const nativeImage = require('electron').nativeImage;
const TGA = require('../utils/TGA');
const BMP = require('electron').remote.require('bmp-js');

export default class ImageView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      imgInfo: null,
    };
  }

  getBmpInfo(path) {
    const stream = jetpack.createReadStream(this.props.file.path, {end: 100});
    stream.on('readable', () => {
      const buf = stream.read(100);
      if (!buf) {
        stream.close();
        return;
      }

      this.setState({
        imgInfo: {
          fileSize: buf.readUInt32LE(2),
          reserved: buf.readUInt32LE(6),
          offset: buf.readUInt32LE(10),
          headerSize: buf.readUInt32LE(14),
          width: buf.readUInt32LE(18),
          height: buf.readUInt32LE(22),
          planes: buf.readUInt16LE(26),
          bitPP: buf.readUInt16LE(28),
          compress: buf.readUInt32LE(30),
          rawSize: buf.readUInt32LE(34),
          hr: buf.readUInt32LE(38),
          vr: buf.readUInt32LE(42),
          colors: buf.readUInt32LE(46),
          importantColors: buf.readUInt32LE(50),
        }
      });
      stream.close();
    });
  }

  render() {
    let imgInfo = null;
    let imgSrc = null;
    if (this.props.file.path.match(/\.png$|.jpg$|.gif$/i)) {
      imgInfo = nativeImage.createFromPath(this.props.file.path).getSize();
      imgSrc = `file:///${this.props.file.path}`;
    } else if (this.props.file.path.match(/\.bmp$/i)) {
      this.getBmpInfo(this.props.file.path);
      imgSrc = `file:///${this.props.file.path}`;
    } else if (this.props.file.path.match(/\.tga$/i)) {
      const tgaImage = new TGA();
      const buf = jetpack.read(this.props.file.path, 'buffer');
      tgaImage.load(buf);
      imgSrc = tgaImage.getDataURL('image/png');
      imgInfo = tgaImage.header;
    }
    if (!imgInfo && this.state.imgInfo) { imgInfo = this.state.imgInfo; }

    return (
      <div style={{display: 'flex', flexDirection: 'column'}}>
        {imgInfo && <p>Dimensions: {imgInfo.width}x{imgInfo.height}</p>}

        <div style={{
           border: '1px solid #eee',
           padding: 10,
           display: 'flex',
           alignItems: 'center',
           flexDirection: 'column',
           backgroundImage: 'linear-gradient(45deg, #EEEEEE 25%, transparent 25%), linear-gradient(-45deg, #EEEEEE 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #EEEEEE 75%), linear-gradient(-45deg, transparent 75%, #EEEEEE 75%)',
           backgroundSize: '20px 20px',
           backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
        >{imgSrc && <img src={imgSrc} style={{display: 'block', margin: 0, objectFit: 'contain', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto'}}/>}
        </div>
      </div>
    );
  }
}
