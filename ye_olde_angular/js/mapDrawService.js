var module = angular.module('mapDrawService', []);

module.factory('mapDrawService', ['$rootScope', 'modService', function($rootScope, modService) {

	var mapDrawServiceInstance = {
		canvasCache: {},

		'fillAreaSolo': function (canvas, area, color) {
			color = this.getColor(color);

			var context = canvas.getContext('2d');

			var imageData = context.getImageData(area.extentMin[0], area.extentMin[1], 1 + area.extentMax[0] - area.extentMin[0], 1 + area.extentMax[1] - area.extentMin[1]);

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
		'inlineAreaSolo': function (canvas, area, color, width) {

			if (!width)
				width = 4;

			color = this.getColor(color);

			var context = canvas.getContext('2d');

			var imageData = context.getImageData(area.extentMin[0], area.extentMin[1], 1 + area.extentMax[0] - area.extentMin[0], 1 + area.extentMax[1] - area.extentMin[1]);

			var lastY = 0;
			function inEdgeRange (pickX, pickY, range)
			{
				var len = area.outLine.length;
				for (var i = lastY; i < len; i++)
				{
					var o = area.outLine[i];
					var y = Math.floor(o / canvas.width);

					if ((pickY - range) == y)
						lastY = i;
					if (pickY - y > range)
						continue;

					if (y - pickY > range)
						return false;

					var x = o % canvas.width;

					if (Math.abs(x - pickX) + Math.abs(y - pickY) < range)
						return true;
				}
				return false;
			}

			var len = area.offsetRanges.length;
			var bottomY = area.extentMax[1] - area.extentMin[1] - width;
			for (var i = 0; i < len; i++)
			{
				var y = area.offsetRanges[i][0] - area.extentMin[1];
				var lastX = area.offsetRanges[i][2];
				for (var x = area.offsetRanges[i][1]; x <= lastX; x++)
				{
					if (x < area.offsetRanges[i][1] + width || x > lastX - width
						|| y < width || y > bottomY
						|| inEdgeRange(x, y + area.extentMin[1], width))
					{
						var offset = ((y * imageData.width) + (x - area.extentMin[0])) * 4;
						imageData.data[offset] = color[0];
						imageData.data[offset + 1] = color[1];
						imageData.data[offset + 2] = color[2];
						imageData.data[offset + 3] = color[3];
					}
				}
			}

			context.putImageData(imageData, area.extentMin[0], area.extentMin[1]);

			return canvas;
		},
		'outlineAreaSolo': function (canvas, area, color, width) {

			if (!width)
				width = 2;

			color = this.getColor(color);

			var context = canvas.getContext('2d');

			var widthHalfLeft = Math.ceil((width - 1) / 2);
			var widthHalfRight = Math.floor((width - 1) / 2);

			var imageData = context.getImageData(area.extentMin[0] - widthHalfLeft, area.extentMin[1] - widthHalfLeft, (1 + area.extentMax[0] - area.extentMin[0]) + widthHalfLeft + widthHalfRight, (1 + area.extentMax[1] - area.extentMin[1]) + widthHalfLeft + widthHalfRight);


			var len = area.outLine.length;
			for (var i = 0; i < len; i++)
			{
				var offset = area.outLine[i];

				var x = (offset % canvas.width) - (area.extentMin[0] - widthHalfLeft);
				var y = Math.floor(offset / canvas.width) - (area.extentMin[1] - widthHalfLeft);

				var localOffset = ((y * imageData.width) + x);

				for (var w = -widthHalfLeft; w <= widthHalfRight; w++)
				{
					for (var h = -widthHalfLeft; h <= widthHalfRight; h++)
					{
						var widthOffset = (localOffset + w + h*imageData.width) * 4;

						imageData.data[widthOffset + 0] = color[0];
						imageData.data[widthOffset + 1] = color[1];
						imageData.data[widthOffset + 2] = color[2];
						imageData.data[widthOffset + 3] = color[3];
					}
				}
			}

			context.putImageData(imageData, area.extentMin[0] - widthHalfLeft, area.extentMin[1] - widthHalfLeft);

			return canvas;
		},
		'fillProvinceSolo': function (canvas, provinceId, color) {
			return modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
				provinceId = parseInt(provinceId);
				if (provinceId && dataNode.areaByProvinceId[provinceId])
					this.fillAreaSolo(canvas, dataNode.areaByProvinceId[provinceId], color);
			}.bind(this));
		},
		'outlineProvinceSolo': function (canvas, provinceId, color, width) {
			return modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
				provinceId = parseInt(provinceId);
				if (provinceId && dataNode.areaByProvinceId[provinceId])
					this.outlineAreaSolo(canvas, dataNode.areaByProvinceId[provinceId], color, width);
			}.bind(this));
		},
		'inlineProvinceSolo': function (canvas, provinceId, color, width) {
			return modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
				provinceId = parseInt(provinceId);
				if (provinceId && dataNode.areaByProvinceId[provinceId])
					this.inlineAreaSolo(canvas, dataNode.areaByProvinceId[provinceId], color, width);
			}.bind(this));
		},
		'cacheCanvas': function (canvas) {
			if (!this.canvasCache[canvas.id] || this.canvasCache[canvas.id].canvas != canvas)
			{
				var context = canvas.getContext('2d');

				var imageData = context.getImageData(0, 0, canvas.width, canvas.height);

				this.canvasCache[canvas.id] = {
					'canvas': canvas,
					'imageData': imageData,
					'context': context,
				};
			}

			return this.canvasCache[canvas.id];
		},
		'clearCanvasCache': function (canvas) {
			if (this.canvasCache[canvas.id])
				this.canvasCache[canvas.id] = null;
		},
		'fillArea': function (canvas, area, color) {
			var cache = this.cacheCanvas(canvas);
			var imageData = cache.imageData;
			color = this.getColor(color);

			var len = area.offsetRanges.length;
			for (var i = 0; i < len; i++)
			{
				var y = area.offsetRanges[i][0];
				var lastX = area.offsetRanges[i][2];
				for (var x = area.offsetRanges[i][1]; x <= lastX; x++)
				{
					var offset = ((y * imageData.width) + x) * 4;

					imageData.data[offset] = color[0];
					imageData.data[offset + 1] = color[1];
					imageData.data[offset + 2] = color[2];
					imageData.data[offset + 3] = color[3];
				}
			}

			return canvas;
		},
		'drawCanvas': function (canvas) {
			var cache = this.cacheCanvas(canvas);

			cache.context.putImageData(cache.imageData, 0, 0);
		},
		'clearCanvas': function (canvas) {
			this.colorCanvas(canvas, [0, 0, 0, 0]);
		},
		'colorCanvas': function (canvas, color) {
			var cache = this.cacheCanvas(canvas);

			var imageData = cache.imageData;

			color = this.getColor(color);

			var len = imageData.data.length;
			for (var i = 0; i < len; i += 4)
			{
				imageData.data[i] = color[0];
				imageData.data[i + 1] = color[1];
				imageData.data[i + 2] = color[2];
				imageData.data[i + 3] = color[3];
			}
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
		'fillProvinces': function (canvas, provinces, color, noDraw) {
			color = this.getColor(color);
			return modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
				if (provinces)
				{
					for (var i = 0; i < provinces.length; i++)
					{
						var provinceId = null;
						if (!angular.isObject(provinces[i]))
							provinceId = provinces[i];
						else if ('nr' in provinces[i])
							provinceId = provinces[i].nr;
						else if ('id' in provinces[i])
							provinceId = provinces[i].id;
						else if ('_id' in provinces[i])
							provinceId = provinces[i]._id;
						else
						{
							console.log('Unknown province type:')
							console.log(provinces[i]);
						}

						if (provinceId && dataNode.areaByProvinceId[parseInt(provinceId)])
							this.fillArea(canvas, dataNode.areaByProvinceId[parseInt(provinceId)], color);
					}
				}

				if (!noDraw)
					this.drawCanvas(canvas);
			}.bind(this));
		},
		'getColor': function (colorInput, opacity) {

			if (opacity === undefined)
				opacity = 1;

			var colorOutput = [0, 0, 0, 256];

			if (!colorInput)
				return colorOutput;

			if (angular.isArray(colorInput))
			{
				colorOutput = colorInput;
				if (colorInput.length == 3)
					colorInput.push(256 * opacity);

				return colorInput;
			}
			else if (colorInput[0] == '#')
			{
				if (colorInput.length == 4)
				{
					colorOutput = [
						256 * (16 / parseInt(colorInput[1], 16)),
						256 * (16 / parseInt(colorInput[2], 16)),
						256 * (16 / parseInt(colorInput[3], 16)),
						256 * opacity,
					];
				}
				else if (colorInput.length == 5)
				{
					colorOutput = [
						256 * (16 / parseInt(colorInput[1], 16)),
						256 * (16 / parseInt(colorInput[2], 16)),
						256 * (16 / parseInt(colorInput[3], 16)),
						256 * (16 / parseInt(colorInput[4], 16)),
					];
				}
				else if (colorInput.length == 7)
				{
					colorOutput = [
						parseInt(colorInput[1] + colorInput[2], 16),
						parseInt(colorInput[3] + colorInput[4], 16),
						parseInt(colorInput[5] + colorInput[6], 16),
						256 * opacity,
					];
				}
				else if (colorInput.length == 9)
				{
					colorOutput = [
						parseInt(colorInput[1] + colorInput[2], 16),
						parseInt(colorInput[3] + colorInput[4], 16),
						parseInt(colorInput[5] + colorInput[6], 16),
						parseInt(colorInput[7] + colorInput[8], 16),
					];
				}

				return colorOutput;
			}
		}

	};
  	return mapDrawServiceInstance;
}]);