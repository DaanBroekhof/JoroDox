var module = angular.module('modService', ['mapAnalyzeService']);

// A service representing a Mod

module.factory('modService', ['$rootScope', '$timeout', '$modal', '$q', 'mapAnalyzeService', function($rootScope, $timeout, $modal, $q, mapAnalyzeService) {

	var errorCallback = function (error) {
		var modalInstance = $modal.open({
			templateUrl: 'errorModal.html',
			controller: 'ErrorModal',
			resolve: {
				'error': function () {
					return error;
				}
			}
		});
	};

	var modServiceInstance = {
		'storage': null,
		data: null,
		defaultFileNode: {
			name: null,
			path: null,
			extension: null,
			fileType: null,
			metadata: null,
			dirLoaded: false,
			folders: [],
			files: [],
			count: 0,
			'depth': 0,
			parent: null,
			specialView: false,
			isFile: false,
			isDirectory: false,
			byName: {},
			dirVisible: false,
		},
		defaultData: {
			pathDisplayName: null,
			fileSystem: {
				root: null,
				byPath: {},
			},
			mod: {
				lastModified: null,
				sourceFiles: [''],
				sourceDataNodes: [],

				name: null,
				pathDisplayName: null,
				retainedRootFileEntry: null,
			},
			map: {
				provinces: {
					image: {
						lastModified: null,
						sourceFiles: ['map/provinces.bmp'],
						generateMethod: 'generateMapImage',
						mapSource: 'provinces',
						imageBlob: null,
						imageCacheName: 'map/provinces.bmp',
					},
					info: {
						lastModified: null,
						sourceFiles: ['map/provinces.bmp'],
						generateMethod: 'generateMapInfo',
						mapSource: 'provinces',
						analytics: null,
					},
					grid: {
						lastModified: null,
						sourceFiles: ['map/provinces.bmp'],
						generateMethod: 'generateMapGrid',
						mapSource: 'provinces',
						imageBlob: null,
						imageCacheName: 'map/provinces.bmp:grid',
					},
				},
				seas: {
					image: {
						lastModified: null,
						sourceFiles: ['map/seas.png'],
						generateMethod: 'generateMapImage',
						mapSource: 'seas',
						imageBlob: null,
						imageCacheName: 'map/seas.png',
					},
					info: {
						lastModified: null,
						sourceFiles: ['map/seas.png'],
						generateMethod: 'generateMapInfo',
						mapSource: 'seas',
						analytics: null,
					},
					grid: {
						lastModified: null,
						sourceFiles: ['map/seas.png'],
						generateMethod: 'generateMapGrid',
						mapSource: 'seas',
						imageBlob: null,
						imageCacheName: 'map/seas.png:grid',
					},
				},
				colorMapping: {
					lastModified: null,
					sourceFiles: [], //'map/definition.csv'
					sourceDataNodes: [],
					generateMethod: 'generateMapColorMapping',

					byId: [],
					byColor: [],
				},
			}
		},
		'pathToFileEntry': {},

		'errorCallback': errorCallback,
		'modRootDir': null,
		'rootNode': null,
		'nodeByPath': {},
		'entries': [],
		'lastEntryId': -1,
		'mapColorMapping': [],
		'mapColorMappingByColor': [],

		'imageCache': {},

		'encodings': {
			// Windows code page 1252 Western European
		    //
			cp1252: '\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f\u20ac\ufffd\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\ufffd\u017d\ufffd\ufffd\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\ufffd\u017e\u0178\xa0\xa1\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xab\xac\xad\xae\xaf\xb0\xb1\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xbb\xbc\xbd\xbe\xbf\xc0\xc1\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xcb\xcc\xcd\xce\xcf\xd0\xd1\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xdb\xdc\xdd\xde\xdf\xe0\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xeb\xec\xed\xee\xef\xf0\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xfb\xfc\xfd\xfe\xff',
		},

		'showMessage': function (message) {
			var deferred = $q.defer();
			$modal.open({
				templateUrl: 'messageModal.html',
				controller: 'MessageModal',
				resolve: {
					'message': function () {
						return message;
					},
					'resolve': function () {
						return deferred.resolve;
					},
				}
			});

			return deferred.promise;
		},
		'getImage': function (dataNode) {
			var deferred = $q.defer();
			if (dataNode.imageCacheName in this.imageCache)
			{
				deferred.resolve(this.imageCache[dataNode.imageCacheName]);
			}
			else
			{
				loadImage(dataNode.imageBlob, function (img) {
					this.imageCache[dataNode.imageCacheName] = img;
					deferred.resolve(img);
				}.bind(this), {noRevoke: true});
			}
			return deferred.promise;
		},
		'getStorage': function () {
			var deferred = $q.defer();
			if (this.storage)
			{
				deferred.resolve(this.storage);
			}
			else
			{
				this.storage = new IDBStore({
					storeName: 'JoroDoxMods',
					storePrefix: 'IDBWrapper-',
					dbVersion: 2,
					keyPath: 'id',
					autoIncrement: true,
					indexes: [
						{'name': 'pathDisplayName', 'unique': false}
					],
					onError: deferred.reject
				}, function () {
					deferred.resolve(this.storage);
				});
			}
			return deferred.promise;
		},
		'loadPreviousData': function (id) {
			var deferred = $q.defer();
			chrome.storage.local.get('lastLoadedModId', function(result) {
				if (result.lastLoadedModId)
				{
					if (!this.data || !(id in this.data) || this.data.id != result.lastLoadedModId)
						deferred.resolve(this.loadData(result.lastLoadedModId));
					else
						deferred.resolve();
				}
				else
				{
					deferred.reject('No previous mod used.');
				}
			}.bind(this));

			return deferred.promise;
		},
		'getPreviousModData': function () {
			var deferred = $q.defer();
			this.getStorage().then(function(storage) {
				storage.query(function(result) {
					deferred.resolve(result);
				}, function (e) {
					deferred.reject();
				});
			});
			return deferred.promise;
		},
		'loadData': function (id) {
			var deferred = $q.defer();
			this.getStorage().then(function () {
				this.storage.get(id, function (data) {
					if (data) {
						$rootScope.$apply(function () {
							this.data = data;

							this.data.fileSystem.root.dirVisible = true;
							this.pathToFileEntry = {};

							this.loadFileNodeDirectory(this.data.fileSystem.root);

							chrome.storage.local.set({'lastLoadedModId': this.data.id});

							deferred.resolve();
						}.bind(this));
					}
				}.bind(this), deferred.reject);
			}.bind(this));

			return deferred.promise;
		},
		'getDisplayPath': function (entry) {
			var deferred = $q.defer();
			chrome.fileSystem.getDisplayPath(entry, function (displayPath) {
				deferred.resolve(displayPath);
			});
			return deferred.promise;
		},
		'setRootFileEntry': function (entry) {
			this.data = angular.copy(this.defaultData);
			this.pathToFileEntry = {};

			this.data.mod.retainedRootFileEntry = chrome.fileSystem.retainEntry(entry);
			this.data.mod.name = entry.name;

			this.pathToFileEntry[''] = entry;

			var rootFileNode = angular.copy(this.defaultFileNode);
			rootFileNode.path = '';

			return this.loadFileNode(rootFileNode).then(function() {
				return this.loadFileNodeDirectory(rootFileNode);
			//}.bind(this)).then(function () {
			//	return this.refreshOpenDirectories();
			}.bind(this)).then(function() {
				return this.getDisplayPath(entry).then(function (displayPath) {
					this.data.pathDisplayName = displayPath;
					this.data.mod.pathDisplayName = displayPath;
				}.bind(this));
			}.bind(this)).then(function () {
				return this.saveData();
			}.bind(this));
		},
		'saveData': function () {
			var deferred = $q.defer();
			this.getStorage().then(function () {
				this.storage.put(this.data, function (id) {
					this.data.id = id;
					chrome.storage.local.set({'lastLoadedModId': id}, function() {
						deferred.resolve();
					});
				}.bind(this), function (e) {console.log(e); deferred.reject(e);});
			}.bind(this));

			return deferred.promise;
		},
		'clearData': function () {
			this.data = angular.copy(this.defaultData);
			this.pathToFileEntry = {};
		},
		'refreshOpenDirectories': function (node) {

			if (!node)
				node = this.data.fileSystem.root;

			if (node.isDirectory && node.dirLoaded)// && node.dirVisible)
			{
				return this.loadFileNodeDirectory(node).then(function () {
					for (var i = 0; i < node.folders.length; i++)
						if (node.dirLoaded)
							this.refreshOpenDirectories(node.folders[i]);
				}.bind(this));
			}
			else
			{
				var deferred = $q.defer();
				deferred.resolve();
				return deferred.promise;
			}
		},
		'convertUtf8ToBuffer': function (text, encoding) {
			var buffer = new Uint8Array(text.length);
			var enc = this.encodings[encoding];

			var len = text.length;
			for (var i = 0; i < len; i++)
			{
				buffer[i] = enc.indexOf(text[i]);
			}

			return buffer;
		},
		'getMetadata': function (fileNode) {
			var deferred = $q.defer();

			this.getFileEntry(fileNode.path).then(function (entry) {
				entry.getMetadata(function (metadata) {
					fileNode.metadata = metadata;
					deferred.resolve(metadata);
				}, deferred.reject);
			});

			return deferred.promise;
		},
		'isNodeOutdated': function (dataNode, date) {
			var deferred = $q.defer();

			if ('lastModified' in dataNode)
			{
				if (!dataNode.lastModified)
				{
					deferred.resolve(true);
					return deferred.promise;
				}
				if (date && dataNode.lastModified > date)
				{
					deferred.resolve(true);
					return deferred.promise;
				}
			}
			else
			{
				deferred.reject('Node has no lastModified.');
				return deferred.promise;
			}

			if (('metadata' in dataNode) && dataNode.metadata)
			{
				if (dataNode.metadata.modificationDate > dataNode.lastModified)
				{
					deferred.resolve(true);
					return deferred.promise;
				}
			}

			// Node itself not outdated, but maybe one of its dependencies is...

			var promises = [];

			if ('metadata' in dataNode)
			{
				promises.push(this.getMetadata(dataNode).then(function (metadata) {
					return metadata.modificationDate > dataNode.lastModified;
				}));
			}

			if ('sourceDataNodes' in dataNode)
			{
				angular.forEach(dataNode.sourceDataNodes, function (sourceDataNode) {
					promises.push(this.isNodeOutdated(sourceDataNode, dataNode.lastModified));
				}, this);
			}

			if ('sourceFiles' in dataNode)
			{
				angular.forEach(dataNode.sourceFiles, function (sourceFile) {
					promises.push(this.getFileNodeByPath(sourceFile).then(function (fileNode) {
						if (!fileNode)
							return false;
						else
							return this.isNodeOutdated(fileNode);
					}.bind(this)));
				}, this);
			}

			$q.all(promises).then(
				function (results) {
					// If any of the results is true, then the node is outdated
					deferred.resolve(results.some(function(value) { return !!value; }));
				}
			);

			return deferred.promise;
		},
		'getData': function (dataNode) {
			return this.isNodeOutdated(dataNode).then(function (isOutdated) {
				if (!isOutdated)
					return dataNode;
				else
					return this.generateData(dataNode);
			}.bind(this));
		},
		'generateData': function (dataNode) {
			var deferred = $q.defer();

			if ('generateMethod' in dataNode)
				return this.loadDependencies(dataNode).then(function () {
					return this[dataNode.generateMethod](dataNode);
				}.bind(this)).then(function (dataNode) {
					dataNode.lastModified = new Date();
					return dataNode;
				});
			else
				deferred.reject('Node `'+ dataNode +'` cannot generate data, no generateMethod set.');

			return deferred.promise;
		},
		'loadDependencies': function (dataNode) {
			var promises = [];

			if ('metadata' in dataNode)
			{
				promises.push(this.getMetadata(dataNode));
			}

			if ('sourceDataNodes' in dataNode)
			{
				angular.forEach(dataNode.sourceDataNodes, function (sourceDataNode) {
					promises.push(this.generateData(sourceDataNode, dataNode.lastModified));
				}, this);
			}

			if ('sourceFiles' in dataNode)
			{
				angular.forEach(dataNode.sourceFiles, function (sourceFile) {
					promises.push(this.getFileNodeByPath(sourceFile));
				}, this);
			}

			return $q.all(promises);
		},
		'getFileEntry': function (path, options, ignoreExist) {
			var deferred = $q.defer();
			if (!options && this.pathToFileEntry[path])
			{
				deferred.resolve(this.pathToFileEntry[path]);
			}
			else if (path == '')
			{
				chrome.fileSystem.isRestorable(this.data.mod.retainedRootFileEntry, function(isRestorable) {
					if (!isRestorable)
						deferred.reject('Cannot restore root file entry.');
					else
					{
						chrome.fileSystem.restoreEntry(this.data.mod.retainedRootFileEntry, function(entry) {
							this.pathToFileEntry[''] = entry;
							deferred.resolve(entry);
						}.bind(this));
					}
				}.bind(this));
			}
			else
			{
				if (!options)
					options = {};

				return this.getFileEntry('').then(function (rootEntry) {
					var deferred = $q.defer();
					var getter = this.data.fileSystem.byPath[path] && this.data.fileSystem.byPath[path].isDirectory ? 'getDirectory' : 'getFile';
					rootEntry[getter](
						path,
						options,
						function (entry) {
							this.pathToFileEntry[path] = entry;
							deferred.resolve(entry);
						}.bind(this),
						function (e) {
							if (ignoreExist && (e.name == 'NotFoundError' || e.name == 'InvalidModificationError'))
							{
								deferred.resolve(false);
							}
							else
							{
								deferred.reject(e);
							}
						}

					);
					return deferred.promise;
				}.bind(this));
			}
			return deferred.promise;
		},
		'getFile': function (path, options) {
			if (!options)
			{
				return this.getFileEntry(path).then(function (entry) {
					var deferred = $q.defer();
					entry.file(function (file) {
						deferred.resolve(file);
					}, deferred.reject);
					return deferred.promise;
				})
			}
			else
			{
				if (!options)
					options = {};

				return this.getFileEntry('').then(function (rootEntry) {
					var deferred = $q.defer();
					rootEntry.getFile(path, options, function (fileEntry) {
						fileEntry.file(function (file) {
							deferred.resolve(file);
						});
					}, deferred.reject);
					return deferred.promise;
				});
			}
		},
		'loadFileNodeDirectory': function (fileNode) {
			if (!fileNode.isDirectory)
			{
				var deferred = $q.defer();
				deferred.reject(fileNode +' is not a directory.');
				return deferred.promise;
			}

			return this.getFileEntry(fileNode.path).then(function (nodeEntry) {
				return this.readDir(nodeEntry).then(function (entries) {
					var promises = [];
					var current = fileNode.byName;
					var foundNames = [];
					for (var entry of entries)
					{
						if (entry.name[0] == '.')
							continue;

						var path = (fileNode.path == '' ? entry.name : fileNode.path + '/' + entry.name);

						this.pathToFileEntry[path] = entry;

						var subFileNode = this.data.fileSystem.byPath[path];

						if (!subFileNode)
						{
							subFileNode = angular.copy(this.defaultFileNode);
							subFileNode.path = path;
						}
						subFileNode.parent = fileNode;
						subFileNode.name = entry.name;
						subFileNode.depth = fileNode.depth + 1;

						// New subitem
						if (!fileNode.byName[entry.name])
						{
							if (entry.isFile)
								fileNode.files.push(subFileNode);
							if (entry.isDirectory)
								fileNode.folders.push(subFileNode);

							fileNode.count++;
							fileNode.byName[entry.name] = subFileNode;
						}
						foundNames.push(entry.name);

						promises.push(this.loadFileNode(subFileNode));
					}

					for (var name in fileNode.byName)
					{
						if (foundNames.indexOf(name) == -1)
						{
							// File/Dir removed
							var deletedNode = fileNode.byName[name];

							if (deletedNode.isFile)
								fileNode.files.splice(fileNode.files.indexOf(deletedNode), 1);
							if (deletedNode.isDirectory)
								fileNode.folders.splice(fileNode.folders.indexOf(deletedNode), 1);

							delete(fileNode.byName[deletedNode.name]);
							delete(this.pathToFileEntry[deletedNode.path]);
						}
					}

					fileNode.files.sort(function (a, b) { return a.name.localeCompare(b.name); });
					fileNode.folders.sort(function (a, b) { return a.name.localeCompare(b.name); });

					return $q.all(promises);
				}.bind(this)).then(function () {
					fileNode.dirLoaded = true;
					return fileNode;
				});
			}.bind(this)).then(function (fileNode) {
				//this.saveData();
				return fileNode;
			}.bind(this));
		},
		'getFileNodeByPath': function (path) {
			var deferred = $q.defer();

			if (this.data.fileSystem.byPath[path])
				deferred.resolve(this.data.fileSystem.byPath[path]);
			else
			{
				var fileNode = angular.copy(this.defaultFileNode);
				fileNode.path = path;

				return this.loadFileNode(fileNode);
			}

			return deferred.promise;
		},
		'loadFileNode': function (fileNode) {
			return this.getFileEntry(fileNode.path).then(function (entry) {
				var fileNameChanged = (fileNode.name != entry.name);

				fileNode.name = entry.name;
				fileNode.lastModified = new Date();

				fileNode.isFile = entry.isFile;
				fileNode.isDirectory = entry.isDirectory;

				if (fileNode.isFile)
				{
					fileNode.extension = fileNode.name.lastIndexOf('.') != -1 ? fileNode.name.substring(fileNode.name.lastIndexOf('.') + 1) : null;

					if (fileNode.extension == 'txt')
					{
						var topDir = fileNode.path.substring(0, fileNode.path.indexOf('/'));

						if (
							// CK2
							topDir == 'common' || topDir == 'decisions' || topDir == 'events' || topDir == 'events'
							|| topDir == 'gfx' || topDir == 'history' || topDir == 'interface' || topDir == 'interface'
							|| topDir == 'map' || topDir == 'sound' || topDir == 'tutorial'
							// EU4
							|| topDir == 'hints' || topDir == 'missions')
						{
							fileNode.fileType = 'pdx-script';
							fileNode.specialView = true;
						}
						else
						{
							fileNode.fileType = 'text';
						}
					}
					else if (fileNode.extension == 'png' || fileNode.extension == 'bmp' || fileNode.extension == 'jpg' || fileNode.extension == 'gif')
					{
						fileNode.fileType = 'image';
					}
					else if (fileNode.extension == 'tga')
					{
						fileNode.fileType = 'image-tga';
					}
					else if (fileNode.extension == 'asset' || fileNode.extension == 'mod' || fileNode.extension == 'map' || fileNode.extension == 'gui' || fileNode.extension == 'gfx' || fileNode.extension == 'eu4')
					{
						fileNode.fileType = 'pdx-script';
						fileNode.specialView = true;
					}
					else if (fileNode.extension == 'anim')
					{
						fileNode.fileType = 'pdx-animation';
						fileNode.specialView = true;
					}
					else if (fileNode.extension == 'mesh')
					{
						fileNode.fileType = 'pdx-mesh';
						fileNode.specialView = true;
					}
					else if (fileNode.extension == 'json')
					{
						fileNode.fileType = 'json';
						fileNode.specialView = true;
					}
					else if (fileNode.extension == 'csv')
						fileNode.fileType = 'csv';
					else if (fileNode.extension == 'dds')
						fileNode.fileType = 'image-dds';
					else if (fileNode.extension == 'yml')
						fileNode.fileType = 'yml';
					else if (fileNode.extension == 'xml')
						fileNode.fileType = 'xml';
					else if (fileNode.extension == 'py')
						fileNode.fileType = 'python';
					else if (fileNode.extension == 'lua')
						fileNode.fileType = 'lua';
					else if (fileNode.extension == 'fxh')
						fileNode.fileType = 'hlsl-header';
					else if (fileNode.extension == 'dae')
					{
						fileNode.fileType = 'collada';
						fileNode.specialView = true;
					}
				}
				else
				{
					if (fileNode.path == 'map' || fileNode.path == 'history/provinces')
						fileNode.specialView = true;
				}

				this.data.fileSystem.byPath[fileNode.path] = fileNode;
				if (fileNode.path == '')
					this.data.fileSystem.root = fileNode;

				return fileNode;
			}.bind(this));
		},
		'generateMapImage': function (dataNode) {
			return this.getFile(dataNode.sourceFiles[0]).then(function (file) {
				dataNode.imageBlob = file;
				return dataNode;
			});
		},
		'generateMapInfo': function (dataNode) {
			return this.getData(this.data.map[dataNode.mapSource].image).then(function (imageNode) {
				return this.getImage(imageNode);
			}.bind(this)).then(function (image) {
				dataNode.analytics = mapAnalyzeService.analyzeColorMap(image);
				return dataNode;
			});
		},
		'generateMapGrid': function (dataNode) {
			return $q.all({
				info: this.getData(this.data.map[dataNode.mapSource].info),
				image: this.getData(this.data.map[dataNode.mapSource].image).then(function (dataNode) { return this.getImage(dataNode); }.bind(this))
			}).then(function (data) {
				var img = mapAnalyzeService.borderImage(data.image, data.info.analytics.colors, false);
				// Hack! imageBlob not actually set
				//dataNode.imageBlob = new Blob([img.src], {type: 'image/png'});
				this.imageCache[dataNode.imageCacheName] = img;
				return dataNode;
			}.bind(this));
		},
		'generateMapColorMapping': function (dataNode) {
			return this.getFileText('map/definition.csv').then(function (text) {
				dataNode.byId = [];
				dataNode.byColor = [];

				for (line of text.split("\n"))
				{
					var fields = line.split(';');

					if (fields[0] == 'province')
						continue;

					var mapping = {
						id: fields[0],
						r: fields[1],
						g: fields[2],
						b: fields[3],
						colorNum: parseInt(fields[1]) << 16 | parseInt(fields[2]) << 8 | parseInt(fields[3]),
						name: fields[4] + '',
						center: null,
					};
					if (fields[5] && fields[5].indexOf(',') > -1)
					{
						mapping.center = [
							parseFloat(fields[5].split(',')[0]),
							parseFloat(fields[5].split(',')[1])
						];
					}

					dataNode.byId[mapping.id] = mapping;

					if (!dataNode.byColor[mapping.colorNum])
						dataNode.byColor[mapping.colorNum] = mapping;
				}

				return dataNode;
			}.bind(this));
		},
		'fileExists': function (path) {
			return this.getFileEntry(path).then(function (fileEntry) {
				return !!fileEntry;
			}, {}, true);
		},
		'getFileText': function (path, encoding) {
			return this.getFile(path).then(function (file) {
				var deferred = $q.defer();

				var reader = new FileReader();
				reader.onerror = function (e) {console.log(e);deferred.reject(e);};
				reader.onloadend = function(event) {
					deferred.resolve(reader.result);
				};
				reader.readAsText(file, encoding ? encoding : 'cp1252');

				return deferred.promise;
			});
		},
		'writeFileText': function (path, text, encoding, overwrite) {
			return this.writeFileBuffer(path, this.convertUtf8ToBuffer(text, 'cp1252'), overwrite);
		},
		'writeFileBuffer': function (path, buffer, overwrite) {
			return this.getFileEntry(path, {create: true, exclusive: !overwrite}, !overwrite).then(function (fileEntry) {
				if (!fileEntry)
				{
					return false;
				}

				var deferred = $q.defer();
				var truncated = false;

				fileEntry.createWriter(function (writer) {
					writer.onerror = deferred.reject;
					writer.onwriteend = function (e) {
						if (!truncated) {
							truncated = true;
							this.truncate(this.position);
							return;
						}
						deferred.resolve();
					}
					var blob = new Blob([buffer]);
					writer.write(blob);
				}, deferred.reject);

				return deferred.promise;
			}, {create: true, exclusive: !overwrite}, !overwrite);
		},
		'getFileBuffer': function (path, encoding) {
			return this.getFile(path).then(function (file) {
				var deferred = $q.defer();

				var reader = new FileReader();
				reader.onerror = deferred.reject;
				reader.onloadend = function(event) {
					deferred.resolve(reader.result);
				};
				reader.readAsArrayBuffer(file);

				return deferred.promise;
			});
		},
		// for directories, read the contents of the top-level directory (ignore sub-dirs)
		// and put the results into the textarea, then disable the Save As button
		'readDir': function (entry) {
			var deferred = $q.defer();
			if (entry.isDirectory)
			{
				var dirReader = entry.createReader();

				// Call the reader.readEntries() until no more results are returned.
				var entries = [];
				var readEntries = function() {
					dirReader.readEntries(function(results) {
						if (!results.length) {
							return deferred.resolve(entries);
						}
						else {
							results.forEach(function(item) {
								entries.push(item);
							});
							readEntries();
						}
					}, deferred.reject);
				};
				readEntries(); // Start reading dirs.
			}
			else
			{
				deferred.resolve([]);
			}

			return deferred.promise;
		},
	};
	$rootScope.modService = modServiceInstance;

	return modServiceInstance;
}]);
