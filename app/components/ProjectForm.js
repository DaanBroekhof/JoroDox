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
import {inject, observer} from 'mobx-react';
import Project from '../models/Project';
import JdxDatabase from '../utils/JdxDatabase';
import OperatingSystemTask from "../utils/tasks/OperatingSystemTask";
import PropTypes from 'prop-types';

const {dialog} = require('electron').remote;

type Props = {
  project: Project
};

@observer
export default class ProjectForm extends Component<Props> {
  openDirectory = () => {
    const dir = dialog.showOpenDialog({properties: ['openDirectory', 'showHiddenFiles']});

    if (dir && dir.length > 0) {
      this.props.project.rootPath = dir[0];
    }
  };

  clearCaches = () => {
    this.props.project.clearAll();
  };

  render() {
    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
        <div style={{display: 'flex', flexGrow: 0, flexShrink: 0}}>
          <Typography variant="display2" gutterBottom>Project `{this.props.project.name}`</Typography>
          <span style={{marginLeft: 20}}>
            <Tooltip id="tooltip-icon" title="Delete project" placement="bottom">
              <IconButton onClick={() => this.props.project.delete()}><Icon color="action">delete</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Create new project" placement="bottom">
              <IconButton onClick={() => {
                const project = this.props.project.store.createProject();
                project.name = 'New Project';
                project.store.currentProject = project;
              }}><Icon color="action">add</Icon></IconButton>
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
              this.props.project.name = event.target.value;
            }}
          />
        </FormControl>
        <FormControl margin="normal" fullWidth>
          <InputLabel htmlFor="root-path">Root path</InputLabel>
          <Input
            disabled
            id="root-path"
            value={this.props.project.rootPath}
            onChange={(event) => {
              this.props.project.rootPath = event.target.value;
            }}
          />
        </FormControl>
        <Button color="primary" variant="raised" style={{marginRight: '10px'}} onClick={this.openDirectory}>Change root path...</Button>
        <br />
        <FormControl margin="normal" style={{width: 300}}>
          <InputLabel>Game type</InputLabel>
          <Select
            value={this.props.project.gameType.toString()}
            onChange={(event) => this.props.project.gameType = event.target.value}
            input={<Input name="definition-type" id="definition-type" />}
          >
            {[{id: '', name: <em>- Unknown -</em>}].concat(_.values(JdxDatabase.getDefinitions())).map(definition => {
              return <MenuItem key={definition.id + '-id'} value={definition.id}>{definition.name}</MenuItem>;
            })}
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
                  this.props.project.watchDirectory = event.target.checked;
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
