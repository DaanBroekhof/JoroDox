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

      // title: 'tesjhtjsjhtjkesh jkhhsdhfsjhdhj dajkshjk ahskjdh ajksdkjha skjdh',
      // message: 'test',
      // progress: 40,
      // total: 100,
    };


    this.eventListener = (sender, response) => {
      if (response.type === 'progress') {
        this.setState({
          title: response.taskTitle,
          message: response.message,
          total: response.total,
          progress: response.progress,
        });
      } else if (response.type === 'finished' || response.type === 'failed') {
        this.setState({
          message: null,
        });
      }
    };
    ipc.on('background-response', this.eventListener);
  }

  componentWillUnmount() {
    ipc.removeListener('background-response', this.eventListener);
  }

  render() {
    return (
      <div style={{
 display: 'flex', flexGrow: '1', alignItems: 'stretch', ...this.props.style
}}
      >
        {this.state.message && (
          <CircularProgress
            style={{marginTop: 5}}
            variant="indeterminate"
            color="secondary"
          />
        )}
        {this.state.message && (
          <div style={{display: 'flex', flexGrow: 0.5, marginLeft: 10, alignItems: 'stretch', flexDirection: 'column'}}>
            <div
              style={{display: 'flex', flexGrow: 1, alignItems: 'center', fontSize: '70%', overflow: 'hidden', paddingTop: 3}}
            >
              <span style={{overflow: 'hidden'}}>{this.state.title}<br />{this.state.message}</span>
            </div>
            <LinearProgress style={{backgroundColor: 'grey', height: 2, visibility: (this.state.total > 5 ? 'visible' : 'hidden')}} color="secondary" variant="determinate" value={(this.state.progress / this.state.total) * 100} />
          </div>

          )}
      </div>
    );
  }
}
