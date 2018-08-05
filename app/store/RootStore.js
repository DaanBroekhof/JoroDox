import {observable, autorun} from 'mobx';
import ProjectStore from './ProjectStore';
import UIState from './UIState';
import {RouterStore} from 'mobx-react-router';
import JdxDatabase from '../utils/JdxDatabase';

export default class RootStore {
  constructor() {
    this.projectStore = new ProjectStore(this, JdxDatabase.getProjects());
    this.uiState = new UIState(this);
    this.routingStore = new RouterStore();
  }

  gotoForce(location) {
    if (this.routingStore.location.pathname !== location) {
      this.routingStore.history.push(location);
    } else {
      this.routingStore.history.replace(location);
    }
  }

  goto(location) {
    if (this.routingStore.location.pathname !== location) {
      this.routingStore.history.push(location);
    }
  }
}
