var module = angular.module('rendererService', ['modService']);

module.factory('rendererService', ['$rootScope', '$q', 'modService', function($rootScope, $q, modService) {

	var rendererService = {
		'handlerAdded': false,
		'insertValues': function (array, offset, values) {
			for (var i = 0; i < values.length; i++)
			{
				array[offset + i] = values[i];
			}
			return array;
		},
		'convertToPdxmesh': function (object, options) {

			if (!options)
				options = {
					textureBaseName: 'unknown',
					pdxShader: 'PdxMeshStandard',
				};

			var pdxDataRoot = {name: 'pdxData', type: 'object', subNodes: []};
			pdxDataRoot.subNodes.push({name: 'pdxasset', type: 'int', data: [1, 0]})

			var objectsRoot = {name: 'object', type: 'object', subNodes: []};
			pdxDataRoot.subNodes.push(objectsRoot);
			pdxDataRoot.subNodes.push({name: 'locator', type: 'object', subNodes: []});

			var shapeRoot = {name: 'polySurfaceShape1', type: 'object', subNodes: []};
			objectsRoot.subNodes.push(shapeRoot);

			// 'internal' function
			var getVertexNrForUniqueData = function (vertNr, uv, normal, vertexToUniqueData, verts)
			{
				if (!vertexToUniqueData[vertNr])
				{
					vertexToUniqueData[vertNr] = [{'uv': uv, 'normal': normal, v: vertNr}];
					return vertNr;
				}

				// See if we already mapped this UV before
				for (var j = 0, jl = vertexToUniqueData[vertNr].length; j < jl; j++)
				{
					if (vertexToUniqueData[vertNr][j].uv.equals(uv) && vertexToUniqueData[vertNr][j].normal.equals(normal))
					{
						return vertexToUniqueData[vertNr][j].v;
					}
				}

				// Create new vert, copy of existing
				verts.push(verts[vertNr*3]);
				verts.push(verts[vertNr*3+1]);
				verts.push(verts[vertNr*3+2]);

				var newVert = ((verts.length / 3) - 1) | 0; // '| 0' = cast to int

				vertexToUniqueData[vertNr].push({'uv': uv, 'normal': normal, v: newVert})

				return newVert;
			}

			// find all geometry
			object.traverse(function (subObject) {
				if (subObject instanceof THREE.Mesh)
				{
					// Bounding box
					var bb = new THREE.Box3();
					bb.setFromObject(subObject);

					// Scale / rotate to world
					subObject.geometry.applyMatrix(subObject.matrixWorld);

					// Vertices
					var verts = [];
					for (var k = 0, l = subObject.geometry.vertices.length; k < l; k++)
					{
						verts.push.apply(verts, subObject.geometry.vertices[k].toArray());
					}

					// Tmp assign all skin to joint '0'
					var skinIds = [];
					var skinWeights = [];
					for (var k = 0, l = subObject.geometry.vertices.length; k < l; k++)
					{
						skinIds.push(0, -1, -1, -1);
						skinWeights.push(1, 0, 0, 0);
					}

					// Face-stored data
					var tri = [];
					var normals = [];
					var tangents = [];
					var uvs = [];

					if (!subObject.geometry.hasTangents && subObject.geometry.faceVertexUvs[0].length)
						subObject.geometry.computeTangents();

					// See if we have any multi-UV vertices, split those
					var vertexToUniqueData = [];
					for (var k = 0, l = subObject.geometry.faces.length; k < l; k++)
					{
						var face = subObject.geometry.faces[k];
						var faceUvs = subObject.geometry.faceVertexUvs[0][k];

						face.a = getVertexNrForUniqueData(face.a, faceUvs[0], face.vertexNormals[0], vertexToUniqueData, verts);
						face.b = getVertexNrForUniqueData(face.b, faceUvs[1], face.vertexNormals[1], vertexToUniqueData, verts);
						face.c = getVertexNrForUniqueData(face.c, faceUvs[2], face.vertexNormals[2], vertexToUniqueData, verts);
					}

					// Process all faces
					for (var k = 0, l = subObject.geometry.faces.length; k < l; k++)
					{
						var face = subObject.geometry.faces[k];
						tri.push(face.a, face.b, face.c);

						this.insertValues(normals, face.a*3, face.vertexNormals[0].toArray());
						this.insertValues(normals, face.b*3, face.vertexNormals[1].toArray());
						this.insertValues(normals, face.c*3, face.vertexNormals[2].toArray());

						if (face.vertexTangents.length)
						{
							this.insertValues(tangents, face.a*4, face.vertexTangents[0].toArray());
							this.insertValues(tangents, face.b*4, face.vertexTangents[1].toArray());
							this.insertValues(tangents, face.c*4, face.vertexTangents[2].toArray());
						}
						else
						{
							this.insertValues(tangents, face.a*4, new THREE.Vector4().toArray());
							this.insertValues(tangents, face.b*4, new THREE.Vector4().toArray());
							this.insertValues(tangents, face.c*4, new THREE.Vector4().toArray());
						}

						if (subObject.geometry.faceVertexUvs[0])
						{
							var uv = subObject.geometry.faceVertexUvs[0][k];

							if (uv)
							{
								var flipY = !subObject.material.map || subObject.material.map.flipY;

								uvs[face.a*2] = uv[0].x;
								uvs[face.a*2+1] = flipY? 1 - uv[0].y : uv[0].y;
								uvs[face.b*2] = uv[1].x;
								uvs[face.b*2+1] = flipY? 1 - uv[1].y : uv[1].y;
								uvs[face.c*2] = uv[2].x;
								uvs[face.c*2+1] = flipY? 1 - uv[2].y : uv[2].y;
							}
							else
							{
								uvs[face.a*2] = 0;
								uvs[face.a*2+1] = 0;
								uvs[face.b*2] = 0;
								uvs[face.b*2+1] = 0;
								uvs[face.c*2] = 0;
								uvs[face.c*2+1] = 0;
							}
						}
					}

					var mesh = {name: 'mesh', type: 'object', subNodes: []};
					mesh.subNodes.push({name: 'p', type: 'float', data: verts});
					mesh.subNodes.push({name: 'n', type: 'float', data: normals});
					mesh.subNodes.push({name: 'ta', type: 'float', data: tangents});
					mesh.subNodes.push({name: 'u0', type: 'float', data: uvs});
					mesh.subNodes.push({name: 'tri', type: 'int', data: tri});
					mesh.subNodes.push({name: 'aabb', type: 'object', subNodes: [
						{name: 'min', type: 'float', data: [bb.min.x, bb.min.y, bb.min.z]},
						{name: 'max', type: 'float', data: [bb.max.x, bb.max.y, bb.max.z]},
					]});
					mesh.subNodes.push({name: 'material', type: 'object', subNodes: [
						{name: 'shader', type: 'string', data: options.pdxShader ? options.shader : 'PdxMeshStandard', nullByteString: true},
						{name: 'diff', type: 'string', data: options.textureBaseName +'_diffuse.dds', nullByteString: true},
						{name: 'n', type: 'string', data: options.textureBaseName +'_normal.dds', nullByteString: true},
						{name: 'spec', type: 'string', data: options.textureBaseName +'_spec.dds', nullByteString: true},
					]});
					/*
					mesh.subNodes.push({name: 'skin', type: 'object', subNodes: [
						{name: 'bones', type: 'int', data: [1]},
						{name: 'ix', type: 'int', data: skinIds},
						{name: 'w', type: 'float', data: skinWeights},
					]});
					*/

					shapeRoot.subNodes.push(mesh);
					/*
					var skeleton = {name: 'skeleton', type: 'object', subNodes: [
						{name: 'Root', type: 'object', subNodes: [
							{name: 'ix', type: 'int', data: [0]},
							{name: 'tx', type: 'int', data: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]},
						]},
						{name: 'End', type: 'object', subNodes: [
 							{name: 'ix', type: 'int', data: [1]},
 							{name: 'pa', type: 'int', data: [0]},
 							{name: 'tx', type: 'int', data: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]},
 						]},
					]};
					shapeRoot.subNodes.push(skeleton);
					*/
				}
			}.bind(this));

			return pdxDataRoot;
		},
		'setThreeJsLoaderHandlers': function () {
			if (this.handlerAdded)
				return;

			THREE.Loader.Handlers.add(/^mod\:\/\//, {
				'load': function (path) {
					var texture = new THREE.Texture();

					var modPath = path.substr(6);

					if (modPath.substr(-4) == '.dds')
					{
						this.loadDdsToTexture(modService.getFileBuffer(modPath));
					}
					else
					{
						modService.getFile(modPath).then(function (file) {
							loadImage(file, function (img) {
								texture.image = img;
								texture.needsUpdate = true;
							});
						});
					}

					return texture;
				}
			});
			this.handlerAdded = true;
		},
		'loadCollada': function (string, path) {
			var deferred = $q.defer();
	        var loader = new THREE.ColladaLoader();
			loader.options.convertUpAxis = true;

			var boneCount = 0;
			var triangleCount = 0;

			this.setThreeJsLoaderHandlers();

			var xmlParser = new DOMParser();
			var colladaXML = xmlParser.parseFromString(string, 'application/xml');
			loader.parse(colladaXML, function (collada) {

				var skeletons = [];
				var meshes = [];
				var update = function (viewScene) {
					for (var i = 0; i < skeletons.length; i++)
					{
						skeletons[i].visible = viewScene.viewConfig.showSkeletons;
						skeletons[i].update();
					}
					for (var i = 0; i < meshes.length; i++)
					{
						meshes[i].material.visible = viewScene.viewConfig.showMeshes;
					}
				};

				dae = collada.scene;
				dae.traverse( function ( child ) {
					if ( child instanceof THREE.Mesh ) {
						meshes.push(child);
						triangleCount += child.geometry.faces.length + 1;
					}
					if ( child instanceof THREE.SkinnedMesh ) {
						var animation = new THREE.Animation( child, child.geometry.animation );
						animation.play();

						var skeletonHelper = new THREE.SkeletonHelper(child);
						for (var k = 0; k < skeletonHelper.geometry.colors.length; k += 2)
						{
							skeletonHelper.geometry.colors[k] = new THREE.Color( 1, 0, 0 );
							skeletonHelper.geometry.colors[k+1] = new THREE.Color( 1, 1, 1 );
						}

						child.add(skeletonHelper);
						skeletons.push(skeletonHelper);

						boneCount += skeletonHelper.bones.length + 1;
					}
				});

				// Bounding box
				var bb = new THREE.Box3();
				bb.setFromObject(collada.scene);
				var distance = Math.max(-bb.min.x, -bb.min.y, -bb.min.z, bb.max.x, bb.max.y, bb.max.z);

				deferred.resolve({
					'object': collada.scene,
					'collada': collada,
					'distance': distance,
					'update': update,
					'triangleCount': triangleCount,
					'boneCount': boneCount,
					'meshCount':  meshes.length,
				});
			}, 'mod://' + path +'/thefile.dae');

			return deferred.promise;
		},
		'renderCubeToElement': function (element, width, height) {
			var scene, camera, renderer;
		    var geometry, material, mesh;

			var scene = new THREE.Scene();

	        camera = new THREE.PerspectiveCamera( 75, width / height, 1, 10000 );
	        camera.position.z = 1000;

	        geometry = new THREE.BoxGeometry( 200, 200, 200 );
	        material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });

	        mesh = new THREE.Mesh(geometry, material);
	        scene.add( mesh );

	        renderer = new THREE.WebGLRenderer();
	        renderer.setSize(width, height);

	        element.appendChild(renderer.domElement);

	        renderer.render( scene, camera );
		},
		'loadPdxMesh': function (pdxData, path) {
			var deferred = $q.defer();

			var triangleCount = 0;
			var boneCount = 0;
			var skeletons = [];
			var colliders = [];
			var meshes = [];
			var labels = [];

			var update = function (viewScene) {
				for (var i = 0; i < skeletons.length; i++)
				{
					skeletons[i].visible = viewScene.viewConfig.showSkeletons;
					skeletons[i].update();
				}
				for (var i = 0; i < meshes.length; i++)
				{
					meshes[i].material.visible = viewScene.viewConfig.showMeshes;
				}
				for (var i = 0; i < colliders.length; i++)
				{
					colliders[i].material.visible = viewScene.viewConfig.showColliders;
				}
			};


			var maxExtent = 0;

			path += (path == '' ? '' : '/');

			var scene = new THREE.Scene();

			// Iterate over 'shapes'
			for(var i = 0; i < pdxData.props['object'].subNodes.length; i++)
			{
				if (pdxData.props['object'].subNodes[i].type != 'object')
					continue;

				var pdxShape = pdxData.props['object'].subNodes[i];

				var bones = [];
				if ('skeleton' in pdxShape.props)
				{
					var skeleton = pdxShape.props['skeleton'];

					var geometry = new THREE.Geometry();
					var material = new THREE.MeshBasicMaterial();
					material.wireframe = true;
					material.color = new THREE.Color(0x00FF00);

					// Iterate over 'bones'
					for(var j = 0; j < skeleton.subNodes.length; j++)
					{
						var pdxBone = skeleton.subNodes[j].props;

						var boneTx = pdxBone.tx;

						var bone = new THREE.Bone();
						bone.name = skeleton.subNodes[j].name;
						var matrix = new THREE.Matrix4().set(
							boneTx[0], boneTx[3], boneTx[6], boneTx[9],
							boneTx[1], boneTx[4], boneTx[7], boneTx[10],
							boneTx[2], boneTx[5], boneTx[8], boneTx[11],
							0, 0, 0, 1
						);
						matrix = new THREE.Matrix4().getInverse(matrix);
						bone.matrixWorld = matrix;

						if ('pa' in pdxBone)
							bones[pdxBone.pa].add(bone);

						bones.push(bone);

						if (pdxBone.ix != bones.length - 1)
							console.log('Bone #'+ pdxBone.ix.data +' is not entry #'+ (bones.length-1));
					}

					var skeletonHelper = new THREE.SkeletonHelper(bones[0]);
					for (var k = 0; k < skeletonHelper.geometry.colors.length; k += 2)
					{
						skeletonHelper.geometry.colors[k] = new THREE.Color( 1, 0, 0 );
						skeletonHelper.geometry.colors[k+1] = new THREE.Color( 1, 1, 1 );
					}
					scene.add(skeletonHelper);
					skeletons.push(skeletonHelper);
				}
				scene.bones = bones;
				boneCount += bones.length;

				// Iterate over 'objects in shapes'
				for(var j = 0; j < pdxShape.subNodes.length; j++)
				{
					if (pdxShape.subNodes[j].type != 'object')
						continue;

					var pdxMesh = pdxShape.subNodes[j].props;

					if ('aabb' in pdxMesh)
					{
						maxExtent = Math.max(maxExtent, -pdxMesh.aabb.props.min[0], -pdxMesh.aabb.props.min[1], -pdxMesh.aabb.props.min[2]);
						maxExtent = Math.max(maxExtent, pdxMesh.aabb.props.max[0], pdxMesh.aabb.props.max[1], pdxMesh.aabb.props.max[2]);
					}

					if ('p' in pdxMesh)
					{
						var geometry = new THREE.Geometry();

						// Vertices
						for (var k = 0; k < pdxMesh.p.length; k += 3)
							geometry.vertices.push(new THREE.Vector3(pdxMesh.p[k], pdxMesh.p[k+1], pdxMesh.p[k+2]));
						// Normals
						var normals = [];
						if ('n' in pdxMesh)
							for (var k = 0; k < pdxMesh.n.length; k += 3)
								normals.push(new THREE.Vector3(pdxMesh.n[k], pdxMesh.n[k+1], pdxMesh.n[k+2]));
						// Tangents
						var tangents = [];
						if ('ta' in pdxMesh)
							for (var k = 0; k < pdxMesh.ta.length; k += 4)
								tangents.push(new THREE.Vector4(pdxMesh.ta[k], pdxMesh.ta[k+1], pdxMesh.ta[k+2], pdxMesh.ta[k+3]));
						// Texture mapping
						var textureMapping = [];
						if ('u0' in pdxMesh)
						{
							for (var k = 0; k < pdxMesh.u0.length; k += 2)
							{
								textureMapping.push(new THREE.Vector2(pdxMesh.u0[k], pdxMesh.u0[k+1]));
							}
						}
						// Skin
						if ('skin' in pdxMesh)
						{
							var skin = pdxMesh.skin.props;
							var influencesPerVertex = skin.bones;
							for (var k = 0; k < skin.ix.length; k += influencesPerVertex)
							{
								var a =                               skin.ix[k];
								var b = ( influencesPerVertex > 1 ) ? skin.ix[k + 1] : 0;
								var c = ( influencesPerVertex > 2 ) ? skin.ix[k + 2] : 0;
								var d = ( influencesPerVertex > 3 ) ? skin.ix[k + 3] : 0;

								geometry.skinIndices.push(new THREE.Vector4(a, b, c, d));
							}
							for (var k = 0; k < skin.w.length; k += influencesPerVertex)
							{
								var a =                               skin.w[k];
								var b = ( influencesPerVertex > 1 ) ? skin.w[k + 1] : 0;
								var c = ( influencesPerVertex > 2 ) ? skin.w[k + 2] : 0;
								var d = ( influencesPerVertex > 3 ) ? skin.w[k + 3] : 0;

								geometry.skinWeights.push(new THREE.Vector4(a, b, c, d));
							}
						}

						// Faces
						for (var k = 0; k < pdxMesh.tri.length; k += 3)
						{
							var f = new THREE.Face3(pdxMesh.tri[k], pdxMesh.tri[k+1], pdxMesh.tri[k+2]);
							if (normals.length > 0)
							{
								f.vertexNormals = [
									normals[pdxMesh.tri[k]],
									normals[pdxMesh.tri[k+1]],
									normals[pdxMesh.tri[k+2]]
								];
							}
							if (tangents.length > 0)
							{
								f.vertexTangents = [
									tangents[pdxMesh.tri[k]],
									tangents[pdxMesh.tri[k+1]],
									tangents[pdxMesh.tri[k+2]]
								];
							}
							if (textureMapping.length > 0)
							{
								geometry.faceVertexUvs[0].push([
									textureMapping[pdxMesh.tri[k]],
									textureMapping[pdxMesh.tri[k+1]],
									textureMapping[pdxMesh.tri[k+2]]
								]);
							}
							geometry.faces.push(f);
						}
						triangleCount += geometry.faces.length + 1;

						// Material
						var material = new THREE.MeshDepthMaterial();
						if ('material' in pdxMesh)
						{
							if (pdxMesh.material.props.shader == 'Collision')
							{
								material = new THREE.MeshBasicMaterial();
								material.wireframe = true;
								material.color = new THREE.Color(0, 1, 0);
							}
							else
							{
								if (!(pdxMesh.material.props.shader == 'PdxMeshTextureAtlas'
									|| pdxMesh.material.props.shader == 'PdxMeshAlphaBlendNoZWrite'
									|| pdxMesh.material.props.shader == 'PdxMeshColor'
									|| pdxMesh.material.props.shader == 'PdxMeshStandard'
									|| pdxMesh.material.props.shader == 'PdxMeshSnow'
									|| pdxMesh.material.props.shader == 'PdxMeshAlphaBlend'
									|| pdxMesh.material.props.shader == 'PdxMeshStandard_NoFoW_NoTI'))
								{
									console.log('Unknown shader: '+ pdxMesh.material.props.shader);
								}

								material = new THREE.MeshPhongMaterial();
								if ('diff' in pdxMesh.material.props)
									material.map = this.loadDdsToTexture(modService.getFileBuffer(path + pdxMesh.material.props.diff)); //THREE.ImageUtils.loadTexture('img/barque_diffuse.png');
								if ('n' in pdxMesh.material.props)
									material.normalMap = this.loadDdsToTexture(modService.getFileBuffer(path + pdxMesh.material.props.n));
								if ('spec' in pdxMesh.material.props)
									material.specularMap = this.loadDdsToTexture(modService.getFileBuffer(path + pdxMesh.material.props.spec));

								if (pdxMesh.material.props.shader == 'PdxMeshAlphaBlendNoZWrite')
								{
									material.transparent = true;
								}
								if (pdxMesh.material.props.shader == 'PdxMeshAlphaBlend')
								{
									material.transparent = true;
								}
							}
						}

						var mesh = new THREE.SkinnedMesh(geometry, material);
						scene.add( mesh );

						if ('material' in pdxMesh && pdxMesh.material.props.shader == 'Collision')
							colliders.push(mesh);
						else
							meshes.push(mesh);
					}
				}
			}

			deferred.resolve({
				'object': scene,
				'distance': maxExtent,
				'labels': labels,
				'update': update,
				'triangleCount': triangleCount,
				'boneCount': boneCount,
				'meshCount': meshes.length,
			})

			return deferred.promise;
		},
		'loadDdsToTexture': function (bufferPromise, geometry)
		{
			var ddsLoader = new THREE.DDSLoader();

			var texture = new THREE.CompressedTexture();
			var images = [];
			texture.image = images;

			bufferPromise.then(function (buffer) {
				var texDatas = ddsLoader._parser(buffer, true);

				if ( texDatas.isCubemap )
				{
					var faces = texDatas.mipmaps.length / texDatas.mipmapCount;

					for ( var f = 0; f < faces; f ++ )
					{
						images[ f ] = { mipmaps : [] };

						for ( var i = 0; i < texDatas.mipmapCount; i ++ )
						{
							images[ f ].mipmaps.push( texDatas.mipmaps[ f * texDatas.mipmapCount + i ] );
							images[ f ].format = texDatas.format;
							images[ f ].width = texDatas.width;
							images[ f ].height = texDatas.height;
						}
					}
				}
				else
				{
					texture.image.width = texDatas.width;
					texture.image.height = texDatas.height;
					texture.mipmaps = texDatas.mipmaps;
				}

				if ( texDatas.mipmapCount === 1 )
				{
					texture.minFilter = THREE.LinearFilter;
				}

				texture.format = texDatas.format;
				texture.needsUpdate = true;

				if (geometry)
				{
					geometry.buffersNeedUpdate = true;
					geometry.uvsNeedUpdate = true;
				}
			}, function () {
				var greyTexture = new Uint8Array(4);
				greyTexture[0] = 128;
				greyTexture[1] = 128;
				greyTexture[2] = 128;
				greyTexture[3] = 255;

				texture.mipmaps = [
					{ "data": greyTexture, "width": 1, "height": 1 }
				];
				texture.needsUpdate = true;
			});

			return texture;
		},
		'createViewScene': function (container, width, height, viewConfig) {
			var deferred = $q.defer();

			var scene, camera, renderer;

			if (!viewConfig)
			{
				viewConfig = {
					distance: 20,
					update: null,
					showSkeletons: true,
					showColliders: true,
					showMeshes: true,
					showSpotlights: true,
					rotate: true,
					rotation: 0,
				};
			}

			camera = new THREE.PerspectiveCamera( 45, width / height, 1, 10000);
			camera.position.set(0, 6, 0);

			scene = new THREE.Scene();

			// Grid
			var size = 100, step = 1;
			var geometry = new THREE.Geometry();
			var material = new THREE.LineBasicMaterial( { color: 0x303030 } );
			for ( var i = - size; i <= size; i += step )
			{
				geometry.vertices.push( new THREE.Vector3( - size, - 0.04, i ) );
				geometry.vertices.push( new THREE.Vector3(   size, - 0.04, i ) );
				geometry.vertices.push( new THREE.Vector3( i, - 0.04, - size ) );
				geometry.vertices.push( new THREE.Vector3( i, - 0.04,   size ) );
			}
			var line = new THREE.Line( geometry, material, THREE.LinePieces );
			scene.add( line );

			// Some particle lights
			var particleLight = new THREE.Mesh( new THREE.SphereGeometry( 4, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
			scene.add(particleLight);

			// General lights
			scene.add( new THREE.AmbientLight( 0xcccccc ) );

			var directionalLight = new THREE.DirectionalLight(0xeeeeee);
			directionalLight.position.x = Math.random() - 0.5;
			directionalLight.position.y = Math.random() - 0.5;
			directionalLight.position.z = Math.random() - 0.5;
			directionalLight.position.normalize();
			scene.add( directionalLight );

			var pointLight = new THREE.PointLight( 0xffffff, 4 );
			particleLight.add( pointLight );

			// Prime the renderer & place in DOM
			renderer = new THREE.WebGLRenderer();
			renderer.setSize(width, height);
			container.appendChild(renderer.domElement);

			renderer.render(scene, camera);

			var clock = new THREE.Clock();

			var viewerDestroyed = false;

			var halfWidth = width / 2;
		    var halfHeight = height / 2;

			function render()
			{
				// Crappy detection if view is destroyed...
				if (viewerDestroyed || !renderer.domElement.parentNode.baseURI)
				{
					viewerDestroyed = true;
					return;
				}

				var delta = clock.getDelta();

				if (viewConfig.rotate)
					viewConfig.rotation += delta * 0.5;

				camera.position.x = Math.cos(viewConfig.rotation) * viewConfig.distance;
				camera.position.y = viewConfig.distance / 4;
				camera.position.z = Math.sin(viewConfig.rotation) * viewConfig.distance;

				camera.lookAt(scene.position);

				var timer = Date.now() * 0.0005;

				particleLight.visible = viewConfig.showSpotlights;

				particleLight.position.x = Math.sin(timer * 4) * 30009;
				particleLight.position.y = Math.cos(timer * 5) * 40000;
				particleLight.position.z = Math.cos(timer * 4) * 30009;

				THREE.AnimationHandler.update(delta);

				if (viewConfig.viewObject && viewConfig.viewObject.labels)
				{
					for (var i = 0; i < viewConfig.viewObject.labels.length; i++)
					{
						var label = viewConfig.viewObject.labels[i];

						if (!label.div)
						{
							label.div = document.createElement('div');
							label.div.innerHTML = label.text;
							label.div.style.position = 'absolute';
							container.children[0].appendChild(label.div);
						}

						var pos = label.pos3d.clone().project(camera);

					    label.div.style.left = Math.round(pos.x * halfWidth + halfWidth) +'px';
					    label.div.style.top = Math.round(-pos.y * halfHeight + halfHeight) +'px';
					}
				}

				renderer.render(scene, camera);
			}

			var viewScene = {
				'scene': scene,
				'renderer': renderer,
				'camera': camera,
				'viewConfig': viewConfig,
			};

			function animate()
			{
				if (viewerDestroyed)
					return;

				requestAnimationFrame( animate );

				if (viewConfig.update)
					viewConfig.update(viewScene);

				render();
			}

			animate();

			/*
			stats = new Stats();
			stats.domElement.style.position = 'absolute';
			stats.domElement.style.top = '0px';
			container.appendChild( stats.domElement );
			*/
			deferred.resolve(viewScene);

			return deferred.promise;
		},
	};
  	return rendererService;
}]);