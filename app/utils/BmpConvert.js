const bmpJs = require('bmp-js');
const fs = require('fs');
const pngjs = require('pngjs');
const nativeImage = require('electron').nativeImage;
const {ipcMain} = require('electron');

class BmpConvert
{
    static convert(path) {

        return fs.readFileSync(path).toString();

        let buf = fs.readFileSync(path);

        return 'data:image/bmp;base64,'+ buf.toString('base64');
        let bmpData = bmpJs.decode(buf);

        let png = new pngjs.PNG({
            width: bmpData.width,
            height: bmpData.height
        });
        png.data = bmpData.data;

        let pngBuffer = pngjs.PNG.sync.write(png);

        return nativeImage.createFromBuffer(pngBuffer, bmpData.width, bmpData.height);
        /*
        return new Promise(function(fulfill, reject) {
            let img = nativeImage.createFromBuffer(pngBuffer, bmpData.width, bmpData.height);
            fulfill(img);
        });
        */
    }
}

module.exports = BmpConvert;