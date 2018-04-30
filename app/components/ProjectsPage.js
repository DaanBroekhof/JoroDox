import React, {Component} from 'react';
import {Paper, Typography, FormControl, InputLabel, Input, Select, MenuItem, Button, FormControlLabel, Checkbox, FormLabel} from 'material-ui';

const {dialog} = require('electron').remote;

export default class ProjectsPage extends Component {


  openDirectory = () => {
    const dir = dialog.showOpenDialog({properties: ['openDirectory', 'showHiddenFiles']});

    if (dir && dir.length > 0) {
      this.props.handleChange({rootPath: dir[0]});
    }
  };

  render() {
    return (
      <Paper style={{flex: 1, margin: 20, padding: 20}}>
        <Typography variant="display2" gutterBottom>Project settings</Typography>
        <FormControl margin="normal" fullWidth>
          <InputLabel htmlFor="root-path">Root path</InputLabel>
          <Input
            disabled
            id="root-path"
            value={this.props.project.rootPath}
            onChange={(event) => this.props.handleChange({rootPath: event.target.value})}
          />
        </FormControl>
        <Button color="primary" variant="raised" style={{marginRight: '10px'}} onClick={this.openDirectory}>Change root path...</Button>
        <br />
        <FormControl margin="normal">
          <InputLabel htmlFor="age-helper">Game type</InputLabel>
          <Select
            value={this.props.project.definitionType}
            onChange={(event) => this.props.handleChange({definitionType: event.target.value})}
            input={<Input name="definition-type" id="definition-type" />}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            <MenuItem value="eu4">Europa Universalis 4</MenuItem>
            <MenuItem value="stellaris">Stellaris</MenuItem>
          </Select>
        </FormControl>
        <br />
        <FormControl margin="normal">
          <FormLabel component="legend">Options</FormLabel>
          <FormControlLabel
            control={
              <Checkbox
                checked={this.props.project.watchDirectory}
                onChange={(event) => {
                  this.props.handleChange({watchDirectory: event.target.checked})
                }}
                value="1"
                color="primary"
              />
            }
            label="Watch project files and directories for changes"
          />
        </FormControl>
      </Paper>
    );
  }
}
