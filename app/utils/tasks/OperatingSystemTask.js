import BackgroundTask from './BackgroundTask';

const shell = require('electron').shell;

export default class OperatingSystemTask extends BackgroundTask {
  static getTaskType() {
    return 'OperatingSystemTask';
  }

  execute(args) {
    if (args.showItemInFolder) {
      shell.showItemInFolder(args.showItemInFolder);
    }
    if (args.openItem) {
      shell.openItem(args.openItem);
    }
  }
}
