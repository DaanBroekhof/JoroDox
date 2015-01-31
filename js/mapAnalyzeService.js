var module = angular.module('mapAnalyzeService', []);

module.factory('mapAnalyzeService', ['$rootScope', function($rootScope) {

	var mapAnalyzeServiceInstance = {
		'analyzeColorMap' : function (img) {
			var canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			var context = canvas.getContext('2d');
			var colors = [];
			var byCoords = [[]];
			var lastColor = null;

			context.drawImage(img, 0, 0);
			var imagedata = context.getImageData(0, 0, img.width, img.height).data;

			var nr = 0;
			var x = -1;
			var y = 0;
			var pix = -1;
			var row = (img.width * 4);
			for (var i = 0; i < imagedata.length; i += 4)
			{
				x++;
				pix++;
				if (x >= canvas.width)
				{
					x = 0;
					y++;
					byCoords[y] = [];
					lastColor = null;
				}

				if (imagedata[i+3] == 0)
				{
					byCoords[y][x] = null;
					lastColor = null;
					continue;
				}

				var color = (imagedata[i] << 16) | (imagedata[i+1] << 8) | (imagedata[i+2]);

				if (colors[color])
				{
					var c = colors[color];
					c.count++;

					// Do not measure the 'left' size of provinces on borders
					if (x > c.extentMax[0] && (!c.onBorder || x < canvas.width / 2))
						c.extentMax[0] = x;
					else if (x < c.extentMin[0])
						c.extentMin[0] = x;

					if (y > c.extentMax[1])
						c.extentMax[1] = y;
					else if (y < c.extentMin.y)
						c.extentMin[1] = y;

					if (c.offsetRanges[0][0] == y && c.offsetRanges[0][2] + 1 == x)
					{
						c.offsetRanges[0][2] = x;
						if (imagedata[i] != imagedata[i + row]
							|| imagedata[i + 1] != imagedata[i + row + 1]
							|| imagedata[i + 2] != imagedata[i + row + 2]

							/*|| imagedata[i] != imagedata[i - row]
							|| imagedata[i + 1] != imagedata[i - row + 1]
							|| imagedata[i + 2] != imagedata[i - row + 2]*/
							)
						{
							// Pixel above or below is different
							c.outLine.push(pix);
						}
					}
					else
					{
						// The last pixel seen is outline, if not 1 pixel long
						//if (c.offsetRanges[0][0] != c.offsetRanges[0][1])
						//	c.outLine.push(c.offsetRanges[0][1]);
						c.offsetRanges.unshift([y, x, x]);
						// The new pixel seen is outline
						c.outLine.push(pix);
					}
				}
				else
				{
					nr++;
					colors[color] = {
						'nr': nr,
						'extentMin': [x, y],
						'extentMax': [x, y],
						'count': 1,
						'offsetRanges': [[y, x, x]],
						'outLine': [pix],
						'r': imagedata[i],
						'g': imagedata[i+1],
						'b': imagedata[i+2],
						'colorNum': color,
						'onBorder': false,
						'hasMessage': false
					};
				}

				if (byCoords[y].length == 0 || lastColor != colors[color])
				{
					//if (lastColor && lastColor.offsetRanges[0][0] != lastColor.offsetRanges[0][1])
					//	lastColor.outLine.push(lastColor.offsetRanges[0][1])
					byCoords[y][x] = colors[color];
				}
				lastColor = colors[color];

				if (x == 0 && !colors[color].onBorder)
				{
					//reset extent
					colors[color].extentMax = [x, y];
					colors[color].extentMin = [x, y];
					colors[color].onBorder = true;
				}
			}

			var quadrangles = [];

			// Enrich & check colors
			for (var color in colors)
			{
				if (colors.hasOwnProperty(color))
				{
					var c = colors[color];

					c.center = [Math.round((c.extentMax[0] + c.extentMin[0])/2), Math.round((c.extentMax[1] + c.extentMin[1])/2)];
					c.extentSize = [c.extentMax[0] - c.extentMin[0], c.extentMax[1] - c.extentMin[1]];

					// Note: Our Quadrangle #1 is not the official #1, we are shifted by 50%
					var correctedQuadX = c.center[0];
					if (c.center[1] < 278)
					{
						c.quadrangle = Math.floor(correctedQuadX / 469) + 2;
					}
					else if (c.center[1] < 512)
					{
						c.quadrangle = Math.floor(correctedQuadX / 352) + 8;
					}
					else if (c.center[1] < 746)
					{
						c.quadrangle = Math.floor(correctedQuadX / 352) + 16;
					}
					else
					{
						c.quadrangle = Math.floor(correctedQuadX / 469) + 24;
					}

					if (!quadrangles[c.quadrangle])
						quadrangles[c.quadrangle] = [];
					quadrangles[c.quadrangle].push(c);
				}
			}

			var quadNr = 1;
			var quadNrs = [];
			for (var q = 0; q < quadrangles.length; q++)
			{
				if (!quadrangles[q])
					continue;

				quadrangles[q] = quadrangles[q].sort(function (a, b) {

				});

				quadrangles[q] = quadrangles[q].sort(function (a, b) {
					var rowA = Math.floor(a.center[1]/30);
					var rowB = Math.floor(b.center[1]/30);

					if (rowA - rowB == 0)
						return a.center[0] - b.center[0];
					else
						return rowA - rowB;
				});

				for (var c = 0; c < quadrangles[q].length; c++)
				{
					quadrangles[q][c].quadNr = quadNr;
					quadNrs[quadNr] = quadrangles[q][c];
					quadNr++;
				}
			}

			return {
				'colors': colors,
				'quadNrs': quadNrs,
				'byCoords': byCoords
			};
		},
		'numberImage': function (img, colors) {

			var canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			var context = canvas.getContext('2d');

			context.drawImage(img, 0, 0);

			context.font = "15px Georgia";
			context.textAlign = 'center';
			context.textBaseline = 'middle';

			context.fillStyle = 'black';

			for (var color in colors)
			{
				if (colors.hasOwnProperty(color))
				{
					var c = colors[color];

					context.fillStyle = 'white';
					context.fillText(c.nr, c.center[0], c.center[1]);

					context.fillStyle = c.hasMessage ? 'red' : 'black';
					context.fillText(c.nr, c.center[0] + 1, c.center[1] + 1);
					if (c.hasMessage)
					{
						context.beginPath();
						context.arc(c.center[0], c.center[1], 30, 0, 2*Math.PI);
						context.stroke();
					}
				}
			}

			var numberedImg = new Image;
			numberedImg.src = canvas.toDataURL();

			return numberedImg;
		},
		'borderImage': function (img, colors, drawColors) {

			var canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			var context = canvas.getContext('2d');

			if (drawColors)
				context.drawImage(img, 0, 0);

			var imageData = context.getImageData(0, 0, img.width, img.height);

			for (var color in colors)
			{
				if (colors.hasOwnProperty(color))
				{
					var c = colors[color];
					var len = c.outLine.length;
					for (var i = 0; i < len; i++)
					{
						imageData.data[c.outLine[i]*4] = 0;
						imageData.data[c.outLine[i]*4 + 1] = 0;
						imageData.data[c.outLine[i]*4 + 2] = 0;
						imageData.data[c.outLine[i]*4 + 3] = 255;
					}
				}
			}

			context.putImageData(imageData, 0, 0);

			var borderImg = new Image;
			borderImg.src = canvas.toDataURL();

			return borderImg;
		},
		'colorCanvasArea': function (canvas, area, color) {

			var context = canvas.getContext('2d');

			var imageData = context.getImageData(area.extentMin[0], area.extentMin[1], 1 + area.extentMax[0] - area.extentMin[0], area.extentMax[1] - area.extentMin[1]);

			var len = area.offsetRanges.length;
			for (var i = 0; i < len; i++)
			{
				var y = area.offsetRanges[i][0] - area.extentMin[1];
				var lastX = area.offsetRanges[i][2];
				for (var x = area.offsetRanges[i][1]; x <= lastX; x++)
				{
					var offset = ((y * imageData.width) + (x - area.extentMin[0])) * 4;
					imageData.data[offset] = color[0];
					imageData.data[offset + 1] = color[1];
					imageData.data[offset + 2] = color[2];
					imageData.data[offset + 3] = color[3];
				}
			}

			context.putImageData(imageData, area.extentMin[0], area.extentMin[1]);

			return canvas;
		},
		'getAreaFromCoords': function (analytics, x, y) {

			var area = null;
			for (var startX in analytics.byCoords[y])
			{
				if (analytics.byCoords[y].hasOwnProperty(startX))
				{
					if (x < startX)
						return area;

					area = analytics.byCoords[y][startX];
				}
			}

			return null;
		},
	};
  	return mapAnalyzeServiceInstance;
}]);