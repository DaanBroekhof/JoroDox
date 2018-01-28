const ipc = require('electron').ipcRenderer;

export default class BackgroundTask {
    constructor() {
        this.taskId = null;
    }


    static getTaskType() {
        return null
    }

    static start(args, progressCallback, successCallback, errorCallback) {
        let taskId = Math.random() * 10000000;

        ipc.on('background-response', (event, response) => {
            if (response.taskId === taskId) {
                if (response.type === 'progress') {
                    progressCallback(response.progress, response.total, response.message);
                }
                else if (response.type === 'finished') {
                    successCallback(response.result);
                }
                else if (response.type === 'failed') {
                    errorCallback(response.error);
                }
            }
        });

        ipc.send('background-request', {taskId: taskId, taskType: this.getTaskType(), args: args});
    }

    static handle(request) {
        let task = new this(request.taskId);
        task.taskId = request.taskId;
        task.execute(request.args)
    }

    execute(task) {
        // Do stuff
    }

    progress(progress, total, message) {
        ipc.send('background-response', {taskId: this.taskId, type: 'progress', progress: progress, total: total, message: message});
    }

    finish(result) {
        ipc.send('background-response', {taskId: this.taskId, type: 'finished', result: result});
    }

    fail(error) {
        ipc.send('background-response', {taskId: this.taskId, type: 'failed', error: error});
    }
}