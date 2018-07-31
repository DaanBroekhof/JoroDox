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

  constructor(props) {
    super(props);

    this.state = {
      mods: {},
      dlcs: {},
    };
  }

  componentDidMount() {
    //this.loadModsDlcs();
  }

  componentWillReceiveProps(nextProps, nextState) {

    if (nextProps.project !== this.props.project) {
      //this.loadModsDlcs();
    }
  }

  async loadModsDlcs() {
    if (!this.props.project) {
      return;
    }

    const dlcs = this.props.project.dlcs ? this.props.project.dlcs : {};
    _.forOwn(dlcs, (dlc, name) => {
      dlc.exists = false;
    });
    const mods = this.props.project.mods ? this.props.project.mods : {};
    _.forOwn(mods, (mod, name) => {
      mod.exists = false;
    });

    const db = await JdxDatabase.get(this.props.project);

    (await db.dlcs.toArray()).forEach(dlc => {
      if (dlcs[dlc.name]) {
        dlcs[dlc.name].exists = true;
      } else {
        dlcs[dlc.name] = {
          name: dlc.name,
          exists: true,
          enabled: true,
        };
      }
    });
    (await db.mods.toArray()).forEach(mod => {
      if (mods[mod.name]) {
        mods[mod.name].exists = true;
      } else {
        mods[mod.name] = {
          name: mod.name,
          exists: true,
          enabled: false,
        };
      }
    });

    this.setState({dlcs, mods});
  }

  selectRootDirectory = () => {
    const dir = dialog.showOpenDialog({properties: ['openDirectory', 'showHiddenFiles']});

    if (dir && dir.length > 0) {
      this.props.handleChange({rootPath: dir[0]});
    }
  };

  selectUserDirectory = () => {
    const dir = dialog.showOpenDialog({properties: ['openDirectory', 'showHiddenFiles']});

    if (dir && dir.length > 0) {
      this.props.handleChange({userPath: dir[0]});
    }
  };

  clearCaches = () => {
    JdxDatabase.clearAll(this.props.project);
  };

  toggleDlc = (dlcName) => {
    this.state.dlcs[dlcName].enabled = !this.state.dlcs[dlcName].enabled;

    this.props.handleChange({dlcs: this.state.dlcs});
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
          <InputLabel htmlFor="game-root-path">Game root path</InputLabel>
          <Input
            disabled
            id="game-root-path"
            value={this.props.project.rootPath}
            onChange={(event) => this.props.handleChange({rootPath: event.target.value})}
          />
        </FormControl>
        <Button color="primary" variant="raised" style={{marginRight: '10px'}} onClick={this.selectRootDirectory}>Change game root path...</Button>
        <br />
        <FormControl margin="normal" fullWidth>
          <InputLabel htmlFor="user-root-path">User root path</InputLabel>
          <Input
            disabled
            id="user-root-path"
            value={this.props.project.userPath}
            onChange={(event) => this.props.handleChange({userPath: event.target.value})}
          />
        </FormControl>
        <Button color="primary" variant="raised" style={{marginRight: '10px'}} onClick={this.selectUserDirectory}>Change user root path...</Button>
        <br />
        <FormControl margin="normal">
          <InputLabel htmlFor="age-helper">Game type</InputLabel>
          <Select
            value={this.props.project.gameType}
            onChange={(event) => this.props.handleChange({gameType: event.target.value})}
            input={<Input name="definition-type" id="definition-type" />}
          >
            {_.values(JdxDatabase.getDefinitions()).map(definition => {
              return <MenuItem key={definition.id} value={definition.id}>{definition.name}</MenuItem>
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
          <FormLabel component="legend">DLCs</FormLabel>
          {_.values(this.state.dlcs).map(dlc => (
            <FormControlLabel
              key={dlc.name}
              control={
                <Checkbox
                  style={{height: 'auto'}}
                  checked={dlc.enabled}
                  onChange={this.toggleDlc(dlc.name)}
                  value="1"
                  color="primary"
                />
              }
              label={dlc.name}
            />
          ))}
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
