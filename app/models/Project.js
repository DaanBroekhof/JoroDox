import {observable, autorun, reaction, computed} from 'mobx';
import uuid from 'node-uuid';
import JdxDatabase from '../utils/JdxDatabase';

export default class Project {
  id = null;

  @observable name = '';
  @observable rootPath = '';
  @observable gameType = '';
  @observable isCurrent = false;
  @observable watchDirectory = false;

  @observable lastGlobalUpdate = false;
  @observable databaseVersion = 1;
  @observable typeIds = {};
  @observable errorsVersion = 1;

  store = null;

  /**
   * Indicates whether changes in this object
   * should be submitted to the server
   */
  autoSave = true;

  /**
   * Disposer for the side effect that automatically
   * stores this Todo, see @dispose.
   */
  saveHandler = null;

  constructor(store, id = uuid.v4()) {
    this.store = store;
    this.id = id;

    this.saveHandler = reaction(
      // observe everything that is used in the JSON:
      () => this.asJson,
      // if autoSave is on, send json to server
      (json) => {
        if (this.autoSave) {
          this.store.projectsDb.put(json);
        }
      }
    );

    this.countHandler = autorun(async () => {
      this.databaseVersion;
      if (this.isCurrent && this.rootPath) {
        const typeIds = await JdxDatabase.getAllIdentifiers(this);
        this.typeIds = typeIds;
      }
    }, {delay: 0});
  }

  /**
   * Remove this todo from the client and server
   */
  async delete() {
    await this.store.projectsDb.delete(this.id);
    this.store.removeProject(this);
  }

  @computed get
  asJson() {
    return {
      id: this.id,
      name: this.name,
      rootPath: this.rootPath,
      gameType: this.gameType,
      isCurrent: this.isCurrent,
      watchDirectory: this.watchDirectory,
      lastGlobalUpdate: this.lastGlobalUpdate,
    };
  }

  @computed get
  definition() {
    return JdxDatabase.getDefinition(this.gameType);
  }

  /**
   * Update this todo with information from the server
   */
  updateFromJson(json) {
    // make sure our changes aren't send back to the server
    this.autoSave = false;

    this.name = json.name;
    this.rootPath = json.rootPath;
    this.gameType = json.gameType;
    this.isCurrent = json.isCurrent;
    this.watchDirectory = json.watchDirectory;
    this.lastGlobalUpdate = json.lastGlobalUpdate;

    this.autoSave = true;
  }

  async updateTypeIds(type) {
    this.typeIds[type] = await JdxDatabase.updateTypeIdentifiers(this, type);
  }

  async clearAll() {
    await JdxDatabase.clearAll(this);
    this.databaseVersion += 1;
  }

  dispose() {
    // clean up the observer
    this.saveHandler();
    this.countHandler();
  }
}
