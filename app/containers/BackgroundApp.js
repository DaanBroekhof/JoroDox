// @flow
import React, {Component} from 'react';

const ipc = require('electron').ipcRenderer;

import FileLoaderTask from '../utils/tasks/FileLoaderTask';
import PdxScriptParserTask from '../utils/tasks/PdxScriptParserTask';
import PdxDataParserTask from '../utils/tasks/PdxDataParserTask';
import StructureLoaderTask from '../utils/tasks/StructureLoaderTask';
import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';
import LuaScriptParserTask from '../utils/tasks/LuaScriptParserTask';
import StructureScannerTask from '../utils/tasks/StructureScannerTask';
import CsvFileParserTask from '../utils/tasks/CsvFileParserTask';
import PdxYmlFileParserTask from '../utils/tasks/PdxYmlFileParserTask';

export default class BackgroundApp extends Component {
  constructor(props) {
    super(props);

    ipc.removeAllListeners('background-request');
    ipc.on('background-request', (event, request) => {
      switch (request.taskType) {
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
        case LuaScriptParserTask.getTaskType():
          LuaScriptParserTask.handle(request);
          break;
        case CsvFileParserTask.getTaskType():
          CsvFileParserTask.handle(request);
          break;
        case PdxYmlFileParserTask.getTaskType():
          PdxYmlFileParserTask.handle(request);
          break;
        case StructureScannerTask.getTaskType():
          StructureScannerTask.handle(request);
          break;
      }
    });
  }

  render() {
    return (
      <div>Le background window</div>
    );
  }
}
