// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.css';
import { Paper, Typography } from 'material-ui';
import CircularProgress from 'material-ui/es/Progress/CircularProgress';
import LinearProgress from 'material-ui/es/Progress/LinearProgress';

const ipc = require('electron').ipcRenderer;

export default class ProgressInfo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      message: null,
      progress: null,
      total: null,
    };

    ipc.on('background-response', (sender, args) => {
      this.setState({
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
        {this.state.message && <CircularProgress variant={this.state.total === 0 || this.state.progress === 0 ? 'indeterminate' : 'determinate'} max={this.state.total} value={this.state.progress} color="secondary" />}
        {this.state.message && <div style={{
display: 'flex', marginLeft: 10, flexGrow: 1, alignItems: 'center', fontSize: '70%', overflowY: 'hidden'
}}
        >{this.state.message}
        </div>}
      </div>
    );
  }
}
