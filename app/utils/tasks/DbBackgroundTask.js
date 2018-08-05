import Dexie from 'dexie';
import BackgroundTask from './BackgroundTask';
import XXHash from 'xxhashjs';

const hash = require('object-hash');
const minimatch = require('minimatch');

export default class DbBackgroundTask extends BackgroundTask {

  progressReportRate = 20;

  saveChunked(data, store, chunkNr, chunkSize) {
    if (chunkSize <= 0) {
      throw new Error('Invalid chunk size');
    }

    const slice = data.slice(chunkNr * chunkSize, (chunkNr + 1) * chunkSize);

    const task = this;
    return new Promise((resolve, reject) => {
      store.bulkPut(slice).then(lastkey => {
        this.progress(Math.min(data.length, chunkNr * chunkSize), data.length, `Saving ${data.length} '${store.name}' items to DB...`);
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
    relationData.id = XXHash.h64(
      [relationData.fromKey, relationData.fromType, relationData.fromId, relationData.toKey, relationData.toType, relationData.toId].join(','),
      42
    ).toString(16);

    return relationData;
  }

  filterFilesByPath(files, types, sourceTypeId, filterTypes, paths) {
    if (paths) {
      return paths;
    }

    const patterns = [];
    const prefixes = [];
    _(types).forOwn((typeDefinition) => {
      if (filterTypes) {
        if (!_.includes(filterTypes, typeDefinition.id)) {
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
      }
    });

    return files.where('path').startsWithAnyOf(prefixes).filter(file => _(patterns).some(pattern => minimatch(file.path, pattern))).primaryKeys();
  }

  async deleteMissing(newData, existingStorage, types, sourceTypeId, filterTypes, paths) {
    const foundPaths = newData.map(x => x.path);
    const existingData = await this.filterFilesByPath(existingStorage, types, 'pdx_scripts', filterTypes, paths);
    const missingFiles = existingData.filter(x => !foundPaths.includes(x));
    if (missingFiles.length !== 0) {
      await this.deleteChunked(existingStorage.where('path').anyOf(missingFiles));
    }

    return missingFiles;
  }

  static filterPaths(typeDefinition, paths) {
    return paths.filter(path => {
      let valid = true;
      if (typeDefinition.sourceType) {
        if (typeDefinition.sourceType.pathPattern) {
          valid = valid && minimatch(path, typeDefinition.sourceType.pathPattern.replace('{type.id}', typeDefinition.id));
        }
        if (typeDefinition.sourceType.pathPrefix) {
          valid = valid && _.startsWith(path, typeDefinition.sourceType.pathPrefix.replace('{type.id}', typeDefinition.id));
        }
        if (typeDefinition.sourceType.path) {
          valid = valid && typeDefinition.sourceType.path === path;
        }
      }

      return valid;
    });
  }

  async deleteChunked(collection, chunkSize) {
    let stepNr = 0;
    const deleteChunkSize = chunkSize ? chunkSize : 1000;
    let total = 0;
    let nrDeleted = 0;

    do {
      this.progress(0, 1, 'Removing DB items...' + (stepNr > 0 ? ' ' + stepNr : ''));
      nrDeleted = await collection.limit(deleteChunkSize).delete();
      total += nrDeleted;
      stepNr += 1;
    } while (nrDeleted === chunkSize)

    this.progress(1, 1, 'Removing DB items...' + (stepNr > 0 ? ' ' + stepNr : ''));

    return total;
  }
}
