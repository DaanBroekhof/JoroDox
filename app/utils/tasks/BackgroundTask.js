const ipc = require('electron').ipcRenderer;
const ipcMain = require('electron').ipcMain;


export default class BackgroundTask {
    static taskMap = {};

    from = null;

    constructor(taskId, role) {
      this.taskId = taskId || null;
      this.role = role;
    }


    static getTaskType() {
      return null;
    }

    static start(args, progressCallback, successCallback, errorCallback, requestCallback) {
      const taskId = Math.random() * 10000000;

      ipc.on('background-response', function listener(event, response) {
        if (response.taskId === taskId) {
          if (response.type === 'progress' && progressCallback) {
            progressCallback(response.progress, response.total, response.message);
          } else if (response.type === 'finished' && successCallback) {
            successCallback(response.result);
            ipc.removeListener('background-response', listener);
          } else if (response.type === 'failed' && errorCallback) {
            errorCallback(response.error);
            ipc.removeListener('background-response', listener);
          } else if (response.type === 'response' && requestCallback) {
            requestCallback(response.data);
          }
        }
      });

      ipc.send('background-request', {
        taskId, type: 'execute', taskType: this.getTaskType(), args
      });

      return new this(taskId, 'sender');
    }

    static handle(request, from) {
      if (!this.taskMap[request.taskType] || !this.taskMap[request.taskType][request.taskId]) {
        if (!this.taskMap[request.taskType]) { this.taskMap[request.taskType] = {}; }

        this.taskMap[request.taskType][request.taskId] = new this(request.taskId, 'receiver');
      }

      this.taskMap[request.taskType][request.taskId].from = from;

      this.taskMap[request.taskType][request.taskId].handleRequest(request);
    }

    async execute(task) {
      // Do stuff
    }

    handleRequest(request) {
      if (request.type === 'execute') {

        try {
          const result = this.execute(request.args);
          if (result && result.then) {
            result.then(res => {
              return this.finish(res);
            }).catch(e => {
              this.fail(e.toString());
            });
          } else {
            this.finish(result);
          }
        } catch (e) {
          this.fail(e.toString());
        }
      }
    }

    sendRequest(type, data) {
      ipc.send('background-request', {taskId: this.taskId, type, data});
    }

    sendResponse(data) {
      (this.from ? this.from : ipc).send('background-response', {taskId: this.taskId, type: 'response', data});
    }

    progress(progress, total, message) {
      (this.from ? this.from : ipc).send('background-response', {
        taskId: this.taskId, type: 'progress', progress, total, message
      });
    }

    finish(result) {
      (this.from ? this.from : ipc).send('background-response', {taskId: this.taskId, type: 'finished', result});
      this.constructor.taskMap[this.constructor.getTaskType()][this.taskId] = null;
    }

    fail(error) {
      (this.from ? this.from : ipc).send('background-response', {taskId: this.taskId, type: 'failed', error});
      this.constructor.taskMap[this.constructor.getTaskType()][this.taskId] = null;
    }
}
