// @flow
import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import styles from './Home.css';
import {Paper, Typography} from 'material-ui';

export default class Home extends Component {
  render() {
    return (
      <Paper style={{flex: 1, margin: 20, padding: 20}}>
        <Typography variant="display2" gutterBottom>Home page</Typography>
        <p>It&quot;s just a start...</p>
      </Paper>
    );
  }
}
