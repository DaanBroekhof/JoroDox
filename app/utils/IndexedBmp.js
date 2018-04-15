const bmp = require('bmp-js');
const jetpack = require('fs-jetpack');
const _ = require('lodash');

function parse(path) {
  const data = bmp.decode(jetpack.read(path, 'buffer'));

  const wrapX = true;
  const wrapY = false;

  const indexMap = {};
  const pixels = [];
  const colorNrs = [];
  let colorNr = 0;
  for (let i = 0; i < data.width * data.height; i += 1) {
    const colorName = data.data[i * 4] + ',' + data.data[(i * 4) + 1] + ',' + data.data[(i * 4) + 2];
    if (!indexMap[colorName]) {
      indexMap[colorName] = {
        nr: colorNr,
        colorName: colorName,
        size: 0,
        // pixels: [],
        adjacencies: {},
        // width: data.width,
        // height: data.height,
      };
      colorNrs[colorNr] = indexMap[colorName];
      colorNr += 1;
    }
    pixels[i] = indexMap[colorName].nr;
    indexMap[colorName].size += 1;
    // indexMap[colorName].pixels.push(i);
  }

  for (let y = 0; y < data.height; y += 1) {
    const yOffset = y * data.width;
    for (let x = 0; x < data.width; x += 1) {
      const self = pixels[yOffset + x];
      const right = x < data.width - 1 ? pixels[yOffset + x + 1] : (wrapX ? pixels[yOffset] : -1);
      const down = y < data.height - 1 ? pixels[yOffset + data.width + x] : (wrapY ? pixels[x] : -1);

      if (self !== right && right !== -1) {
        if (colorNrs[self] === undefined || colorNrs[right] === undefined) {
          console.log(self, right, x, y);
          continue;
        }

        colorNrs[self].adjacencies[colorNrs[right].colorName] = true;
        colorNrs[right].adjacencies[colorNrs[self].colorName] = true;
      }
      if (self !== down && down !== -1) {
        if (colorNrs[self] === undefined || colorNrs[down] === undefined) {
          console.log(self, down, x, y);
          continue;
        }
        colorNrs[self].adjacencies[colorNrs[down].colorName] = true;
        colorNrs[down].adjacencies[colorNrs[self].colorName] = true;
      }
    }
  }

  colorNrs.forEach(map => {
    map.adjacencies = _.keys(map.adjacencies);
  });

  return JSON.stringify(indexMap);
}

exports.parse = parse;
