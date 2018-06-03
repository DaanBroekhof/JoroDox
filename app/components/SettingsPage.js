import React, {Component} from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

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
