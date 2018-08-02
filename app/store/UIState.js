import {observable, autorun} from 'mobx';

export default class UIState  {

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

}
