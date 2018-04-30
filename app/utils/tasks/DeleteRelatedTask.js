import async from 'async';
import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const _ = require('lodash');

export default class DeleteRelatedTask extends DbBackgroundTask {
  static getTaskType() {
    return 'DeleteRelatedTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);

    this.progress(0, 1, 'Removing related data...');

    const deleteCount = await this.deleteTypeItems(db, args.type, args.typeIds);

    this.progress(1, 1, 'Removing related data...');

    return deleteCount;
  }

  async deleteTypeItems(db, type, typeIds) {
    let totalDeleted = 0;

    // Delete existing
    if (type !== 'files') {
      const typesDel = await this.deleteChunked(db[type].where(db[type].schema.primKey.keyPath).anyOf(typeIds));
      const relationsDel = await this.deleteChunked(db.relations.where('[fromType+fromId]').anyOf(typeIds.map(x => [type, x])));
      totalDeleted = typesDel + relationsDel;
    }

    // Fetch source relations
    const relationKeys = typeIds.map(x => [type, x, 'source']);
    const relations = await db.relations.where('[toType+toId+toKey]').anyOf(relationKeys).toArray();
    const typeDeletion = {};
    relations.forEach((relation) => {
      if (!typeDeletion[relation.fromType]) {
        typeDeletion[relation.fromType] = [];
      }
      typeDeletion[relation.fromType].push(relation.fromId);
    });

    // Delete source type data
    for (const subType in typeDeletion) {
      if (db[subType]) {
        totalDeleted += await this.deleteTypeItems(db, subType, typeDeletion[subType]);
      }
    }

    return totalDeleted;
  }
}