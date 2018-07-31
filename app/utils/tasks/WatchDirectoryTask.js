import BackgroundTask from './BackgroundTask';

const fs = require('fs');
const jetpack = require('fs-jetpack');
const path = require('path');

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
        this.resolveFunc();
      }
    } else {
      super.handleRequest(request);
    }
  }

  execute(args) {
    let eventsBuffer = [];
    this.lastEventTimestamp = 0;

    this.watcher = fs.watch(args.rootDir, {recursive: true}, (rawEventType, filename) => {
      if (!filename) {
        return;
      }

      const info = jetpack.inspect(path.join(args.rootDir, filename));

      let eventType = rawEventType;
      if (!info && rawEventType === 'rename') {
        eventType = 'delete';
      } else if (info && info.type === 'file' && rawEventType === 'change') {
        eventType = 'fileChange';
      } else if (info && info.type === 'file' && rawEventType === 'rename') {
        eventType = 'fileRename';
      } else if (info && info.type === 'dir' && rawEventType === 'change') {
        eventType = 'dirChange';
      } else if (info && info.type === 'dir' && rawEventType === 'rename') {
        eventType = 'dirRename';
      } else {
        eventType = 'unknown';
      }

      eventsBuffer.push({filename, eventType, info});

      this.lastEventTimestamp = new Date().getTime();
      const eventTimestamp = this.lastEventTimestamp;

      new Promise(resolve => setTimeout(resolve, 200)).then(() => {
        if (this.lastEventTimestamp === eventTimestamp) {
          // console.log(eventsBuffer.length);
          const events = eventsBuffer;
          eventsBuffer = [];
          this.sendResponse(events);
        }
        return null;
      }).catch(e => console.log(e));
    });

    return new Promise((resolve, reject) => {
      this.resolveFunc = resolve;
      this.rejectFunc = reject;
    });
  }
}
