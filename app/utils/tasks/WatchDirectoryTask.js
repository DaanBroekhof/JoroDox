import BackgroundTask from './BackgroundTask';

const fs = require('fs');

export default class WatchDirectoryTask extends BackgroundTask {
  static getTaskType() {
    return 'WatchDirectoryTask';
  }

  close() {
    this.sendRequest('close');
  }

  handleRequest(request) {
    if (request.type === 'close') {
      if (this.watcher) {
        this.watcher.close();
      }
    } else {
      super.handleRequest(request);
    }
  }

  execute(args) {
    this.watcher = fs.watch(args.rootDir, { recursive: true }, (eventType, filename) => {
      if (!filename) {
        return;
      }

      if (eventType === 'rename' || eventType === 'change') {
        this.sendResponse({ eventType, filename });
      }
    });
  }
}
