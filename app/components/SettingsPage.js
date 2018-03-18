import React, {Component} from 'react';
import {Paper, Typography} from 'material-ui';

export default class SettingsPage extends Component {
  render() {
    return (
      <Paper style={{flex: 1, margin: 20, padding: 20}}>
        <Typography variant="display2" gutterBottom>Settings</Typography>
        <p>Nothing to set yet~</p>
      </Paper>
    );
  }
}
