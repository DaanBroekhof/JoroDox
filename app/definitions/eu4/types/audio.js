export default {
  types: [
    {
      id: 'music_files',
      title: 'Music files',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'music/',
        pathPattern: 'music/*.ogg',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['info'],
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
      id: 'music',
      title: 'Music',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'music/',
        pathPattern: 'music/*.asset',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['music'],
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
      id: 'music_songs',
      title: 'Music songs',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'music/',
        pathPattern: 'music/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['song'],
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
      id: 'sound_files',
      title: 'Sound files',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'path',
      sourceType: {
        id: 'files',
        pathPrefix: 'sound/',
        pathPattern: 'sound/**/*.wav',
      },
      sourceTransform: {
        type: 'fileData',
        path: ['info'],
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
      id: 'sound',
      title: 'Sound',
      category: 'Audio',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'sound/',
        pathPattern: 'sound/*.asset',
      },
      sourceTransform: {
        type: 'typesList',
        path: ['data', 'children'],
        types: ['sound'],
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
  ],
};