// @flow
import React, { Component } from 'react';
const ipc = require('electron').ipcRenderer;
import FileLoaderTask from "../utils/tasks/FileLoaderTask";

export default class BackgroundApp extends Component {
    constructor(props) {
        super(props);

        ipc.on('background-request', (event, request) => {

            switch (request.taskType)
            {
                case FileLoaderTask.getTaskType():
                    FileLoaderTask.handle(request);
                    break;
                default:
                    handler.fail('No task handler found.');
            }
        });
    }

    render() {
        return (
            <div>Le background window</div>
        );
    }
}
