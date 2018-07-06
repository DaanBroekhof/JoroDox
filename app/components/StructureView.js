// @flow
import React, {Component} from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import _ from 'lodash';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux';
import {Column} from 'react-virtualized';
import JdxDatabase from '../utils/JdxDatabase';
import PdxScriptParserTask from '../utils/tasks/PdxScriptParserTask';
import PdxDataParserTask from '../utils/tasks/PdxDataParserTask';
import StructureLoaderTask from '../utils/tasks/StructureLoaderTask';
import DeleteRelatedTask from '../utils/tasks/DeleteRelatedTask';
import {incrementVersion} from '../actions/database';
import ItemGrid from './ItemGrid';
import SchemaValidatorTask from "../utils/tasks/SchemaValidatorTask";

class StructureView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ids: {},
      definition: props.project ? JdxDatabase.getDefinition(props.project.gameType) : null,
    };
  }

  componentDidMount() {
    this.reloadCounts();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.project.gameType !== this.state.gameType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.gameType)});
    }
    if (nextProps.project.rootPath !== this.props.project.rootPath) {
      // reload grid?
    }
    if (nextProps.databaseVersion !== this.props.databaseVersion) {
      this.reloadCounts();
    }
  }

  reloadCounts() {
    if (!this.props.project) {
      return;
    }

    JdxDatabase.getAllIdentifiers(this.props.project).then(ids => {
      return this.setState({ids});
    }).catch((e) => {
      console.error(e);
    });
  }

  reloadType(typeId) {
    const type = _(this.state.definition.types).find(x => x.id === typeId);
    if (!type) {
      return;
    }

    if (type.reader === 'FileLoader') {
      this.reloadStructure();
    } else if (type.reader === 'PdxScriptParser') {
      this.loadPdxScripts();
    } else if (type.reader === 'PdxDataParser') {
      this.loadPdxData();
    } else if (type.reader === 'StructureLoader') {
      this.loadStructureData(typeId);
    }
  }

  loadStructureData(typeId) {
    _(this.state.definition.types).forEach(type => {
      if (type.sourceType && (!typeId || type.id === typeId)) {
        StructureLoaderTask.start(
          {project: this.props.project, typeDefinition: type},
          (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
        );
      }
    });
  }

  deleteRelatedTest() {
    DeleteRelatedTask.start(
      {project: this.props.project, type: 'files', typeIds: ['common/ages/00_default.txt'], types: this.state.definition.types},
      (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
    );
  }

  loadPdxScripts() {
    PdxScriptParserTask.start(
      {project: this.props.project},
      (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
    );
  }

  loadPdxData() {
    PdxDataParserTask.start(
      {project: this.props.project},
      (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
    );
  }

  reloadStructure() {
    return JdxDatabase.reloadAll(this.props.project);
  }

  reloadTypeById(typeId) {
    return JdxDatabase.reloadTypeById(this.props.project, typeId).then(() => {
      console.log(`Finished loading ${typeId}`);
    });
  }

  async reloadAll() {
    const types = this.state.definition.types
      .filter(x => x.reader === 'StructureLoader')
      .filter(x => !this.props.match.params.category || this.props.match.params.category === (x.category || 'Game structures'));

    await JdxDatabase.deleteAllErrors(this.props.project);
    await JdxDatabase.reloadTypesByIds(this.props.project, types);

    if (!this.props.match.params.category) {
      this.props.handleProjectChange({lastGlobalUpdate: new Date()});
    }
    this.props.incrementDatabaseVersion();
  }

  async validateAll() {
    const types = this.state.definition.types
      .filter(x => x.reader === 'StructureLoader')
      .filter(x => !this.props.match.params.category || this.props.match.params.category === (x.category || 'Game structures'));

    await JdxDatabase.deleteAllErrors(this.props.project);

    types.forEach(type => {
      new Promise((resolve, reject) => {
        SchemaValidatorTask.start(
          {
            project: this.props.project,
            typeDefinition: type,
            taskTitle: 'Validating `' + type.id + '`',
          },
          (progress, total, message) => null,
          (result) => {
            resolve(result);
            console.log('results');
            console.log(result);
          },
          (error) => {
            reject(error);
            console.error(error);
          },
        );
      });
    });
  }

  reloadDiff() {
    JdxDatabase.loadByPaths(this.props.project, null, null, 'Synchronizing changes...').then(() => {
      if (!this.props.match.params.category) {
        this.props.handleProjectChange({lastGlobalUpdate: new Date()});
      }
    });
  }

  render() {
    if (!this.state.definition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>No data.</p></Paper>);
    }

    let extendedTypes = this.state.definition.types.map(type => {
      if (this.state.ids && this.state.ids[type.id] && this.state.ids[type.id].size !== type.totalCount) {
        const typeCopy = Object.assign({}, type);
        typeCopy.totalCount = this.state.ids[type.id].size;
        return typeCopy;
      }
      return type;
    }).filter(x => !this.props.match.params.category || this.props.match.params.category === (x.category || 'Game structures'));
    extendedTypes = _.sortBy(extendedTypes, x => x.title);

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 200}}>
        <Typography variant="display2">{this.props.match.params.category || this.state.definition.name} - Game Data</Typography>
        <Typography variant="subheading" gutterBottom style={{color: 'grey'}}>
          Last global change: {this.props.project.lastGlobalUpdate ? (new Date(this.props.project.lastGlobalUpdate)).toLocaleString() : <i>- unknown -</i>}
        </Typography>
        <div style={{display: 'flex', flexDirection: 'row', marginBottom: 20, minHeight: 25}}>
          {/*
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadStructure()}>Load raw file data</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadPdxScripts()}>Load PDX scripts</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadPdxData()}>Load PDX data assets</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadStructureData()}>Load game structures</Button><br />
          */}
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadAll()}>Reload all</Button>
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.validateAll()}>Validate all</Button>
          {!this.props.match.params.category &&
            <span>
              <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadDiff()}>Reload diff</Button>
            </span>
          }


        </div>
        <div className="ItemGrid">
          <ItemGrid list={extendedTypes} databaseVersion={this.props.databaseVersion}>
            <Column
              dataKey="title"
              label="Title"
              width={100}
              cellRenderer={({rowData}) => <Link to={`/structure/t/${rowData.id}`}>{rowData.title}</Link>}
            />
            <Column
              dataKey="totalCount"
              label="Item count"
              width={50}
            />
            <Column
              dataKey="actions"
              label="Actions"
              width={50}
              cellRenderer={({rowData}) => <div></div>}
            />
          </ItemGrid>
        </div>
      </Paper>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  incrementDatabaseVersion: () => {
    dispatch(incrementVersion());
  }
});

const mapStateToProps = state => {
  return {
    databaseVersion: state.database,
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(StructureView);
