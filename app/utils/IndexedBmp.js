const bmp = require('bmp-js');
const jetpack = require('fs-jetpack');

function parse(path) {
  const data = bmp.decode(jetpack.read(path, 'buffer'));

  const wrapX = true;
  const wrapY = false;

  const indexMap = {};
  const pixels = [];
  const colorNrs = [];
  let colorNr = 0;
  for (let i = 0; i < data.width * data.height; i += 1) {
    // Color format is 'BGR', color_name is 'RGB'
    const colorName = data.data[(i * 4) + 2] + ',' + data.data[(i * 4) + 1] + ',' + data.data[i * 4];
    if (!indexMap[colorName]) {
      indexMap[colorName] = {
        nr: colorNr,
        color_name: colorName,
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

        colorNrs[self].adjacencies[colorNrs[right].color_name] = true;
        colorNrs[right].adjacencies[colorNrs[self].color_name] = true;
      }
      if (self !== down && down !== -1) {
        if (colorNrs[self] === undefined || colorNrs[down] === undefined) {
          console.log(self, down, x, y);
          continue;
        }
        colorNrs[self].adjacencies[colorNrs[down].color_name] = true;
        colorNrs[down].adjacencies[colorNrs[self].color_name] = true;
      }
    }
  }

  colorNrs.forEach(map => {
    map.adjacencies = Object.keys(map.adjacencies);
  });

  return JSON.stringify(indexMap);
}

exports.parse = parse;
