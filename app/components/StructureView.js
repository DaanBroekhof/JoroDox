// @flow
import React, {Component} from 'react';
import {Button, Paper, Typography} from 'material-ui';
import _ from 'lodash';
import {Grid} from 'react-redux-grid';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import JdxDatabase from '../utils/JdxDatabase';
import PdxScriptParserTask from '../utils/tasks/PdxScriptParserTask';
import PdxDataParserTask from '../utils/tasks/PdxDataParserTask';
import StructureLoaderTask from '../utils/tasks/StructureLoaderTask';
import DeleteRelatedTask from '../utils/tasks/DeleteRelatedTask';
import {incrementVersion} from '../actions/database';
import ItemGrid from './ItemGrid';

class StructureView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      typeCounts: {},
      definition: JdxDatabase.getDefinition(props.project.definitionType),
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.project.definitionType !== this.state.definitionType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.definitionType)});
    }
    if (nextProps.project.rootPath !== this.props.project.rootPath) {
      //this.props.reloadGrid(this.gridSettings, this.getDataSource(nextprops.project.rootPath, nextProps.type, this.state.search));
    }
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

  reloadAll() {
    const types = this.state.definition.types
      .filter(x => x.reader === 'StructureLoader')
      .filter(x => !this.props.match.params.category || this.props.match.params.category === (x.category || 'Game structures'));

    types.reduce((promise, type) => promise.then(() => {
      console.log(`Starting ${type.id}`);
      return JdxDatabase.reloadTypeById(this.props.project, type.id).then(result => {
        console.log(`Loaded ${type.id}`);
        return result;
      });
    }), Promise.resolve());
  }


  reloadDiff() {
    JdxDatabase.loadByPaths(this.props.project, null, null, 'Synchronizing changes...');
  }

  render() {
    if (!this.loadingCounts) {
      JdxDatabase.get(this.props.project).then(db => {
        const typeIds = this.state.definition.types
          .filter(type => db[type.id] && this.state.typeCounts[type.id] === undefined)
          .filter(x => !this.props.match.params.category || this.props.match.params.category === (x.category || 'Game structures'))
          .map(x => x.id);
        const promises = typeIds.map(typeId => db[typeId].count());
        return Promise.all(promises).then((counts) => {
          const typeCounts = {};
          counts.forEach((value, key) => {
            typeCounts[typeIds[key]] = value;
          });
          this.setState({typeCounts});
          this.loadingCounts = false;
        });
      }).catch((e) => {
        console.error(e);
      });
      this.loadingCounts = true;
    }

    let extendedTypes = this.state.definition.types.map(type => {
      if (type.totalCount !== this.state.typeCounts[type.id]) {
        const typeCopy = Object.assign({}, type);
        typeCopy.totalCount = this.state.typeCounts[type.id];
        return typeCopy;
      }
      return type;
    }).filter(x => !this.props.match.params.category || this.props.match.params.category === (x.category || 'Game structures'));
    extendedTypes = _.sortBy(extendedTypes, x => x.title);

    /*
    const gridSettings = {
      height: false,
      emptyDataMessage: 'Loading...',
      columns: [
        {
          name: 'Type',
          dataIndex: ['title'],
          renderer: ({column, value, row}) => <Link to={`/structure/t/${row.id}`}>{value}</Link>,
        },
        {
          name: 'Item count',
          dataIndex: ['totalCount'],
        },
        {
          name: 'Actions',
          dataIndex: ['primaryKey'],
          renderer: ({column, value, row}) => (
            <div style={{display: 'flex'}}>
              <Button size="small" onClick={() => { this.reloadTypeById(row.id); }}>Reload</Button>
            </div>
          ),
        },
      ],
      plugins: {
        PAGER: {
          enabled: false,
          pagingType: 'local',
          toolbarRenderer: (pageIndex, pageSize, total, currentRecords, recordType) => `${pageIndex * pageSize} -
          ${(pageIndex * pageSize) + currentRecords} of ${total}`,
          pagerComponent: false
        },
        COLUMN_MANAGER: {
          resizable: true,
          //minColumnWidth: 10,
          moveable: true,
        },
        LOADER: {
          enabled: true
        },
      },
//      dataSource: this.getDataSource(this.props.project, this.props.match.params.type, this.state.search),
      data: extendedTypes,
      stateKey: 'typeListALl',
      style: {
        display: 'flex',
        flexDirection: 'column',
      },
      events: {
        HANDLE_ROW_CLICK: ({row}) => {
          // this.props.history.push('/structure/'+ typeDefinition.id +'/'+ row[typeDefinition.primaryKey]);
        },
      }
    };
    */

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 200}}>
        <Typography variant="display2" gutterBottom>{this.props.match.params.category || this.state.definition.name} - types</Typography>

        <div style={{display: 'flex', flexDirection: 'row', marginBottom: 20, minHeight: 25}}>
          {/*
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadStructure()}>Load raw file data</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadPdxScripts()}>Load PDX scripts</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadPdxData()}>Load PDX data assets</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadStructureData()}>Load game structures</Button><br />
          */}
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadAll()}>Reload all</Button>
          {!this.props.match.params.category &&
            <span>
              <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadDiff()}>Reload diff</Button>
            </span>
          }


        </div>
        <div className="ItemGrid">
          <ItemGrid list={extendedTypes} databaseVersion={this.props.databaseVersion} />
        </div>

        {/*<Grid {...gridSettings} />*/}
      </Paper>
    );
  }
}

const mapDispatchToProps = dispatch => {
  return {
    incrementDatabaseVersion: () => {
      dispatch(incrementVersion());
    }
  };
};

const mapStateToProps = state => {
  return {
    databaseVersion: state.database,
  };
};
export default connect(mapDispatchToProps, mapStateToProps)(StructureView);
