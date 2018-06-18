import React, {Component} from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Input from '@material-ui/core/Input';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import FormLabel from '@material-ui/core/FormLabel';
import JdxDatabase from '../utils/JdxDatabase';
import OperatingSystemTask from "../utils/tasks/OperatingSystemTask";

const {dialog} = require('electron').remote;

export default class ProjectsPage extends Component {
  openDirectory = () => {
    const dir = dialog.showOpenDialog({properties: ['openDirectory', 'showHiddenFiles']});

    if (dir && dir.length > 0) {
      this.props.handleChange({rootPath: dir[0]});
    }
  };
  clearCaches = () => {
    JdxDatabase.clearAll(this.props.project);
  };

  async deleteProject() {
    (await JdxDatabase.getProjects()).delete(this.props.project.id);
  }

  render() {
    if (!this.props.project) {
      return (
        <div />
      );
    }

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
        <div style={{display: 'flex', flexGrow: 0, flexShrink: 0}}>
          <Typography variant="display2" gutterBottom>Project `{this.props.project.name}`</Typography>
          <span style={{marginLeft: 20}}>
            <Tooltip id="tooltip-icon" title="Delete project" placement="bottom">
              <IconButton onClick={() => this.props.handleChange(false)}><Icon color="action">delete</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Create new project" placement="bottom">
              <IconButton onClick={() => this.props.handleChange(true)}><Icon color="action">add</Icon></IconButton>
            </Tooltip>
          </span>
        </div>

        <FormControl margin="normal" fullWidth>
          <InputLabel htmlFor="root-path">Name</InputLabel>
          <Input
            id="name"
            value={this.props.project.name}
            autoFocus
            onChange={(event) => {
              const newValue = event.target.value;
              this.props.handleChange({name: newValue});
            }}
          />
        </FormControl>
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
            value={this.props.project.gameType}
            onChange={(event) => this.props.handleChange({gameType: event.target.value})}
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
        <br />
        <FormControl margin="normal">
          <FormLabel component="legend">Actions</FormLabel>
        </FormControl>
        <br />
        <Button color="primary" variant="raised" style={{marginRight: '10px'}} onClick={this.clearCaches}>Clear game data cache</Button>
      </Paper>
    );
  }
}
