import BackgroundTask from './BackgroundTask';

const ipcRenderer = require('electron').ipcRenderer;


export default class ForegroundTask extends BackgroundTask {
  static taskMap = {};

  taskTitle = '';

  static start(args) {
    const taskId = Math.random() * 10000000;

    const task = new this(taskId, 'foreground');

    ForegroundTask.taskMap[taskId] = task;
    task.taskTitle = args.taskTitle;

    return task;
  }

  static handle(request, from) {
  }

  async getResult(){
  }

  async execute(task){
    // Do stuff
  }

  handleRequest(request) {

  }

  sendRequest(type, data) {
  }

  sendResponse(data) {
    ipcRenderer.send('background-response', {taskId: this.taskId, taskTitle: this.taskTitle, type: 'response', data});
  }

  progress(progress, total, message) {
    ipcRenderer.send('background-response', {
      taskId: this.taskId, taskTitle: this.taskTitle, type: 'progress', progress, total, message
    });
  }

  finish(result) {
    ipcRenderer.send('background-response', {taskId: this.taskId, taskTitle: this.taskTitle, type: 'finished', result});
    ForegroundTask.taskMap[this.taskId] = null;
  }

  fail(error) {
    ipcRenderer.send('background-response', {taskId: this.taskId, taskTitle: this.taskTitle, type: 'failed', error});
    ForegroundTask.taskMap[this.taskId] = null;
  }
}
