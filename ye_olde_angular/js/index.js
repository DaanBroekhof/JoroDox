var myMod = angular.module('JoroDox', [
	'ui.bootstrap', 'ui.router', 'ui.layout', 'ui.tree',
	'panzoom', 'panzoomwidget', 'cfp.hotkeys',
	'modService', 'mapAnalyzeService', 'mapDrawService', 'pdxDataService', 'pdxScriptService', 'rendererService'
]);

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
		url: '/inspect/:path/:animationPath',
		controller: 'FileInspect',
		resolve: {
			node: function ($stateParams, modService) {
				return modService.data.fileSystem.byPath[$stateParams.path];
			},
			animation: function ($stateParams, modService) {
				if ($stateParams.animationPath)
					return modService.data.fileSystem.byPath[$stateParams.animationPath];
				else
					return null;
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
		url: '/inspect/history/provinces',
	});
	$stateProvider.state({
		name: 'inspect.countriesHistory',
		templateUrl: 'content.inspect.countriesHistory.html',
		url: '/inspect/history/countries',
	});
}]).config(['$urlRouterProvider', function ($urlRouterProvider) {
	$urlRouterProvider.otherwise("/inspect")
}]);

// File inspector
myMod.controller('FileInspect', function ($scope, node, animation, modService, pdxDataService, pdxScriptService, $timeout, rendererService, $state, $stateParams) {
	$scope.node = node;
	$scope.loading = true;
	$scope.showJson = false;
	$scope.viewScene = null;
	$scope.image = null;

	modService.setCurrent($scope.node);

	$scope.Math = window.Math;

	$scope.pdxShaders = [
   		'PdxMeshStandard',
		'PdxMeshColor',
		'PdxMeshTextureAtlas',
		'PdxMeshSnow',
		'PdxMeshAlphaBlend',
		'PdxMeshAlphaBlendNoZWrite',
		'PdxMeshStandard_NoFoW_NoTI',
		'Collision',
		'JdxMeshShield',
		'JdxMeshShieldTextureAtlas',
	];

	$scope.pdxShaderDescriptions = {
		'PdxMeshStandard': '[EU4 + CK2] The default not-transparent texture shader.',
		'PdxMeshColor': '[EU4 + CK2] Shader which can blend the three \'national\' colors of the units country into the texture via the specular texture.',
		'PdxMeshTextureAtlas': '[EU4 + CK2] Shader which blends the texture with an image of the units country\'s flag.',
		'PdxMeshSnow': '[EU4 only] Shader which will add snow on top facing surfaces, when in a snowy location.',
		'PdxMeshAlphaBlend': '[EU4 only] Shader which will allow transparency via the alpha channel of the diffuse texture.',
		'PdxMeshAlphaBlendNoZWrite': '[EU4 only] A slower transparency shader with less transparency order glitches.',
		'PdxMeshStandard_NoFoW_NoTI': '[EU4 only] Shader for objects which should never be hidden by Fog of War or Terra Incognita.',
		'Collision': '[EU4 + CK2] \'Shader\' which will not render the mesh, but instead use it to check for (input) collision checking. (ie the clickable space of the item)',
		'JdxMeshShield': '[CK2-JoroDox] Model always faces the player, and slightly scaled differently on zoom level. JodoDox CK2 Shader extension required!',
		'JdxMeshShieldTextureAtlas': '[CK2-JoroDox] Custom PdxMeshTextureAtlas shader, which always faces the player, and scaled differently. JodoDox CK2 Shader extension required!',
	};

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
		$scope.meshes = [];
		$scope.meshToRender = [];
		$scope.selectedAnimation = null;
		$scope.textureFiles = [];

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

		var findTextures = function (folder, basePath) {
			if (!basePath)
				basePath = folder.path +'/';
			for (var i = 0; i < folder.files.length; i++)
			{
				if (folder.files[i].fileType == 'image-dds')
				{
					$scope.textureFiles.push(folder.files[i].path.replace(basePath, ''));
				}
			}
			for (var i = 0; i < folder.folders.length; i++)
				findTextures(folder.folders[i], basePath);
		};
		findTextures(node.parent);

		$scope.$watch('selectedAnimation', function(newValue, oldValue) {
			$scope.loadAnimation(newValue);
		});

		$scope.$watch('meshes', function(newValue, oldValue) {
			for (var i = 0; i < $scope.meshes.length; i++)
			{
				rendererService.updatePdxMesh($scope.meshToRender[i]);
			}
		}, true);

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

		$scope.savePdxMesh = function() {
			var buffer = pdxDataService.writeToBuffer($scope.node.treeData);

			$scope.loading = true;

			return modService.writeFileBuffer($scope.node.path, buffer, true).then(function () {
				$scope.loading = false;
			}).then(function () {
				modService.loadFileNodeDirectory($scope.node.parent).then(function () {
					$state.reload();

					return modService.showMessage({title: 'Mesh data updated.', text: 'Mesh data saved to `'+ $scope.node.path +'`'});
				});

			});
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

							for (var i = 0; i < viewObject.meshes.length; i++)
							{
								var mesh = viewObject.meshes[i];

								$scope.meshes.push({
									name: mesh.name,
									pdxMaterial: mesh.pdxData.props.material.props,
								});
								$scope.meshToRender[$scope.meshes.length - 1] = mesh;
							}

							if (animation)
							{
								for (var i = 0; i < $scope.animations.length; i++)
									if ($scope.animations[i].node.path == animation.path)
										$scope.selectedAnimation = $scope.animations[i];

								$stateParams.animationPath = null;
							}

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
		$scope.selectedAnimations = [];
		$scope.selectMultipleAnimations = true;

		$scope.$watchCollection('selectedAnimations', function(newValues, oldValues) {
			if ($scope.viewScene && $scope.viewScene.viewConfig.viewObject)
			{
				for (var i = 0; i < oldValues.length; i++)
				{
					oldValues[i].animation.stop();
					oldValues[i].animation.root.pose();
				}
				for (var i = 0; i < newValues.length; i++)
				{
					newValues[i].animation.play();
				}
			}
		});

		$scope.toggleSelectedAnimation = function (animation) {
			var index = $scope.selectedAnimations.indexOf(animation);
			if (index == -1)
				$scope.selectedAnimations.push(animation);
			else
				$scope.selectedAnimations.splice(index, 1);
		};

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
	else if (node.fileType == 'json')
	{
		$scope.animations = [];
		$scope.selectedAnimations = [];
		$scope.selectMultipleAnimations = true;

		$scope.$watchCollection('selectedAnimations', function(newValues, oldValues) {
			if ($scope.viewScene && $scope.viewScene.viewConfig.viewObject)
			{
				for (var i = 0; i < oldValues.length; i++)
				{
					oldValues[i].animation.stop();
					oldValues[i].animation.root.pose();
				}
				for (var i = 0; i < newValues.length; i++)
				{
					newValues[i].animation.play();
				}
			}
		});

		$scope.toggleSelectedAnimation = function (animation) {
			var index = $scope.selectedAnimations.indexOf(animation);
			if (index == -1)
				$scope.selectedAnimations.push(animation);
			else
				$scope.selectedAnimations.splice(index, 1);
		};

		rendererService.createViewScene(document.getElementById('3dview'), 800, 600).then(function (viewScene) {
			$scope.viewScene = viewScene;
			modService.getFileText(node.path).then(function (text) {
				rendererService.loadThreeJson(text, node.parent.path).then(function (viewObject) {
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

	$scope.convertToCollada = function () {
		$scope.loading = true;

		var colladaData = rendererService.convertToColladaData($scope.viewScene.viewConfig.viewObject);
		var colladaXml = rendererService.convertToColladaXml(colladaData);
		var newFile = $scope.node.path.replace('.mesh', '-export.dae');

		modService.writeFileBuffer(newFile, colladaXml, true).then(function () {
			$scope.loading = false;
		}).then(function () {
			modService.loadFileNodeDirectory($scope.node.parent).then(function () {
				modService.getFileNodeByPath(newFile).then(function(newNode) {
					$state.go('inspect.file', {path: newNode.path, 'node': newNode});
					return modService.showMessage({title: 'Model converted to Collada format', text: 'Model saved to `'+ newFile +'`'});
				});
			});
		});
	}

	$scope.convertMultipleToPdxAnim = function () {
		$scope.loading = true;
		var pdxdata = rendererService.convertMultipleToPdxAnim($scope.selectedAnimations, $scope.viewScene.scene);
		var buffer = pdxDataService.writeToBuffer(pdxdata);

		var newFile = $scope.node.path.replace('.dae', '_anim.anim').replace('.json', '_anim.anim');
		var meshFile = $scope.node.path.replace('.dae', '.mesh').replace('.json', '.mesh');

		return modService.writeFileBuffer(newFile, buffer, true).then(function () {
			$scope.loading = false;
		}).then(function () {
			modService.loadFileNodeDirectory($scope.node.parent).then(function () {
				modService.getFileNodeByPath(meshFile).then(function(meshNode) {
					$state.go('inspect.file', {path: meshNode.path, 'node': meshNode, 'animationPath': newFile});
				});

				return modService.showMessage({title: 'Animation converted to PDX animation format', text: 'Animation saved to `'+ newFile +'`'});
			});

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
		else if (node.path == 'history/countries')
			$state.go('inspect.countriesHistory');
		else
			$state.go('inspect.file', {path: node.path, 'node': node}, {inherit: false});
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
		modService.loadModData(modData.id).then(function () {
			$state.go('inspect');
		});
	};

	$scope.loadPreviousModData();
}]);

//Provinces History Tool
myMod.controller('ProvincesHistoryTool', ['$scope', 'modService', 'mapDrawService', '$timeout', function ($scope, modService, mapDrawService, $timeout) {
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

		modService.getData(modService.data.history.provinces).then(function (dataNode) {
			$scope.output = '';
			$scope.messages = 'Found '+ dataNode.byId.length +' province histories' + "\n";
			console.log(dataNode);
			$scope.loading = false;
		}, modService.errorCallback)
		/*
		modService.getFileNodeByPath('history/provinces').then(function (dataNode) {
			return modService.loadFileNodeDirectory(dataNode).then(function (dataNode) {
				$scope.output = '';
				$scope.messages = 'Found '+ dataNode.files.length +' province histories' + "\n";
				$scope.loading = false;
			});
		});
		*/
	};

	$scope.createFiles = function () {
		return modService.getData(modService.data.map.colorMapping).then(function (mappings) {
			$scope.output = '﻿l_english:'+"\n";
			$scope.outputTitle = 'prov_names_l_english.yml';
			angular.forEach(mappings.byId, function (mapping) {
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
					text.join("\n")
				);
			});
		}, modService.errorCallback);
	};

	$scope.getProvincesFiles();
}]);


//Countries History / Setting Tool
myMod.controller('CountriesHistoryTool', ['$scope', 'modService', 'pdxScriptService', '$timeout', function ($scope, modService, pdxScriptService, $timeout) {
	$scope.colors = null;
	$scope.messages = '';
	$scope.output = '';
	$scope.scrollImage = null;
	$scope.loading = false;
	$scope.outputTitle = 'Output';
	$scope.messagesTitle = 'Messages';

	$scope.updateCountriesFromCsv = function () {
		return modService.getFileText('jorodox/countries.csv').then(function (text) {
			var csvResult = Papa.parse(text, {header: true});

			var tagList = {};

			angular.forEach(csvResult.data, function (country) {
				tagList[country.Tag] = 'countries/'+ country.Tag +' - '+ country['Country/Union'] +'.txt';

				var countryHistoryData = {
					government: country['Government'],
					mercantilism: 0.25,
					primary_culture: 'germanic',
					religion: country['Ideology'],
					technology_group: 'western',
				};
				modService.writeFileText(
					'history/'+ tagList[country.Tag],
					pdxScriptService.writeData(countryHistoryData),
					false,
					true
				);

				var countryData = {
					graphical_culture: 'westerngfx',
					color: [country['Color R'], country['Color G'], country['Color B']],
					historical_score: 0,
					historical_idea_groups: [
						'economic_ideas',
						'offensive_ideas',
						'exploration_ideas',
						'defensive_ideas',
						'administrative_ideas',
						'maritime_ideas',
						'quality_ideas',
						'innovativeness_ideas',
					],
					historical_units: ['western_medieval_infantry', 'western_medieval_knights', 'western_men_at_arms'],
					monarch_names: {'Tester #0': 100},
					leader_names: ['McTester'],
					ship_names: ['MSS Tester'],
					army_names: ['TesterSquad'],
					fleet_names: ['Test Armada-o-$PROVINCE$'],
				};
				modService.writeFileText(
					'common/'+ tagList[country.Tag],
					pdxScriptService.writeData(countryData),
					false,
					true
				);
			});

			$scope.outputTitle = 'common/country_tags/YOUR_countries.txt';

			$scope.output = pdxScriptService.writeData(tagList);;
		});
	};

	$scope.updateProvincesFromCsv = function () {
		return modService.getData(modService.data.localisation).then(function(){
			modService.getFileText('jorodox/provinces.csv').then(function (text) {
				var csvResult = Papa.parse(text, {header: true});

				var provLocs = modService.data.localisation.byFile['localisation/prov_names_l_english.yml'].data.l_english;

				angular.forEach(csvResult.data, function (province) {
					var foundId = 0;
					angular.forEach(provLocs, function (value, key) {
						if (value == province['Name'])
							foundId = key.replace('PROV', '');
					})
					if (foundId == 0)
					{
						$scope.messages += 'No name found for "' + province['Name'] +'"' + "\n";
						return;
					}

					var fileName = 'provinces/'+ foundId +' - '+ province['Name'] +'.txt';

					var provinceHistoryData = {
						trade_goods: 'unknown',
						hre: 'no',
						base_tax: province['BaseTax'],
						manpower: province['Manpower'],
						discovered_by: 'western',
						native_size: '0',
						native_ferocity: '0',
						native_hostileness: '0',
						religion: province['Ideology'],
					};
					if (province['Controller 2015 Tag'])
					{
						provinceHistoryData.controller = province['Controller 2015 Tag'];
						provinceHistoryData.owner = province['Controller 2015 Tag'];
					}
					if (province['Cores 2015'])
						provinceHistoryData.add_core = province['Cores 2015'];

					modService.writeFileText(
						'history/'+ fileName,
						pdxScriptService.writeData(provinceHistoryData),
						false,
						true
					);
				});
			});
		});
	};
}]);

// MapCheck
myMod.controller('MapCheck', ['$scope', 'modService', 'mapDrawService', '$timeout', '$q', '$rootScope', function ($scope, modService, mapDrawService, $timeout, $q, $rootScope) {

	// Map analytics data
	$scope.analytics = null;
	// Map image
	$scope.scrollImage = null;
	// If currently doing stuff
	$scope.loading = false;

	$scope.mapWidth = 2816;
	$scope.mapHeight = 1024;

	modService.getFileNodeByPath('map').then(function (node) {
		modService.setCurrent(node);
	});

	// Current map view
	$scope.view = 'provinces';

	$scope.dataViewInfo = {type: 'province', title: '', text: '', province: null};
	$scope.dataViewLeft = $scope.dataViewInfo;


	$scope.labelView = 'none';
	$scope.labelViews = [
		'none',
		'provinceName',
		'provinceId',
		'countryTag',
		'countryName',
		'countryReligion',
		'countryGovernment',
	];

	$scope.hoveredProvinceHistory = null;

	// Display options
	$scope.options = {
		showGrid: true,
		showLabels: false,
		highLight: true,
		showTerrainOverlay: true,
		selectArea: true,//false,
	};

	$scope.views = [
		'provinces',
		'countries',
		'baseTax',
		'manpower',
		'climate',
	];

	$scope.messages = '';
	$scope.output = '';
	$scope.outputTitle = 'Output';
	$scope.messagesTitle = 'Messages';
	$scope.closestArea = 25;

	$scope.historyData = null;

	$scope.selectedProvinces = [];
	$scope.selectedAreas = [];

	$scope.labels = [];

	$scope.hasSeasPng = false;

	$scope.hoverEffect = 'outlineAreaSolo';
	$scope.hoverEffectClear = 'outlineAreaSolo';
	$scope.selectEffect = 'inlineProvinceSolo';
	$scope.selectEffectClear = 'fillProvinceSolo';

	$scope.hoverCanvas = document.getElementById('PanZoomCanvasHover');
	$scope.selectCanvas = document.getElementById('PanZoomCanvasSelect');
	$scope.mapCanvas = document.getElementById('PanZoomCanvas');

	$scope.overlayImage = null;
	modService.getImageByPath('map/terrain/colormap.png').then(function (img) {
		$scope.overlayImage = img.src;
	})

	modService.fileExists('map/seas.png').then(function (exists) {
		$scope.hasSeasPng = exists;
	});

	$scope.$watch('view', function(newValue, oldValue) {
		$scope.loading = true;
		$scope.hoverCanvas = document.getElementById('PanZoomCanvasHover');
		$scope.selectCanvas = document.getElementById('PanZoomCanvasSelect');
		$scope.mapCanvas = document.getElementById('PanZoomCanvas');

		modService.getData(modService.data.map.environment).then(function (environment) {
			if (environment.default.data.width)
			{
				$scope.mapWidth = environment.default.data.width;
				$scope.mapHeight = environment.default.data.height;
			}

			if (newValue == 'provinces')
			{
				modService.getData(modService.data.map.provinces.image).then(function (data) {
					return modService.getImage(data);
				}).then(function (image) {
					$scope.scrollImage = image.src;

					if ($scope.mapWidth != image.width)
					{
						$scope.mapWidth = image.width;
						$scope.mapHeight = image.height;
						mapDrawService.clearCanvasCache($scope.mapCanvas);
					}
					mapDrawService.clearCanvas($scope.mapCanvas);
					mapDrawService.drawCanvas($scope.mapCanvas);


					$scope.loading = false;
				}, modService.errorCallback);
			}
			else if (newValue == 'seas')
			{
				mapDrawService.clearCanvas($scope.mapCanvas);
				modService.getData(modService.data.map.seas.image).then(function (data) {
					return modService.getImage(data);
				}).then(function (image) {
					$scope.scrollImage = image.src;

					if ($scope.mapWidth != image.width)
					{
						$scope.mapWidth = image.width;
						$scope.mapHeight = image.height;
						mapDrawService.clearCanvasCache($scope.mapCanvas);
					}
					mapDrawService.clearCanvas($scope.mapCanvas);

					$scope.loading = false;
				}, modService.errorCallback);
			}
			else if (newValue == 'countries')
			{
				modService.getData(modService.data.map.environment).then(function (dataNode) {
					mapDrawService.colorCanvas($scope.mapCanvas, [200, 200, 200, 255]);
					// CK2
					if (dataNode.default.data.sea_zones)
					{
						for (var i; i < dataNode.default.data.sea_zones.length; i++)
							mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_zones[i], [51, 157, 255, 255], true);
					}
					if (dataNode.default.data.major_rivers)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.major_rivers, [6, 115, 249, 255], true);
					// EU4
					if (dataNode.default.data.sea_starts)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_starts, [51, 157, 255, 255], true);
					if (dataNode.default.data.lakes)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.lakes, [6, 115, 249, 255], true);

					//mapDrawService.fillProvinces($scope.mapCanvas, []);
				}).then(function () {
					return modService.getData(modService.data.countries.tags).then(function (countryTags) {
						return modService.getData(modService.data.history.provinces).then(function (provinces) {
							return modService.getData(modService.data.countries.info).then(function (countries) {

								angular.forEach(provinces.byId, function (province) {
									if (province._country)
									{
										mapDrawService.fillProvinces($scope.mapCanvas, [province], [province._country.data.data.color[0], province._country.data.data.color[1], province._country.data.data.color[2], 255], true);
									}
								})

								return mapDrawService.fillProvinces($scope.mapCanvas, []).then(function () {
									$scope.loading = false;
								});
							});
						});
					});
				}, modService.errorCallback);
			}
			else if (newValue == 'countryReligion')
			{
				modService.getData(modService.data.map.environment).then(function (dataNode) {
					mapDrawService.colorCanvas($scope.mapCanvas, [200, 200, 200, 255]);
					// CK2
					if (dataNode.default.data.sea_zones)
					{
						for (var i; i < dataNode.default.data.sea_zones.length; i++)
							mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_zones[i], [51, 157, 255, 255], true);
					}
					if (dataNode.default.data.major_rivers)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.major_rivers, [6, 115, 249, 255], true);
					// EU4
					if (dataNode.default.data.sea_starts)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_starts, [51, 157, 255, 255], true);
					if (dataNode.default.data.lakes)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.lakes, [6, 115, 249, 255], true);

					//mapDrawService.fillProvinces($scope.mapCanvas, []);
				}).then(function () {
					return modService.getData(modService.data.countries.tags).then(function (countryTags) {
						return modService.getData(modService.data.history.provinces).then(function (provinces) {
							return modService.getData(modService.data.countries.info).then(function (countries) {

								angular.forEach(provinces.byId, function (province) {
									if (province._country)
									{
										mapDrawService.fillProvinces($scope.mapCanvas, [province], [province._country.data.data.color[0], province._country.data.data.color[1], province._country.data.data.color[2], 255], true);
									}
								})

								return mapDrawService.fillProvinces($scope.mapCanvas, []).then(function () {
									$scope.loading = false;
								});
							});
						});
					});
				}, modService.errorCallback);
			}
			else if (newValue == 'baseTax')
			{
				var baseTaxColors = [
					'#7A0063',
					'#6A0183',
					'#3E038D',
					'#0D0596',
					'#0839A0',
					'#0A7AA9',
					'#0DB2A5',
					'#11BC6E',
					'#14C632',
					'#3ECF18',
					'#8AD91B',
					'#DAE220',
					'#ECA824',
					'#F56329',
					'#FF2E41',
					'#FF2E41',
					'#FF2E41',
					'#FF2E41',
					'#FF2E41',
					'#FF2E41',
				];

				modService.getData(modService.data.map.environment).then(function (dataNode) {
					mapDrawService.colorCanvas($scope.mapCanvas, [200, 200, 200, 255]);
					// CK2
					if (dataNode.default.data.sea_zones)
					{
						for (var i; i < dataNode.default.data.sea_zones.length; i++)
							mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_zones[i], [51, 157, 255, 255], true);
					}
					if (dataNode.default.data.major_rivers)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.major_rivers, [6, 115, 249, 255], true);
					// EU4
					if (dataNode.default.data.sea_starts)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_starts, [51, 157, 255, 255], true);
					if (dataNode.default.data.lakes)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.lakes, [6, 115, 249, 255], true);

					//mapDrawService.fillProvinces($scope.mapCanvas, []);
				}).then(function () {
					return modService.getData(modService.data.countries.tags).then(function (countryTags) {
						return modService.getData(modService.data.history.provinces).then(function (provinces) {
							return modService.getData(modService.data.countries.info).then(function (countries) {

								angular.forEach(provinces.byId, function (province) {
									if (province.data.data.base_tax)
									{
										mapDrawService.fillProvinces($scope.mapCanvas, [province], baseTaxColors[province.data.data.base_tax], true);
									}
								})

								return mapDrawService.fillProvinces($scope.mapCanvas, []).then(function () {
									$scope.loading = false;
								});
							});
						});
					});
				}, modService.errorCallback);
			}
			else if (newValue == 'manpower')
			{
				var baseTaxColors = [
					'#7A0063',
					'#6A0183',
					'#3E038D',
					'#0D0596',
					'#0839A0',
					'#0A7AA9',
					'#0DB2A5',
					'#11BC6E',
					'#14C632',
					'#3ECF18',
					'#8AD91B',
					'#DAE220',
					'#ECA824',
					'#F56329',
					'#FF2E41',
					'#FF2E41',
					'#FF2E41',
					'#FF2E41',
					'#FF2E41',
					'#FF2E41',
				];

				modService.getData(modService.data.map.environment).then(function (dataNode) {
					mapDrawService.colorCanvas($scope.mapCanvas, [200, 200, 200, 255]);
					// CK2
					if (dataNode.default.data.sea_zones)
					{
						for (var i; i < dataNode.default.data.sea_zones.length; i++)
							mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_zones[i], [51, 157, 255, 255], true);
					}
					if (dataNode.default.data.major_rivers)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.major_rivers, [6, 115, 249, 255], true);
					// EU4
					if (dataNode.default.data.sea_starts)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_starts, [51, 157, 255, 255], true);
					if (dataNode.default.data.lakes)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.lakes, [6, 115, 249, 255], true);

					//mapDrawService.fillProvinces($scope.mapCanvas, []);
				}).then(function () {
					return modService.getData(modService.data.countries.tags).then(function (countryTags) {
						return modService.getData(modService.data.history.provinces).then(function (provinces) {
							return modService.getData(modService.data.countries.info).then(function (countries) {

								angular.forEach(provinces.byId, function (province) {
									if (province.data.data.manpower)
									{
										mapDrawService.fillProvinces($scope.mapCanvas, [province], baseTaxColors[province.data.data.manpower], true);
									}
								})

								return mapDrawService.fillProvinces($scope.mapCanvas, []).then(function () {
									$scope.loading = false;
								});
							});
						});
					});
				}, modService.errorCallback);
			}
			else if (newValue == 'climate')
			{
				modService.getData(modService.data.map.environment).then(function (dataNode) {
					mapDrawService.colorCanvas($scope.mapCanvas, [200, 200, 200, 255]);
					// CK2
					if (dataNode.default.data.sea_zones)
					{
						for (var i; i < dataNode.default.data.sea_zones.length; i++)
							mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_zones[i], [51, 157, 255, 255], true);
					}
					if (dataNode.default.data.major_rivers)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.major_rivers, [6, 115, 249, 255], true);
					// EU4
					if (dataNode.default.data.sea_starts)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.sea_starts, [51, 157, 255, 255], true);
					if (dataNode.default.data.lakes)
						mapDrawService.fillProvinces($scope.mapCanvas, dataNode.default.data.lakes, [6, 115, 249, 255], true);

					var climateToColor = {
						'tropical': [43, 251, 2, 255],
						'arid': [251, 242, 2, 255],
						'arctic': [255, 255, 255, 255],
						'severe_winter': [200, 162, 149, 255],
						'normal_winter': [148, 169, 115, 255],
						'mild_winter': [132, 189, 42, 255],
						'impassable': [100, 100, 100, 255],
					}
					for (var i = 0; i < dataNode.climate.subNodes.length; i++)
					{
						var climate = dataNode.climate.subNodes[i];
						if (climateToColor[climate.name])
							mapDrawService.fillProvinces($scope.mapCanvas, climate.data, climateToColor[climate.name], true);
						else
							console.log(climate.name)
					}

					mapDrawService.fillProvinces($scope.mapCanvas, []).then(function () {
						$scope.loading = false;
					});

				}, modService.errorCallback);
			}

			if ($scope.options.highLight)
			{
				$scope.options.highLight = false;
				$scope.options.highLight = true;

				modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
					$scope.areaByProvinceId = dataNode.areaByProvinceId;
				}, modService.errorCallback);
			}
		}, modService.errorCallback);
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

				if ($scope.mapWidth != image.width)
				{
					$scope.mapWidth = image.width;
					$scope.mapHeight = image.height;
					mapDrawService.clearCanvasCache($scope.mapCanvas);
				}

				$scope.loading = false;

			}, modService.errorCallback);
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
			modService.getData(source).then(function (dataNode) {
				$scope.analytics = dataNode.analytics;
				$scope.loading = false;
			}, modService.errorCallback);
		}
		else
		{
			$scope.analytics = null;
		}
	});

	$scope.inverseMapCssScale = function (zoomLevel) {
		return (1 / Math.pow(2, zoomLevel - 5))*1.5;
	};

	$scope.$watch('labelView', function(newValue, oldValue) {
		if (newValue == 'none')
		{
			$scope.labels = [];
		}
		else if (newValue == 'provinceName')
		{
			modService.getDataMultiple([
				modService.data.map.areas,
				modService.data.history.provinces,
				modService.data.countries.tags,
				modService.data.countries.info,
				modService.data.localisation,
			]).then(function () {
				$scope.labels = [];
				var labelWidthAvg = 12;
				var labelHeightAvg = 8;
				angular.forEach(modService.data.map.areas.list, function (area) {
					if (area._province && area._province._localisation)
					{
						$scope.labels.push({
							x: area.extentMin[0] + (area.extentMax[0] - area.extentMin[0])/2 - labelWidthAvg,
							y: area.extentMin[1] + (area.extentMax[1] - area.extentMin[1])/2 - labelHeightAvg,
							width: 0,
							height: 0,
							area: area,
							text: area._province && area._province._localisation ? area._province._localisation.l_english : '',
							message: '',
						});
					};
				});
			}, modService.errorCallback);
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
		}, modService.errorCallback);
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
		$scope.dataViewLeft.type = 'output';
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
		}, modService.errorCallback);
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

			// We are not multi-selecting & we've moved - don't trigger 'click'
			if (!event.ctrlKey && (diff > 10 || diff < -10))
				return;
		}
		if ($scope.analytics && $scope.options.selectArea && event.button == 0)
		{
			return modService.getData(modService.data.map.provinceMapping).then(function (dataNode) {
				var area = mapDrawService.getAreaFromCoords($scope.analytics, event.offsetX, event.offsetY);

				if (!event.ctrlKey)
				{
					// Select one
					$scope.selectedAreas.length = 0;
					for (var i = 0; i < $scope.selectedProvinces.length; i++)
						mapDrawService[$scope.selectEffectClear]($scope.selectCanvas, $scope.selectedProvinces[i], [0, 0, 0, 0]);
					$scope.selectedProvinces.length = 0;
				}

				var index = $scope.selectedAreas.indexOf(area);
				if (index != -1)
					$scope.selectedAreas.splice(index, 1);
				else
					$scope.selectedAreas.push(area);

				var provinceId = dataNode.areaByProvinceId.indexOf(area);
				var index = $scope.selectedProvinces.indexOf(provinceId);
				if (index != -1)
				{
					$scope.selectedProvinces.splice(index, 1);
					mapDrawService[$scope.selectEffectClear]($scope.selectCanvas, provinceId, [0, 0, 0, 0]);
				}
				else
				{
					$scope.selectedProvinces.push(provinceId);
					mapDrawService[$scope.selectEffect]($scope.selectCanvas, provinceId, [128, 0, 0, 256]);
				}

				$scope.refreshSelection();
			}, modService.errorCallback);
		}
	};

	$scope.refreshSelection = function () {
		if ($scope.selectedProvinces.length > 0)
		{
			$scope.dataViewLeft.multiProvinces = $scope.selectedProvinces;

			modService.getData(modService.data.history.provinces).then(function (provinces) {
				return modService.getData(modService.data.map.provinceMapping).then(function (mapping) {

					var provinceId = $scope.selectedProvinces[0];
					var province = provinces.byId[provinceId];

					$scope.dataViewInfo.province = province;
					modService.getData(modService.data.localisation);

					if (province)
					{
						modService.getFileText(province.file.path).then(function (text) {
							$scope.dataViewInfo.provinceText = text;
						});
					}
					else
					{
						$scope.dataViewInfo.provinceText = '';
					}

					var multiProvince = {
						data: {},
						multiData: {},
						provinces: [],
						provinceIds: [],
						provinceNames: [],
						hasData: {},
					};

					angular.forEach($scope.selectedProvinces, function (provinceId) {
						var province = provinces.byId[provinceId];
						if (province)
						{
							multiProvince.provinces.push(province);
							multiProvince.provinceIds.push(provinceId);
							if (province._localisation && province._localisation.l_english)
								multiProvince.provinceNames.push(province._localisation.l_english);

							angular.forEach(province.data.data, function (value, key) {
								if (!multiProvince.multiData[key])
									multiProvince.multiData[key] = [];

								multiProvince.multiData[key].push(value);

								if (multiProvince.data[key] == undefined)
									multiProvince.data[key] = value;
								else if (multiProvince.data[key] != value)
									multiProvince.data[key] = null;

								if (multiProvince.multiData[key].length != multiProvince.provinces.length)
									multiProvince.data[key] = null;

								if (multiProvince.data[key] != null && multiProvince.data[key] != undefined)
									multiProvince.hasData[key] = true;
								else
									multiProvince.hasData[key] = false;
							});
							angular.forEach(province, function (value, key) {
								if (key[0] != '_')
									return;

								if (angular.isObject(value) && !('_type' in value))
									return;

								if (!multiProvince.multiData[key])
									multiProvince.multiData[key] = [];

								if (!angular.isObject(value))
									value = null;
								else if (value._type == 'boolean')
									value = 1;
								else if (value._type == 'namedSet')
									value = value.name;
								else if (value._type == 'multipleNamed')
								{
									var newValue = [];
									for (var i = 0; i < value.length; i++)
										newValue.push(value[i].name);
									value = newValue.join(' ');
								}

								multiProvince.multiData[key].push(value);

								if (multiProvince.data[key] === undefined)
									multiProvince.data[key] = value;
								else if (multiProvince.data[key] != value)
									multiProvince.data[key] = null;

								if (multiProvince.multiData[key].length != multiProvince.provinces.length)
									multiProvince.data[key] = null;

								if (multiProvince.data[key] != null && multiProvince.data[key] != undefined)
									multiProvince.hasData[key] = true;
								else
									multiProvince.hasData[key] = false;
							});
						}
					});

					$scope.dataViewLeft.multiProvince = multiProvince;

					if ($scope.selectedProvinces.length > 1)
					{
						if ($scope.dataViewLeft.type == 'province')
							$scope.dataViewLeft.type = 'multiProvince';
					}
					else
					{
						if ($scope.dataViewLeft.type == 'multiProvince')
							$scope.dataViewLeft.type = 'province';
					}
				});
			});
		}
		else
		{
			$scope.selectedProvinceHistory = null;
		}
	};

	$scope.hoverArea = null;
	$scope.toggleAreaHover = function (event) {
		if (!$scope.analytics)
			return;

		// Undo ctrl-effect if window had lost focus
		if (!event.ctrlKey && !$rootScope.panzoomConfig.panOnClickDrag)
			$rootScope.panzoomConfig.panOnClickDrag = true;

		if ($scope.startDown)
		{
			var diff = ($scope.startDown.pageX + $scope.startDown.pageY) - (event.pageX + event.pageY);

			if (diff > 5 || diff < -5)
				return;
		}

		var currentArea = mapDrawService.getAreaFromCoords($scope.analytics, event.offsetX, event.offsetY);

		if (currentArea != $scope.hoverArea)
		{
			// Remove current
			if ($scope.hoverArea)
			{
				mapDrawService[$scope.hoverEffectClear]($scope.hoverCanvas, $scope.hoverArea, [0, 0, 0, 0]);
				$scope.hoverArea._hovered = false;
			}

			// Highlight new
			$scope.hoverArea = currentArea;
			if (!currentArea)
			{
				$scope.mapHint = '';
				$scope.hoveredProvinceHistory = null;
			}
			else
			{
				$scope.hoverArea._hovered = true;
			}

			mapDrawService[$scope.hoverEffect]($scope.hoverCanvas, $scope.hoverArea, [0, 0, 128, 256]);

			modService.getProvinceByArea(currentArea).then(function (province) {
				if (province)
					$scope.mapHint = province.file.baseName;
				$scope.hoveredProvinceHistory = province;
			});
		}
	};

	$scope.saveDataNode = function (dataNode) {
		modService.saveData(dataNode).then(function () {
			if ($scope.labelView != 'none')
			{
				var currentView = $scope.labelView;
				$scope.labelView = 'none';
				$timeout(function() {
					$scope.labelView = currentView;
				});
			}
			if ($scope.view != 'none')
			{
				var currentView = $scope.view;
				$scope.view = 'none';
				$timeout(function() {
					$scope.view = currentView;
				});
			}
			$scope.refreshSelection();
		}, modService.errorCallback);
	};

	$scope.saveMultiDataNode = function (multiData) {
		var promises = [];
		var environmentData = modService.data.map.environment;
		angular.forEach(multiData.provinces, function (province) {

			var saveNodes = [];
			angular.forEach(multiData.hasData, function (hasValue, key) {
				if (hasValue)
				{
					if (key[0] == '_')
					{
						if (!environmentData[key])
							return;

						if (environmentData[key]._type == 'boolean')
						{
							var index = environmentData[key]._provinces.indexOf(province);
							if (index == -1 && multiData.data[key])
							{
								environmentData[key]._provinces.push(province);
								province[key] = environmentData[key];

								if (saveNodes.indexOf(environmentData) == -1)
									saveNodes.push(environmentData);
							}
							else if (index != -1 && !multiData.data[key])
							{
								environmentData[key]._provinces.splice(index, 1);
								province[key] = null;

								if (saveNodes.indexOf(environmentData) == -1)
									saveNodes.push(environmentData);
							}
						}
						else if (environmentData[key]._type == 'namedSet')
						{
							// Remove from current
							if (province[key])
							{
								var index = province[key]._provinces.indexOf(province);
								if (index != -1)
								{
									province[key]._provinces.splice(index, 1);
								}

								if (saveNodes.indexOf(environmentData) == -1)
									saveNodes.push(environmentData);
							}

							if (!multiData.data[key])
							{
								// Empty name = not longer in this set
								province[key] = null;
							}
							else
							{
								var node = environmentData[key]._nodeByName[multiData.data[key]];

								if (!node)
								{
									node = {type: 'property', name: multiData.data[key], value: []};
									environmentData[key].data[node.name] = node.value;
									node._provinces = [];
									node._node = environmentData[key]._node;
									environmentData[key]._nodeByName[node.name] = node;
								}

								node._provinces.push(province);

								if (saveNodes.indexOf(environmentData) == -1)
									saveNodes.push(environmentData);
							}
						}
						else if (environmentData[key]._type == 'multipleNamed')
						{
							var values = multiData.data[key].split(' ');

							for (var i = 0; i < values.length; i++)
							{
								var operator = values[i][0];
								var value = values[i].substr(1);

								if (operator != '+' && operator != '-')
								{
									operator = '+';
									value = values[i];
								}

								if (value === '')
									continue;

								var node = environmentData[key]._nodeByName[value];

								if (!node)
								{
									node = {type: 'property', name: value, value: []};
									environmentData[key].data[node.name] = node.value;
									node._provinces = [];
									node._node = environmentData[key]._node;
									environmentData[key]._nodeByName[node.name] = node;
								}

								if (operator == '+')
								{
									if (node._provinces.indexOf(province) == -1)
										node._provinces.push(province);
								}
								else if (operator == '-')
								{
									var index = node._provinces.indexOf(province);
									if (index != -1)
										node._provinces.splice(index, 1)
								}
							}
							if (saveNodes.indexOf(environmentData) == -1)
								saveNodes.push(environmentData);
						}
					}
					else
					{
						if (province.data.data[key] != multiData.data[key])
							changed = true

						province.data.data[key] = multiData.data[key];

						if (saveNodes.indexOf(province) == -1)
							saveNodes.push(province);
					}
				}
			}.bind(this));

			for (var i = 0; i < saveNodes.length; i++)
				promises.push(modService.saveData(saveNodes[i]));
		});

		$q.all(promises).then(function () {
			if ($scope.labelView != 'none')
			{
				var currentView = $scope.labelView;
				$scope.labelView = 'none';
				$timeout(function() {
					$scope.labelView = currentView;
				});
			}
			if ($scope.view != 'none')
			{
				var currentView = $scope.view;
				$scope.view = 'none';
				$timeout(function() {
					$scope.view = currentView;
				});
			}
			$scope.refreshSelection();
		});
	};


	$scope.compareWithDefinitions = function () {
		$scope.loading = true;
		$scope.output = '';
		$scope.messages = '';
		$scope.outputTitle = 'Merged `definition.csv`';
		$scope.labels = [];

		$scope.options.showLabels = true;
		$scope.view = 'provinces';
		$scope.dataViewLeft.type = 'output';

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
		}, modService.errorCallback);
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
myMod.controller('PanZoom', ['$scope', 'PanZoomService', 'hotkeys', '$rootScope', function ($scope, PanZoomService, hotkeys, $rootScope) {

	// The panzoom config model can be used to override default configuration values
	$rootScope.panzoomConfig = $scope.panzoomConfig = {
		zoomLevels: 10,
		neutralZoomLevel: 5,
		initialZoomLevel: 0,
		scalePerZoomLevel: 2,
		zoomStepDuration: 0,
		invertMouseWheel: true,
		friction: 0,
		haltSpeed: 0,
		panOnClickDrag: true,
		//zoomOnMouseWheel: false
	};

	hotkeys.bindTo($scope).add({
		combo: 'ctrl',
		description: 'Don\'t pan on map-drag.',
		action: 'keydown',
		callback: function (event, hotkey) {
			$scope.panzoomConfig.panOnClickDrag = false;
		},
    }).add({
		combo: 'ctrl',
		description: 'Don\'t pan on map-drag.',
		action: 'keyup',
		callback: function (event, hotkey) {
			$scope.panzoomConfig.panOnClickDrag = true;
		},
    });

	// The panzoom model should initialle be empty; it is initialized by the <panzoom>
	// directive. It can be used to read the current state of pan and zoom. Also, it will
	// contain methods for manipulating this state.
	$scope.panzoomModel = {};
}]);

// For navigation top bar
myMod.controller('TopBar', ['$scope', 'modService', function ($scope, modService) {
	$scope.manifest = chrome.runtime.getManifest();
	$scope.loadingStateText = '';

	$scope.$watch('modService.loadingState', function(newValue, oldValue) {
		$scope.loadingStateText = 'Loading: ';
		for (var p in newValue)
		{
			if (newValue.hasOwnProperty(p))
			{
				if (newValue[p])
					$scope.loadingStateText += p.replace('generate', '') +' ';
			}
		}
		if ($scope.loadingStateText == 'Loading: ')
			$scope.loadingStateText = '';
	}, true);
}]);

// About page
myMod.controller('AboutPage', ['$scope', function ($scope) {
	$scope.manifest = chrome.runtime.getManifest();
}]);
