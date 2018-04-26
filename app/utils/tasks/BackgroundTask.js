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

  static start(args, progressCallback, requestCallback) {
    const taskId = Math.random() * 10000000;

    this.resultPromise = new Promise((resolve, reject) => {
      ipc.on('background-response', function listener(event, response) {
        if (response.taskId === taskId) {
          if (response.type === 'progress' && progressCallback) {
            progressCallback(response.progress, response.total, response.message);
          } else if (response.type === 'finished') {
            ipc.removeListener('background-response', listener);
            resolve(response.result);
          } else if (response.type === 'failed') {
            ipc.removeListener('background-response', listener);
            reject(response.error);
          } else if (response.type === 'response' && requestCallback) {
            requestCallback(response.data);
          }
        }
      });
    });

    this.resultPromise.task = new this(taskId, 'sender');

    ipc.send('background-request', {
      taskId, type: 'execute', taskType: this.getTaskType(), args
    });

    return this.resultPromise;
  }

  static handle(request, from) {
    if (!this.taskMap[request.taskType] || !this.taskMap[request.taskType][request.taskId]) {
      if (!this.taskMap[request.taskType]) {
        this.taskMap[request.taskType] = {};
      }

      this.taskMap[request.taskType][request.taskId] = new this(request.taskId, 'receiver');
    }

    this.taskMap[request.taskType][request.taskId].from = from;

    this.taskMap[request.taskType][request.taskId].handleRequest(request);
  }

  async getResult(){
    return this.resultPromise;
  }

  async execute(task){
    // Do stuff
  }

  handleRequest(request) {
    this.taskTitle = '';
    if (request.type === 'execute') {
      if (request.args.taskTitle) {
        this.taskTitle = request.args.taskTitle;
      }

      try {
        const result = this.execute(request.args);
        if (result && result.then) {
          result.then(res => {
            return this.finish(res);
          }).catch(e => {
            console.error(e);
            this.fail(e.toString());
          });
        } else {
          this.finish(result);
        }
      } catch (e) {
        console.error(e);
        this.fail(e.toString());
      }
    }
  }

  sendRequest(type, data) {
    ipc.send('background-request', {taskId: this.taskId, type, data});
  }

  sendResponse(data) {
    (this.from ? this.from : ipc).send('background-response', {taskId: this.taskId, taskTitle: this.taskTitle, type: 'response', data});
  }

  progress(progress, total, message) {
    (this.from ? this.from : ipc).send('background-response', {
      taskId: this.taskId, taskTitle: this.taskTitle, type: 'progress', progress, total, message
    });
  }

  finish(result) {
    (this.from ? this.from : ipc).send('background-response', {taskId: this.taskId, taskTitle: this.taskTitle, type: 'finished', result});
    this.constructor.taskMap[this.constructor.getTaskType()][this.taskId] = null;
  }

  fail(error) {
    (this.from ? this.from : ipc).send('background-response', {taskId: this.taskId, taskTitle: this.taskTitle, type: 'failed', error});
    this.constructor.taskMap[this.constructor.getTaskType()][this.taskId] = null;
  }
}
