export default {
  types: [
    {
      id: 'files',
      title: 'Files & Directories',
      category: 'Raw data',
      reader: 'FileLoader',
      readerFileIgnore: [
        '.*',
        '.*/**',
        '**/.*',
        '_*',
        '_*/**',
      ],
      primaryKey: 'path',
      indexedKeys: ['type'],
      listView: {
        pageSize: 50,
        columns: [
          {
            name: 'Path',
            dataIndex: ['path'],
            width: '75%',
            linkTo: '[self]',
          },
          {
            name: 'Size',
            dataIndex: ['info', 'size'],
            moveable: true,
            renderer: ({value, row}) => (
              <span>{(row.info.type === 'file' ? filesize(value) : '')}</span>
            ),
          },
          {
            name: 'Type',
            dataIndex: 'type',
            moveable: true,

          },
        ],
      }
    },
    {
      id: 'pdx_scripts',
      title: 'PDX script files',
      category: 'Raw data',
      reader: 'PdxScriptParser',
      primaryKey: 'path',
      listView: {
        pageSize: 50,
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
      id: 'pdx_data',
      title: 'PDX binary data files',
      category: 'Raw data',
      reader: 'PdxDataParser',
      primaryKey: 'path',
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
      id: 'lua_scripts',
      title: 'LUA script files',
      category: 'Raw data',
      reader: 'LuaScriptParser',
      primaryKey: 'path',
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
      id: 'csv_files',
      title: 'CSV data files',
      category: 'Raw data',
      reader: 'CsvFileParser',
      primaryKey: 'path',
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
      id: 'pdxyml_files',
      title: 'PDX YML data files',
      category: 'Raw data',
      reader: 'PdxYmlFileParser',
      primaryKey: 'path',
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
      id: 'indexed_bmps',
      title: 'Indexed BMPs',
      category: 'Raw data',
      reader: 'IndexedBmpParser',
      primaryKey: 'path',
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
      id: 'dds_images',
      title: 'DDS images',
      category: 'Raw data',
      reader: 'DdsImageParser',
      primaryKey: 'path',
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
  ],
};
