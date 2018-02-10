// @flow
import React, { Component } from 'react';
const ipc = require('electron').ipcRenderer;
import FileLoaderTask from "../utils/tasks/FileLoaderTask";
import PdxScriptParserTask from "../utils/tasks/PdxScriptParserTask";
import PdxDataParserTask from "../utils/tasks/PdxDataParserTask";
import StructureLoaderTask from "../utils/tasks/StructureLoaderTask";

export default class BackgroundApp extends Component {
    constructor(props) {
        super(props);

        ipc.on('background-request', (event, request) => {

            switch (request.taskType)
            {
                case FileLoaderTask.getTaskType():
                    FileLoaderTask.handle(request);
                    break;
                case PdxScriptParserTask.getTaskType():
                    PdxScriptParserTask.handle(request);
                    break;
                case PdxDataParserTask.getTaskType():
                    PdxDataParserTask.handle(request);
                    break;
                case StructureLoaderTask.getTaskType():
                    StructureLoaderTask.handle(request);
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
