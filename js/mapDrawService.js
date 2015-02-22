var module = angular.module('mapDrawService', []);

module.factory('mapDrawService', ['$rootScope', 'modService', function($rootScope, modService) {

	var mapDrawServiceInstance = {
		canvasCache: {},

		'colorAreaSolo': function (canvas, area, color) {
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
		'outlineAreaSolo': function (canvas, area, color, outlineWidth) {

			if (!outlineWidth)
				outlineWidth = 4;

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
			var bottomY = area.extentMax[1] - area.extentMin[1] - outlineWidth;
			for (var i = 0; i < len; i++)
			{
				var y = area.offsetRanges[i][0] - area.extentMin[1];
				var lastX = area.offsetRanges[i][2];
				for (var x = area.offsetRanges[i][1]; x <= lastX; x++)
				{
					if (x < area.offsetRanges[i][1] + outlineWidth || x > lastX - outlineWidth
						|| y < outlineWidth || y > bottomY
						|| inEdgeRange(x, y + area.extentMin[1], outlineWidth))
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
		'colorProvinceSolo': function (canvas, provinceId, color) {
			return modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
				provinceId = parseInt(provinceId);
				if (provinceId && dataNode.areaByProvinceId[provinceId])
					this.colorAreaSolo(canvas, dataNode.areaByProvinceId[provinceId], color);
			}.bind(this));
		},
		'outlineProvinceSolo': function (canvas, provinceId, color, outlineWidth) {
			return modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
				provinceId = parseInt(provinceId);
				if (provinceId && dataNode.areaByProvinceId[provinceId])
					this.outlineAreaSolo(canvas, dataNode.areaByProvinceId[provinceId], color, outlineWidth);
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
		'colorArea': function (canvas, area, color) {
			var cache = this.cacheCanvas(canvas);
			var imageData = cache.imageData;

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
		'colorProvinces': function (canvas, provinces, color, noDraw) {
			return modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
				if (provinces)
				{
					for (var i = 0; i < provinces.length; i++)
					{
						var provinceId = null;
						if (!angular.isObject(provinces[i]))
							provinceId = parseInt(provinces[i]);
						else if ('nr' in provinces[i])
							provinceId = provinces.nr;
						else if ('id' in provinces[i])
							provinceId = provinces.id;
						else
						{
							console.log('Unknown province type:')
							console.log(provinces[i]);
						}

						if (provinceId && dataNode.areaByProvinceId[provinceId])
							this.colorArea(canvas, dataNode.areaByProvinceId[provinceId], color);
					}
				}

				if (!noDraw)
					this.drawCanvas(canvas);
			}.bind(this));
		},
	};
  	return mapDrawServiceInstance;
}]);