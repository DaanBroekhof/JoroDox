export default {
  types: [
    {
      id: 'customizable_localization',
      title: 'Customizable localization',
      category: 'Localization',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdx_scripts',
        pathPrefix: 'customizable_localization/',
        pathPattern: 'customizable_localization/*.txt',
      },
      sourceTransform: {
        type: 'typesList',
        types: ['defined_text'],
        idPath: ['data', 'name'],
        path: ['data', 'children'],
        filenamePattern: '/([^/]+).txt',
        filenamePatternKey: 'category',
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
            name: 'Category',
            dataIndex: 'category',
          },
        ],
      },
    },
    {
      id: 'localisation_languages',
      title: 'Localization languages',
      category: 'Localization',
      reader: 'StructureLoader',
      primaryKey: 'name',
      sourceType: {
        id: 'pdxyml_files',
        path: 'localisation/languages.yml',
      },
      sourceTransform: {
        type: 'keyValues',
        path: ['data'],
        keyName: 'name',
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
          },
        ],
      },
    },
    {
      id: 'localisation',
      title: 'Localizations',
      category: 'Localization',
      reader: 'StructureLoader',
      primaryKey: 'id',
      sourceType: {
        id: 'pdxyml_files',
        pathPrefix: 'localisation/',
        pathPattern: 'localisation/*.yml',
      },
      sourceTransform: {
        type: 'keyKeyValues',
        path: ['data'],
        keyName: 'name',
        parentKeyName: 'language',
        parentRelationType: 'localisation_languages',
        relationsStorage: false,
        valueName: 'data',
        customFields: {
          id: {
            type: 'concat',
            fields: ['language', 'name'],
          },
        },
        saveChunkSize: 10000,
      },
      listView: {
        pageSize: 100,
        columns: [
          {
            name: 'Name',
            dataIndex: 'name',
            linkTo: '[self]',
            linkKey: 'id',
          },
          {
            name: 'Language',
            dataIndex: 'language',
          },
          {
            name: 'Translation',
            dataIndex: ['data', 'value'],
          },
          {
            name: 'Comment',
            dataIndex: ['data', 'comment'],
          },
        ],
      },
    },
  ],
};
