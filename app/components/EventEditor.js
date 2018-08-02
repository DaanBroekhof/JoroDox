// @flow
import React, {Component} from 'react';

import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import TextField from '@material-ui/core/TextField';

import _ from 'lodash';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux';
import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';
import JdxDatabase from '../utils/JdxDatabase';


class EventEditor extends Component {
  constructor(props) {
    super(props);

    const definition = JdxDatabase.getDefinition(props.project.gameType);

    this.state = {
      item: null,
      type: 'events',
      typeDefinition: JdxDatabase.findTypeDefinition(props.project, 'events'),
      relationsFrom: [],
      relationsTo: [],
      translations: [],
      definition,
    };
  }

  componentDidMount() {
    this.loadItemData(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.loadItemData(nextProps);

    if (nextProps.project.gameType !== this.props.project.gameType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.gameType)});
    }

    if (nextProps.databaseVersion !== this.props.databaseVersion) {
      //this.props.reloadGrid(this.gridSettings, this.getDataSource(nextProps.project.rootPath, nextProps.match.params.type, nextProps.match.params.id));
    }
  }

  async loadItemData(props) {

    const relations = await JdxDatabase.loadRelations(props.project, this.state.type, props.id);
    const item = await JdxDatabase.getItem(props.project, 'events', props.id);

    const translationIds = _.castArray(_.get(item, 'data.option', [])).map(x => x.name).concat([item.data.title, item.data.desc]).map(x => 'l_english.' + x);

    let translations = await JdxDatabase.getItems(props.project, 'localisation', translationIds);

    translations = _.zipObject(translations.map(x => x.name), translations.map(x => x.data.value));

    return this.setState({...relations, item, translations});
  }
  async getItem(props) {
    return this.setState({item: await JdxDatabase.getItem(props.project, 'events', props.id)});
  }

  render() {
    if (!this.props.id) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>No event specified.</p></Paper>);
    }
    if (!this.state.item) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>No event specified.</p></Paper>);
    }

    const itemPath = JdxDatabase.getItemPath(this.props.project, this.state.item, this.state.relationsFrom);

    console.log(this.state.item);

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
        <div style={{display: 'flex'}}>
          <Typography variant="display1" gutterBottom>
            <Link to={`/structure/t/${this.state.typeDefinition.id}`}>{this.state.typeDefinition.title}</Link>: {this.state.event}
          </Typography>
          <span style={{marginLeft: 20}}>
            <Tooltip id="tooltip-icon" title="Show in file explorer" placement="bottom">
              <IconButton onClick={() => OperatingSystemTask.start({showItemInFolder: itemPath})}><Icon color="action">pageview</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Open in operating system" placement="bottom">
              <IconButton onClick={() => OperatingSystemTask.start({openItem: itemPath})}><Icon color="action">open_in_new</Icon></IconButton>
            </Tooltip>
          </span>
        </div>

        <Paper style={{padding: 20, paddingTop: 0, width: 600}}>
          <FormControl fullWidth>
            <TextField
              id="name"
              label="Title"
              value={this.state.translations[this.state.item.data.title]}
              onChange={{}}
              margin="normal"
            />
          </FormControl>
          <FormControl fullWidth>
            <TextField
              id="multiline-flexible"
              label="Description"
              multiline
              rowsMax="6"
              value={this.state.translations[this.state.item.data.desc]}
              onChange={{}}
              margin="normal"
            />
          </FormControl>
          <div>{this.state.item.data.id}</div>
          <div>{this.state.item.data.picture}</div>
        </Paper>


        {this.state.relationsFrom.length > 0 && (
          <div>
            <h4>References to ({this.state.relationsFrom.length})</h4>
            <ul>
              {this.state.relationsFrom.slice(0, 1000).map(r => (
                <li key={r.id}>{r.toKey}: <Link to={`/structure/t/${r.toType}/${r.toId}`}>{r.toId}</Link></li>
              ))}
            </ul>
          </div>
        )}
        {this.state.relationsTo.length > 0 && (
          <div>
            <h4>Referenced in ({this.state.relationsTo.length})</h4>
            <ul>
              {this.state.relationsTo.slice(0, 1000).map(r => (
                <li key={r.id}>{r.fromKey}: <Link to={`/structure/t/${r.fromType}/${r.fromId}`}>{r.fromId}</Link></li>
              ))}
            </ul>
          </div>
        )}

      </Paper>
    );
  }
}

const mapStateToProps = state => {
  return {
    databaseVersion: state.database,
  };
};

export default EventEditor;
