import Dexie from 'dexie';
import BackgroundTask from './BackgroundTask';

const hash = require('object-hash');
const minimatch = require('minimatch');

export default class DbBackgroundTask extends BackgroundTask {
  saveChunked(data, store, chunkNr, chunkSize) {
    const slice = data.slice(chunkNr * chunkSize, (chunkNr + 1) * chunkSize);

    const task = this;
    return new Promise((resolve, reject) => {
      store.bulkPut(slice).then(lastkey => {
        this.progress(Math.min(data.length, chunkNr * chunkSize), data.length, `Saving ${data.length} ${store.name} data to DB...`);
        if (chunkNr * chunkSize >= data.length) {
          return resolve(lastkey);
        }

        return task.saveChunked(data, store, chunkNr + 1, chunkSize).then(result => resolve(result)).catch(reason => reject(reason));
      }).catch(reason => {
        reject(reason);
      }).catch(Dexie.BulkError, (e) => {
        reject(e);
      });
    });
  }

  addRelationId(relationData) {
    relationData.id = hash(relationData);
    return relationData;
  }

  filterFilesByPath(files, types, sourceTypeId, filterTypes) {
    const patterns = [];
    const prefixes = [];
    _(types).forOwn((typeDefinition) => {
      if (filterTypes && !_.includes(filterTypes, typeDefinition.id)) {
        return;
      }
      if (typeDefinition.sourceType && typeDefinition.sourceType.id === sourceTypeId && typeDefinition.sourceType.pathPattern) {
        patterns.push(typeDefinition.sourceType.pathPattern.replace('{type.id}', typeDefinition.id));
        prefixes.push(typeDefinition.sourceType.pathPrefix.replace('{type.id}', typeDefinition.id));
      }
      if (typeDefinition.sourceType && typeDefinition.sourceType.id === sourceTypeId && typeDefinition.sourceType.path) {
        patterns.push(typeDefinition.sourceType.path.replace('{type.id}', typeDefinition.id));
        prefixes.push(typeDefinition.sourceType.path.replace('{type.id}', typeDefinition.id));
      }
    });

    return files.where('path').startsWithAnyOf(prefixes).filter(file => _(patterns).some(pattern => minimatch(file.path, pattern))).toArray();
  }
}
