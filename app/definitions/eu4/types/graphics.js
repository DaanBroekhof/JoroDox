export default {
  types: [
    {
      id: 'pdx_meshes',
      title: '3D Models',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_data',
        pathPrefix: '',
        pathPattern: '**/*.mesh',
      },
      sourceTransform: {
        type: 'fileData',
        keyName: 'path',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'pdx_anims',
      title: 'Model Animations',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'pdx_data',
        pathPrefix: '',
        pathPattern: '**/*.anim',
      },
      sourceTransform: {
        type: 'fileData',
        keyName: 'path',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'model_textures',
      title: 'Model textures',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'gfx/models/',
        pathPattern: 'gfx/models/**/*.dds',
      },
      sourceTransform: {
        type: 'fileData',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'ambient_object_animations',
      title: 'Ambient object animations',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        path: 'gfx/models/animated_mapobjects/ambient_objects_animation.asset',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['animation'],
        idPath: ['data', 'name'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'id',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'combat_result_environment',
      title: 'Combat result environment',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'setting',
      sourceType: {
        id: 'pdx_scripts',
        path: 'gfx/combat_result/combat_result_environment.txt',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data', 'data'],
        keyName: 'setting',
        valueName: 'value',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Setting',
            dataIndex: 'setting',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'gfx_custom_flags',
      title: 'Custom flags',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'gfx/custom_flags/',
        pathPattern: 'gfx/custom_flags/*.tga',
      },
      sourceTransform: {
        type: 'fileData',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Path',
            dataIndex: 'path',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'gfx_entities',
      title: 'Graphics entities',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'gfx/entities/',
        pathPattern: 'gfx/entities/*.asset',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['entity'],
        idPath: ['data', 'name'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'id',
            linkTo: '[self]',
          },
          {
            name: 'Pdxmesh',
            dataIndex: ['data', 'pdxmesh'],
          },
          {
            name: 'Clone',
            dataIndex: ['data', 'clone'],
          },
        ],
      },
    },
    {
      id: 'event_pictures',
      title: 'Event pictures',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'dds_images',
        flipY: true,
        pathPrefix: 'gfx/event_pictures/',
        pathPattern: 'gfx/event_pictures/**/*.dds',
      },
      sourceTransform: {
        type: 'fileData',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'gfx_flags',
      title: 'Flag pictures',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'gfx/flags/',
        pathPattern: 'gfx/flags/*.tga',
      },
      sourceTransform: {
        type: 'fileData',
        filenamePattern: '/([^/.]+).tga',
        filenamePatternKey: 'flag_tag',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'loadingscreens',
      title: 'Loading screen images',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'dds_images',
        pathPrefix: 'gfx/loadingscreens/',
        pathPattern: 'gfx/loadingscreens/*.dds',
      },
      sourceTransform: {
        type: 'fileData',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'gfx_map_items',
      title: 'Map item images',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'gfx/mapitems/',
        pathPattern: 'gfx/mapitems/*.+(dds|tga)',
      },
      sourceTransform: {
        type: 'fileData',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'gfx_particles',
      title: 'Particle systems',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'gfx/particles/',
        pathPattern: 'gfx/particles/*.asset',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['particle'],
        idPath: ['data', 'name'],
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'id',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'gfx_particle_textures',
      title: 'Particle textures',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'gfx/particles/',
        pathPattern: 'gfx/particles/*.+(dds)',
      },
      sourceTransform: {
        type: 'fileData',
      },
      listView: {
        pageSize: 100,
        unsetKeys: [
          ['data'],
        ],
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
        ],
      }
    },
    {
      id: 'gfx_fx_shaders',
      title: 'FX Shaders',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'gfx/FX/',
        pathPattern: 'gfx/FX/*.+(shader|fxh)',
      },
      sourceTransform: {
        type: 'fileData',
        keyName: 'path',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Path',
            dataIndex: 'path',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'gfx_model_textures',
      title: '3D Model Textures',
      category: 'Graphics',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'dds_images',
        flipY: true,
        pathPrefix: 'gfx/models/',
        pathPattern: 'gfx/models/**/*.dds',
      },
      sourceTransform: {
        type: 'fileData',
        keyName: 'path',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Path',
            dataIndex: 'path',
            linkTo: '[self]',
          },
        ],
      },
    },
  ],
};