var myMod = angular.module('JoroDox', ['ui.bootstrap', 'ui.router', 'ui.layout', 'ui.tree', 'panzoom', 'panzoomwidget', 'modService', 'mapAnalyzeService', 'pdxDataService', 'pdxScriptService', 'rendererService']);

myMod.filter('commentFilter', function() {
	return function(input) {
		var txt = [];
		for (key in input)
		{
		    if (input.hasOwnProperty(key) && input[key] != null)
		    {
		    	txt.push(input[key]);
		    }
		}

		return txt;
	};
});

myMod.filter('collapseFilter', function() {
	return function(input, collapsed) {
		if (collapsed)
			return [];
		else
			return input;
	};
});

myMod.filter('jsonFiltered', function() {
	return function(data, removeList, spacing) {
		return JSON.stringify(data, function (key, value) {
			if (removeList.indexOf(key) != -1 || key == '$$hashKey')
				return undefined;
			else
				return value;
		}, spacing);
	};
});

// Error window
myMod.controller('ErrorModal', function ($scope, $modalInstance, error) {

	$scope.error = error;

	$scope.ok = function () {
		$modalInstance.close();
	};
});


//Message window
myMod.controller('MessageModal', function ($scope, $modalInstance, message, resolve) {

	$scope.message = message;

	$scope.ok = function () {
		$modalInstance.close();
		resolve(true);
	};
});

// Router
myMod.config(['$stateProvider', function ($stateProvider) {
	$stateProvider.state({
		name: 'settings',
		url: '/settings',
		templateUrl: 'content.settings.html',
	});
	$stateProvider.state({
		name: 'about',
		url: '/about',
		templateUrl: 'content.about.html'
	});
	$stateProvider.state({
		name: 'inspect',
		url: '/inspect',
		templateUrl: 'content.inspect.html'
	});
	$stateProvider.state({
		name: 'inspect.file',
		templateUrl: 'content.inspect.file.html',
		url: '/inspect/:path',
		controller: 'FileInspect',
		resolve: {
			node: function ($stateParams, modService) {
				return modService.data.fileSystem.byPath[$stateParams.path];
			}
		}
	});
	$stateProvider.state({
		name: 'inspect.map',
		templateUrl: 'content.inspect.map.html',
		url: '/inspect/map',
	});
	$stateProvider.state({
		name: 'inspect.provincesHistory',
		templateUrl: 'content.inspect.provincesHistory.html',
		url: '/inspect/seas',
	});
}]).config(['$urlRouterProvider', function ($urlRouterProvider) {
	$urlRouterProvider.otherwise("/inspect")
}]);

// File inspector
myMod.controller('FileInspect', function ($scope, node, modService, pdxDataService, pdxScriptService, $timeout, rendererService, $state) {
	$scope.node = node;
	$scope.loading = true;
	$scope.showJson = false;
	$scope.viewScene = null;
	$scope.image = null;

	$scope.Math = window.Math;

	modService.getMetadata(node).then(function () {

	});

	if (node.fileType == 'image')
	{
		modService.getFile(node.path).then(function (file) {
			loadImage(file, function (img) {
				$scope.$apply(function() { $scope.image = img; $scope.loading = false; });
			}, {noRevoke: true});
		});
	}
	else if (node.fileType == 'image-tga')
	{
		modService.getFileBuffer(node.path).then(function (buffer) {
			var tga = new TGA();
			tga.load(new Uint8Array(buffer));
			var img = new Image();
			img.src = tga.getDataURL('image/png');
			$scope.image = img;
			$scope.loading = false;
		});
	}
	else if (node.fileType == 'pdx-animation')
	{
		modService.getFileBuffer(node.path).then(function (buffer) {
			$timeout(function () {
				node.treeData = pdxDataService.readFromBuffer(buffer);
				node.treeDataType = 'complex';
				$scope.loading = false;
			});
		});
	}
	else if (node.fileType == 'pdx-mesh')
	{
		$scope.animations = [];
		$scope.selectedAnimation = null;

		var findAnimations = function (folder) {
			for (var i = 0; i < folder.files.length; i++)
			{
				if (folder.files[i].fileType == 'pdx-animation')
				{
					$scope.animations.push({
						name: folder.files[i].path,
						fps: 0,
						bones: 0,
						duration: 0,
						animation: null,
						node: folder.files[i],
					});
				}
			}
			for (var i = 0; i < folder.folders.length; i++)
				findAnimations(folder.folders[i]);
		};
		findAnimations(node.parent);

		$scope.$watch('selectedAnimation', function(newValue, oldValue) {
			$scope.loadAnimation(newValue);
		});

		$scope.loadAnimation = function (animation) {
			if (animation)
			{
				$scope.loading = true;
				modService.getFileBuffer(animation.node.path).then(function (buffer) {
					animation.node.treeData = pdxDataService.readFromBuffer(buffer);
					animation.node.treeDataType = 'complex';
					animation.fps = animation.node.treeData.props.info.props.fps;
					animation.bones = animation.node.treeData.props.info.props.j;
					animation.duration = animation.node.treeData.props.info.props.sa / animation.node.treeData.props.info.props.fps;

					rendererService.setPdxAnimation($scope.viewScene, animation.node.treeData);
					$scope.loading = false;
				});
			}
			else if ($scope.viewScene)
			{
				rendererService.setPdxAnimation($scope.viewScene, null);
			}
		};

		modService.getFileBuffer(node.path).then(function (buffer) {
			$timeout(function () {
				node.treeData = pdxDataService.readFromBuffer(buffer);
				node.treeDataType = 'complex';

				if ('object' in node.treeData.props)
				{
					rendererService.createViewScene(document.getElementById('3dview'), 800, 600).then(function (viewScene) {
						$scope.viewScene = viewScene;
						rendererService.loadPdxMesh(node.treeData, node.parent.path).then(function (viewObject) {
							viewScene.scene.add(viewObject.object);
							viewScene.viewConfig.distance = viewObject.distance * 4;
							viewScene.viewConfig.update = viewObject.update;
							viewScene.viewConfig.viewObject = viewObject;
							$scope.loading = false;
						});
					});
				}
				else
				{
					$scope.loading = false;
				}
			}, 0);
		});
	}
	else if (node.fileType == 'collada')
	{
		$scope.animations = [];

		$scope.$watch('selectedAnimation', function(newValue, oldValue) {
			if ($scope.viewScene && $scope.viewScene.viewConfig.viewObject)
			{
				if (oldValue)
				{
					oldValue.animation.stop();
					oldValue.animation.root.pose();
				}
				if (newValue)
				{
					newValue.animation.play();
				}
			}
		});

		rendererService.createViewScene(document.getElementById('3dview'), 800, 600).then(function (viewScene) {
			$scope.viewScene = viewScene;
			modService.getFileText(node.path).then(function (text) {
				rendererService.loadCollada(text, node.parent.path).then(function (viewObject) {
					viewScene.scene.add(viewObject.object);
					viewScene.viewConfig.distance = viewObject.distance * 4;
					viewScene.viewConfig.update = viewObject.update;
					viewScene.viewConfig.viewObject = viewObject;

					for (var i = 0; i < viewObject.animations.length; i++)
					{
						var anim = viewObject.animations[i];

						$scope.animations.push({
							name: anim.data.name ? anim.data.name : 'Embedded',
							fps: anim.data.fps,
							bones: anim.data.hierarchy.length,
							duration: anim.data.length,
							animation: anim,
							node: null
						});
					}

					$scope.loading = false;
				});
			});
		});
	}
	else if (node.fileType == 'pdx-script')
	{
		modService.getFileText(node.path).then(function (text) {
			$timeout(function () {
				node.treeData = pdxScriptService.readFile(text);
				node.treeDataType = 'simple';
				$scope.loading = false;
			}, 0);
		});
	}
	else if (node.fileType == 'text' || node.fileType == 'csv' || node.fileType == 'yml'
		|| node.fileType == 'python' || node.fileType == 'xml'  || node.fileType == 'lua'
		|| node.fileType == 'lua' || node.fileType == 'hlsl-header')
	{
		modService.getFileText(node.path).then(function (text) {
			$timeout(function () {
				node.textData = text;
				$scope.loading = false;
			}, 0);
		});
	}
	else
	{
		$scope.loading = false;
	}

	$scope.convertToPdxmesh = function () {
		$scope.loading = true;
		modService.getFileText($scope.node.path).then(function (text) {
			return rendererService.loadCollada(text, node.parent.path);
		}).then(function (viewObject) {
			var pdxdata = rendererService.convertToPdxmesh(viewObject.object, {
				textureBaseName: $scope.node.name.replace('.dae', ''),
			});
			var buffer = pdxDataService.writeToBuffer(pdxdata);

			var newFile = $scope.node.path.replace('.dae', '.mesh');

			return modService.writeFileBuffer(newFile, buffer, true).then(function () {
				$scope.loading = false;
			}).then(function () {
				return newFile;
			});
		}).then(function (newFile) {
			modService.loadFileNodeDirectory($scope.node.parent).then(function () {
				modService.getFileNodeByPath(newFile).then(function(newNode) {
					$state.go('inspect.file', {path: newNode.path, 'node': newNode});
					return modService.showMessage({title: 'Model converted to PDXmesh format', text: 'Model saved to `'+ newFile +'`'});
				});
			});
		});
	};

	$scope.convertToPdxAnim = function (animation) {
		$scope.loading = true;
		modService.getFileText($scope.node.path).then(function (text) {
			return rendererService.loadCollada(text, node.parent.path);
		}).then(function (viewObject) {
			var pdxdata = rendererService.convertToPdxAnim(animation, viewObject);
			var buffer = pdxDataService.writeToBuffer(pdxdata, viewObject);

			var newFile = $scope.node.path.replace('.dae', '_'+ animation.name +'.anim');

			return modService.writeFileBuffer(newFile, buffer, true).then(function () {
				$scope.loading = false;
			}).then(function () {
				return newFile;
			});
		}).then(function (newFile) {
			modService.loadFileNodeDirectory($scope.node.parent).then(function () {
				return modService.showMessage({title: 'Animation converted to PDX animation format', text: 'Animation saved to `'+ newFile +'`'});
			});
		});
	};

	$scope.createBlankAnim = function () {
		$scope.loading = true;
		var pdxDataRoot = {name: 'pdxData', type: 'object', subNodes: []};
		pdxDataRoot.subNodes.push({name: 'pdxasset', type: 'int', data: [1, 0]})

		pdxDataRoot.subNodes.push({name: 'info', type: 'object', subNodes: [
			{name: 'fps', type: 'float', data: [1]},
			{name: 'sa', type: 'int', data: [1]},
			{name: 'j', type: 'int', data: [2]},
			{name: 'Root', type: 'object', subNodes: [
				{name: 'sa', type: 'string', data: 't'},
				{name: 't', type: 'float', data: [0, 0, 0]},
				{name: 'q', type: 'float', data: [0, 0, 0, -1]},
				{name: 's', type: 'float', data: [1]},
			]},
			{name: 'joint1', type: 'object', subNodes: [
				{name: 'sa', type: 'string', data: ''},
				{name: 't', type: 'float', data: [0, 0, 0]},
				{name: 'q', type: 'float', data: [0, 0, 0, -1]},
				{name: 's', type: 'float', data: [1]},
			]}
		]});
		pdxDataRoot.subNodes.push({name: 'samples', type: 'object', subNodes: [
			{name: 'q', type: 'float', data: [0, 0, 0]}
		]});

		var buffer = pdxDataService.writeToBuffer(pdxDataRoot);

		return modService.writeFileBuffer('blank.anim', buffer, true).then(function () {
			$scope.loading = false;
		});
	};

	$scope.createTriangle = function () {
		$scope.loading = true;
		var pdxDataRoot = {name: 'pdxData', type: 'object', subNodes: []};
		pdxDataRoot.subNodes.push({name: 'pdxasset', type: 'int', data: [1, 0]})

		pdxDataRoot.subNodes.push({name: 'object', type: 'object', subNodes: [
			{name: 'shape', type: 'object', subNodes: [
				{name: 'mesh', type: 'object', subNodes: [
					{name: 'p', type: 'float', data: [0, 0, 0, 1, 0, 0, 1, 0, 1]},
					{name: 'n', type: 'float', data: [0, 1, 0, 0, 1, 0, 0, 1, 0]},
					{name: 'ta', type: 'float', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
					{name: 'u0', type: 'float', data: [0, 0, 1, 0, 1, 1]},
					{name: 'tri', type: 'int', data: [2, 1, 0]},
					{name: 'aabb', type: 'object', subNodes: [
						{name: 'min', type: 'float', data: [-1, 0, -1]},
						{name: 'max', type: 'float', data: [1, 0, 1]},
					]},
					{name: 'material', type: 'object', subNodes: [
						{name: 'shader', type: 'string', data: 'PdxMeshStandard', nullByteString: true},
						{name: 'diff', type: 'string', data: 'coin_diffuse.dds', nullByteString: true},
						{name: 'n', type: 'string', data: 'coin_normal.dds', nullByteString: true},
						{name: 'spec', type: 'string', data: 'nospec.dds', nullByteString: true},
					]},
				]},
			]},
		]});
		pdxDataRoot.subNodes.push({name: 'locator', type: 'object', subNodes: []});

		var buffer = pdxDataService.writeToBuffer(pdxDataRoot);

		return modService.writeFileBuffer('space_frigate/triangle.mesh', buffer, true).then(function () {
			$scope.loading = false;
		});
	};

	$scope.dataSample = function (data, showType) {
		if (typeof data == 'string' && showType != 'simple')
		{
			return data.length > 200 ? ('"'+ data.slice(0, 200) + '" ... (length: ' + data.length +')') : '"' + data +'"';
		}
		else if (typeof data == 'string' && showType == 'simple')
		{
			return data.length > 400 ? (data.slice(0, 400) + ' ... (length: ' + data.length +')') : data;
		}
		else if (typeof data == 'number')
		{
			return Math.round(data * 100)/100;
		}
		else if (typeof data == 'object' && data != null)
		{
			var formattedSample = [];
			for (var i = 0; i <  10 && i < data.length; i++)
			{
				formattedSample.push($scope.dataSample(data[i]));
			}

			if (data.length > 10)
				return '['+ formattedSample.join(', ') +' ... ] (count: '+ data.length +')';
			else
				return '['+ formattedSample.join(', ') +'] (count: '+ data.length +')';
		}

		return data;
	};

	$scope.zoomIn = function() {
		$scope.viewScene.viewConfig.distance *= 0.9;
	};
	$scope.zoomOut = function() {
		$scope.viewScene.viewConfig.distance *= 1.1;
	};
});

// Mod tree
myMod.controller('ModTree', ['$scope', '$state', 'modService', function ($scope, $state, modService) {

	if (!modService.data)
		modService.loadPreviousData().then(null, modService.errorCallback);

	$scope.selectedItem = {};

	$scope.dirLoading = false;

	$scope.options = {
	};

	$scope.remove = function(scope) {
		scope.remove();
	};

	$scope.toggleNode = function(scope, node) {
		if (!node.dirLoaded)
			modService.loadFileNodeDirectory(node);
		node.dirVisible = !node.dirVisible;
		scope.toggle();
	};

	$scope.open = function(node) {
		if (node.path == 'map')
			$state.go('inspect.map');
		else if (node.path == 'history/provinces')
			$state.go('inspect.provincesHistory');
		else
			$state.go('inspect.file', {path: node.path, 'node': node});
	};

	$scope.fileTypeToIcon = function (node) {
		if (node.fileType == 'image' || node.fileType == 'image-tga' || node.fileType == 'image-dds')
			return 'picture';
		else if (node.fileType == 'pdx-script' || node.fileType == 'csv')
			return 'list';
		else if (node.fileType == 'pdx-mesh')
			return 'globe';
		else if (node.fileType == 'pdx-animation')
			return 'film';
		else if (node.fileType == 'pdx-mod')
			return 'cog';
		else if (node.isDirectory)
			return 'folder-close';

		return 'file';
	};

	$scope.refreshOpenDirectories = function () {
		if (!$scope.dirLoading)
		{
			$scope.dirLoading = true;
			modService.refreshOpenDirectories().then(function () {
				$scope.dirLoading = false;
			});
		}
	};
}]);

//LoadMod
myMod.controller('LoadMod', ['$scope', 'modService', '$state', function ($scope, modService, $state) {
	$scope.mods = [];

	$scope.chooseModRootDir = function () {
		 chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(directory) {
			modService.setRootFileEntry(directory).then(function () {
				$scope.loadPreviousModData();
			});
		});
	};

	$scope.loadPreviousModData = function () {
		modService.getPreviousModData().then(function (mods) {
			$scope.mods = mods;
		});
	};

	$scope.deleteModData = function (modData) {
		modService.getStorage().then(function (storage) {
			// Remove from storage
			storage.remove(modData.id, function () {
				$scope.loadPreviousModData();
			});
		});
	};

	$scope.loadModData = function (modData) {
		modService.loadData(modData.id).then(function () {
			$state.go('inspect');
		});
	};

	$scope.loadPreviousModData();
}]);

//Provinces History Tool
myMod.controller('ProvincesHistoryTool', ['$scope', 'modService', 'mapAnalyzeService', '$timeout', function ($scope, modService, mapAnalyzeService, $timeout) {
	$scope.colors = null;
	$scope.messages = '';
	$scope.output = '';
	$scope.scrollImage = null;
	$scope.loading = false;
	$scope.outputTitle = 'Output';
	$scope.messagesTitle = 'Messages';

	$scope.getProvincesFiles = function () {
		$scope.loading = true;
		$scope.output = '';
		$scope.messages = '';
		$scope.outputTitle = 'Output';

		modService.getFileNodeByPath('history/provinces').then(function (dataNode) {
			return modService.loadFileNodeDirectory(dataNode).then(function (dataNode) {
				$scope.output = '';
				$scope.messages = 'Found '+ dataNode.files.length +' province histories' + "\n";
				$scope.loading = false;
			});
		});
	};

	$scope.createFiles = function () {
		return modService.getData(modService.data.map.colorMapping).then(function (mappings) {
			$scope.output = '﻿l_english:'+"\n";
			$scope.outputTitle = 'prov_names_l_english.yml';
			angular.forEach(mappings, function (mapping) {
				$scope.output += ' PROV'+ mapping.id +': "'+ mapping.id +'"'+"\n";
				var text = [
					'#' + mapping.id,
					'',
					'trade_goods = unknown',
					'hre = no',
					'base_tax = 1',
					'manpower = 1',
					'discovered_by = western',
					'native_size = 0',
					'native_ferocity = 0',
					'native_hostileness = 0',
					'',
				];

				var filePath = 'history/provinces/'+ mapping.id +' - Unknown '+ mapping.id +'.txt';

				modService.writeFileText(
					filePath,
					text.join("\n"),
					function (event) {
						if (!event)
							$scope.messages += 'File already existed: `'+ filePath +'`' +"\n";
						else
							$scope.messages += 'Written `'+ filePath +'`' +"\n";
					},
					false
				);
			});
		});
	};

	$scope.getProvincesFiles();
}]);

// MapCheck
myMod.controller('MapCheck', ['$scope', 'modService', 'mapAnalyzeService', '$timeout', '$q', function ($scope, modService, mapAnalyzeService, $timeout, $q) {

	// Map analytics data
	$scope.analytics = null;
	// Map image
	$scope.scrollImage = null;
	// If currently doing stuff
	$scope.loading = false;

	$scope.mapWidth = 3632;
	$scope.mapHeight = 1024;

	// Current map view
	$scope.view = 'provinces';

	// Display options
	$scope.options = {
		showGrid: true,
		showLabels: false,
		highLight: true,
		selectArea: false,
	};

	$scope.messages = '';
	$scope.output = '';
	$scope.outputTitle = 'Output';
	$scope.messagesTitle = 'Messages';
	$scope.closestArea = 25;

	$scope.labels = [];

	$scope.hasSeasPng = false;

	modService.fileExists('map/seas.png').then(function (exists) {
		$scope.hasSeasPng = exists;
	});


	$scope.$watch('view', function(newValue, oldValue) {
		if (newValue == 'provinces')
		{
			$scope.loading = true;
			modService.getData(modService.data.map.provinces.image).then(function (data) {
				return modService.getImage(data);
			}).then(function (image) {
				$scope.scrollImage = image.src;
				$scope.mapWidth = image.width;
				$scope.mapHeight = image.height;
				$scope.loading = false;
			});
		}
		else if (newValue == 'seas')
		{
			$scope.loading = true;
			modService.getData(modService.data.map.seas.image).then(function (data) {
				return modService.getImage(data);
			}).then(function (image) {
				$scope.scrollImage = image.src;
				$scope.mapWidth = image.width;
				$scope.mapHeight = image.height;
				$scope.loading = false;
			});
		}

		if ($scope.options.highLight)
		{
			$scope.options.highLight = false;
			$scope.options.highLight = true;
		}
	});
	$scope.$watch('[options.showGrid, view]', function(newValue, oldValue) {
		if ($scope.options.showGrid)
		{
			var source = modService.data.map.provinces.grid;
			if ($scope.view == 'seas')
				source = modService.data.map.seas.grid;

			$scope.loading = true;
			modService.getData(source).then(function (data) {
				return modService.getImage(data);
			}).then(function (image) {
				$scope.gridImage = image.src;
				$scope.loading = false;
			});
		}
		else
		{
			$scope.gridImage = null;
		}
	});
	$scope.$watch('[options.highLight, view]', function(newValue, oldValue) {
		if ($scope.options.highLight)
		{
			var source = modService.data.map.provinces.info;
			if ($scope.view == 'seas')
				source = modService.data.map.seas.info;

			$scope.loading = true;
			modService.getData(source).then(function (data) {
				$scope.analytics = data.analytics;
				$scope.loading = false;
			});
		}
		else
		{
			$scope.analytics = null;
		}
	});

	$scope.loadSeasMap = function () {
		$scope.loading = true;
		$scope.output = '';
		$scope.messages = '';
		$scope.outputTitle = 'default.map - sea_starts()';

		$scope.labels = [];

		$scope.view = 'seas';
		$scope.options.showLabels = true;

		$scope.loading = true;
		modService.getData(modService.data.map.seas.info).then(function (seasInfo) {
			return modService.getData(modService.data.map.colorMapping).then(function (mappings) {
				var seas = [];
				// Iterate over current mapping
				for (var colorNum in seasInfo.analytics.colors)
				{
					if (seasInfo.analytics.colors.hasOwnProperty(colorNum))
					{
						var c = seasInfo.analytics.colors[colorNum];

						if (!mappings.byColor[colorNum])
						{
							var errMessage = 'Sea nr '+ c.quadNr +' not found in definition.csv.'+"\n";

							var color = c;
							$scope.labels.push({text: color.quadNr, x: color.center[0], y: color.center[1], extentMin: color.extentMin, extentSize: color.extentSize, message: errMessage });

							$scope.messages += errMessage;
						}
						else
						{
							$scope.labels.push({text: mappings.byColor[colorNum].id, x: mappings.byColor[colorNum].center[0], y: mappings.byColor[colorNum].center[1], extentMin: mappings.byColor[colorNum].center, extentSize: [0, 0]});

							seas.push(parseInt(mappings.byColor[colorNum].id));
						}
					}
				}

				seas.sort(function (a, b) { return a - b; });

				for (var i = 0; i < seas.length; i++)
				{

					$scope.output += seas[i] +' ';
					if (i % 20 == 0 && i > 0)
						$scope.output += "\n";
				}

				$scope.messages += seas.length +' seas matched.'+"\n";

				$scope.loading = false;
			});
		});
	};

	$scope.loadNumberedMap = function () {
		var deferred = $q.defer();
		// We have to make this async, otherwise we get $apply hell
		$scope.loading = true;
		$scope.output = '';
		$scope.messages = '';
		$scope.outputTitle = '`definition.csv` from map';

		$scope.labels = [];

		$scope.view = 'provinces';
		$scope.options.showLabels = true;

		modService.getData(modService.data.map.provinces.info).then(function (info) {
			var defs = 'province;red;green;blue;x;x' + "\n";
			$scope.labels = [];

			var firstArea;
			angular.forEach(info.analytics.quadNrs, function (color) {
				if (!color)
					return;

				firstArea = color;

				$scope.labels.push({text: color.quadNr, x: color.center[0], y: color.center[1], extentMin: color.extentMin, extentSize: color.extentSize});

				defs += color.quadNr +';'+ color.r +';'+ color.g +';'+ color.b +';?;'+ color.center[0] + ',' + color.center[1] +"\n";
			});
			$scope.output = defs;

			$scope.loading = false;
		});
	};

	$scope.startDown = null;
	$scope.toggleAreaDown = function (event) {
		$scope.startDown = event;
	};

	$scope.toggleAreaUp = function (event) {
		if ($scope.startDown)
		{
			var diff = ($scope.startDown.pageX + $scope.startDown.pageY) - (event.pageX + event.pageY);
			$scope.startDown = null;

			if (diff > 5 || diff < -5)
				return;
		}
		if ($scope.analytics && $scope.options.selectArea)
		{
			var area = mapAnalyzeService.getAreaFromCoords($scope.analytics, event.offsetX, event.offsetY);
			mapAnalyzeService.colorCanvasArea(document.getElementById('PanZoomCanvas'), area, [123, 0, 0, 255]);
		}
	};

	$scope.hoverArea = null;
	$scope.toggleAreaHover = function (event) {
		if (!$scope.analytics)
			return;

		if ($scope.startDown)
		{
			var diff = ($scope.startDown.pageX + $scope.startDown.pageY) - (event.pageX + event.pageY);

			if (diff > 5 || diff < -5)
				return;
		}

		var currentArea = mapAnalyzeService.getAreaFromCoords($scope.analytics, event.offsetX, event.offsetY);

		if (currentArea != $scope.hoverArea)
		{
			// Remove current
			if ($scope.hoverArea)
				mapAnalyzeService.colorCanvasArea(document.getElementById('PanZoomCanvasHover'), $scope.hoverArea, [0, 0, 0, 0]);

			// Highlight new
			$scope.hoverArea = currentArea;
			if (currentArea)
				$scope.mapHint = 'Province #'+ currentArea.nr;
			else
				$scope.mapHint = '';
			mapAnalyzeService.colorCanvasArea(document.getElementById('PanZoomCanvasHover'), $scope.hoverArea, [0, 0, 128, 128]);
		}
	};

	$scope.compareWithDefinitions = function () {
		$scope.loading = true;
		$scope.output = '';
		$scope.messages = '';
		$scope.outputTitle = 'Merged `definition.csv`';
		$scope.labels = [];

		$scope.options.showLabels = true;
		$scope.view = 'provinces';


		$scope.messages = '';

		$q.all({
			mappings: modService.getData(modService.data.map.colorMapping),
			info: modService.getData(modService.data.map.provinces.info),
		}).then(function (data) {
			var mappings = data.mappings.byColor;
			var mapColors = data.info.analytics.colors;
			// Iterate over current mapping
			for (var colorNum in mappings)
			{
				if (mappings.hasOwnProperty(colorNum))
				{
					if (!mapColors[colorNum])
					{
						// Color no longer present in map

						//$scope.messages += 'Mapping '+ mappings[colorNum].id +' no longer exists.' + "\n";

						var closest = null;
						var closestDistance = 0;
						for (var mapColorNum in mapColors)
						{
							if (mapColors.hasOwnProperty(mapColorNum) && !mapColors[mapColorNum].matched && !mappings[mapColorNum] && mappings[colorNum].center)
							{
								distance = Victor.fromArray(mappings[colorNum].center).distance(Victor.fromArray(mapColors[mapColorNum].center));

								if (closest == null || distance < closestDistance)
								{
									closest = mapColors[mapColorNum];
									closestDistance = distance;
								}
							}
						}

						if (closest && closestDistance < $scope.closestArea)
						{
							mappings[colorNum].matched = closest;
							mappings[colorNum].matchDistance = closestDistance;
							closest.matched = mappings[colorNum];
							var msg = 'Missing mapping '+ mappings[colorNum].id +' ('+ mappings[colorNum].name +') matched to closest new color '+ closest.quadNr +' at distance '+ closestDistance + ".\n";
							$scope.labels.push({text: closest.quadNr, x: closest.center[0], y: closest.center[1], extentMin: closest.extentMin, extentSize: closest.extentSize, message: msg});
							$scope.messages += msg;
						}
						else
						{
							$scope.messages += 'Mapping '+ mappings[colorNum].id +' ('+ mappings[colorNum].name +') no longer exists.' + "\n";
						}
					}
					else
					{
						// Color present in map
						mappings[colorNum].matched = mapColors[colorNum];
						mapColors[colorNum].matched = mappings[colorNum];

						var msg = null;
						if (mappings[colorNum].center[0] != mapColors[colorNum].center[0] && mappings[colorNum].center[1] != mapColors[colorNum].center[1])
						{
							//msg = 'Moved '+ mapColors[colorNum].quadNr +' ('+ mappings[colorNum].name +')';
							//$scope.messages += msg;
						}
						$scope.labels.push({text: mapColors[colorNum].quadNr, x: mapColors[colorNum].center[0], y: mapColors[colorNum].center[1], extentMin: mapColors[colorNum].extentMin, extentSize: mapColors[colorNum].extentSize, message: msg, messageType: 'note'});
					}
				}
			}

			// Craft new definitions
			var defs = 'province;red;green;blue;x;x' + "\n";
			for (var id in data.mappings.byId)
			{
				if (data.mappings.byId.hasOwnProperty(id))
				{
					var m = data.mappings.byId[id];

					if (m.matched)
						defs += m.id +';'+ m.matched.r +';'+ m.matched.g +';'+ m.matched.b +';'+ (m.matchedDistance ? m.name +' (moved '+ matchDistance +')': m.name) +';'+ m.matched.center[0] + ',' + m.matched.center[1] +"\n";
					else
						defs += m.id +';'+ m.r +';'+ m.g +';'+ m.b +';'+ (m.name.replace(' (non-exist)', '') + ' (non-exist)') +';'+ m.center +"\n";
				}
			}

			var maxId = data.mappings.byId.length - 1;
			var stayedSame = 0;
			// find new, not matched colors, add 'hasMessage' markings
			for (var colorNum in mapColors)
			{
				if (mapColors.hasOwnProperty(colorNum))
				{
					var c = mapColors[colorNum];
					c.hasMessage = false;

					if (!c.matched)
					{
						maxId++;
						c.hasMessage = true;
						var msg = 'Color '+ maxId +' ('+ c.count +' pixels) is new.' + "\n";
						$scope.messages += msg;
						defs += maxId +';'+ c.r +';'+ c.g +';'+ c.b +';(new);'+ c.center[0] + ',' + c.center[1] +"\n";

						$scope.labels.push({text: maxId, x: c.center[0], y: c.center[1], extentMin: c.extentMin, extentSize: c.extentSize, message: msg});
					}
					else
						stayedSame++;
				}
			}
			$scope.messages += stayedSame +' entries stayed the same.';

			$scope.output = defs;
			$scope.loading = false;
		});
	};
}]);

myMod.directive('sizeElement', function ($window) {
	return {
		scope:true,
		priority: 0,
		link: function (scope, element) {
			scope.$watch(function(){return $(element).height(); }, function(newValue, oldValue) {
				scope.height=$(element).height();
			});
		}
	};
});

//PanZoom
myMod.controller('PanZoom', ['$scope', 'PanZoomService', function ($scope, PanZoomService) {

		// The panzoom config model can be used to override default configuration values
	$scope.panzoomConfig = {
		zoomLevels: 10,
		neutralZoomLevel: 5,
		initialZoomLevel: 0,
		scalePerZoomLevel: 2,
		zoomStepDuration: 0,
		invertMouseWheel: true,
		friction: 0,
		haltSpeed: 0
		//zoomOnMouseWheel: false
	};

	// The panzoom model should initialle be empty; it is initialized by the <panzoom>
	// directive. It can be used to read the current state of pan and zoom. Also, it will
	// contain methods for manipulating this state.
	$scope.panzoomModel = {};
}]);

// For navigation top bar
myMod.controller('TopBar', ['$scope',function ($scope) {
	$scope.manifest = chrome.runtime.getManifest();
}]);

// About page
myMod.controller('AboutPage', ['$scope',function ($scope) {
	$scope.manifest = chrome.runtime.getManifest();
}]);
