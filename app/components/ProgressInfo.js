// @flow
import React, {Component} from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';
import LinearProgress from '@material-ui/core/LinearProgress';

const ipc = require('electron').ipcRenderer;

export default class ProgressInfo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      title: null,
      message: null,
      progress: null,
      total: null,
    };

    ipc.on('background-response', (sender, args) => {
      this.setState({
        title: args.taskTitle,
        message: args.message,
        total: args.total,
        progress: args.progress,
      });
    });
  }

  render() {
    return (
      <div style={{
 display: 'flex', flexGrow: '1', alignItems: 'stretch', ...this.props.style
}}
      >
        {this.state.message && (
          <CircularProgress
            variant={this.state.total === 0 || this.state.progress === 0 ? 'indeterminate' : 'determinate'}
            max={this.state.total}
            value={this.state.progress}
            color="secondary"
          />
        )}
        {this.state.message && (
          <div
            style={{display: 'flex', marginLeft: 10, flexGrow: 1, alignItems: 'center', fontSize: '70%', overflowY: 'hidden'}}
          >{this.state.title}<br />{this.state.message}
          </div>
        )}
      </div>
    );
  }
}
