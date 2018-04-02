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
import Eu4Definition from '../definitions/eu4';
import WatchDirectoryTask from '../utils/tasks/WatchDirectoryTask';
import DeleteRelatedTask from '../utils/tasks/DeleteRelatedTask';
import {incrementVersion} from '../actions/database';

const syspath = require('electron').remote.require('path');

class StructureView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      typeCounts: {},
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.root !== this.props.root) {
      //this.props.reloadGrid(this.gridSettings, this.getDataSource(nextProps.root, nextProps.type, this.state.search));
    }
  }

  reloadType(typeId) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);
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
    _(Eu4Definition.types).forEach(type => {
      if (type.sourceType && (!typeId || type.id === typeId)) {
        StructureLoaderTask.start(
          {root: this.props.root, typeDefinition: type},
          (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
        );
      }
    });
  }

  watchDirectory() {
    WatchDirectoryTask.start(
      {rootDir: this.props.root},
      (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
      (data) => {
        console.log('Watch response', data);
        const names = _(data).filter(x => x.eventType !== 'dirChange').map('filename').uniq().value();

        JdxDatabase.loadByPaths(this.props.root, names, Eu4Definition.types).then(() => {
          //this.props.incrementDatabaseVersion();
          this.props.dispatch(incrementVersion());
          return this;
        });
      }
    );
  }

  deleteRelatedTest() {
    DeleteRelatedTask.start(
      {rootDir: this.props.root, type: 'files', typeIds: ['common/ages/00_default.txt'], types: Eu4Definition.types},
      (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
    );
  }

  loadPdxScripts() {
    PdxScriptParserTask.start(
      {root: this.props.root, definition: Eu4Definition},
      (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
    );
  }

  loadPdxData() {
    PdxDataParserTask.start(
      {root: this.props.root, definition: Eu4Definition},
      (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
    );
  }

  reloadStructure() {
    JdxDatabase.reloadAll(this.props.root);
    /*
    JdxDatabase.get(this.props.root).then(db => {
        db.relations.clear().then(() => {
            FileLoaderTask.start(
                {root: this.props.root, typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files')},
                (progress, total, message) => console.log('[' + progress + '/' + total + '] ' + message),
                (result) => console.log("done"),
                (error) => console.log(error),
            );
        });
    });
    */
  }

  reloadTypeById(typeId) {
    return JdxDatabase.reloadTypeById(this.props.root, typeId).then(() => {
      console.log(`Finished loading ${typeId}`);
      return;
    });
  }

  reloadAll() {
    Eu4Definition.types.filter(x => x.reader === 'StructureLoader').reduce((promise, type) => promise.then(() => {
      console.log(`Starting ${type.id}`);
      return JdxDatabase.reloadTypeById(this.props.root, type.id).then(result => {
        console.log(`Loaded ${type.id}`);
        return result;
      });
    }), Promise.resolve());
  }


  reloadDiff() {
    JdxDatabase.loadByPaths(this.props.root, null, Eu4Definition.types);
  }


  render() {
    if (!this.loadingCounts) {
      JdxDatabase.get(this.props.root).then(db => {
        const typeIds = Eu4Definition.types.filter(type => db[type.id] && this.state.typeCounts[type.id] === undefined).map(x => x.id);
        const promises = typeIds.map(typeId => db[typeId].count());
        return Promise.all(promises).then(counts => {
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

    let extendedTypes = Eu4Definition.types.map(type => {
      if (type.totalCount !== this.state.typeCounts[type.id]) {
        const typeCopy = Object.assign({}, type);
        typeCopy.totalCount = this.state.typeCounts[type.id];
        return typeCopy;
      }
      return type;
    });
    extendedTypes = _.sortBy(extendedTypes, x => x.title);

    const gridSettings = {
      height: false,
      emptyDataMessage: 'Loading...',
      columns: [
        {
          name: 'Type',
          dataIndex: ['title'],
          renderer: ({column, value, row}) => <Link to={`/structure/${row.id}`}>{value}</Link>,
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
          toolbarRenderer: (pageIndex, pageSize, total, currentRecords, recordType) => `${pageIndex * pageSize} - ${(pageIndex * pageSize) + currentRecords} of ${total}`,
          pagerComponent: false
        },
        COLUMN_MANAGER: {
          resizable: true,
          minColumnWidth: 10,
          moveable: true,
        },
        LOADER: {
          enabled: true
        },
      },
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

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
        <Typography variant="display2" gutterBottom>{syspath.basename(this.props.root)} - Data types</Typography>

        <div style={{display: 'flex', flexDirection: 'row', marginBottom: 20}}>
          {/*
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadStructure()}>Load raw file data</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadPdxScripts()}>Load PDX scripts</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadPdxData()}>Load PDX data assets</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.loadStructureData()}>Load game structures</Button><br />
          */}
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadAll()}>Load all</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.watchDirectory()}>Watch directory</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.deleteRelatedTest()}>Test delete</Button><br />
          <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadDiff()}>Reload diff</Button><br />


        </div>

        <Grid {...gridSettings} />
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
//    databaseVersion: state.database,
  };
};

export default connect(null, null)(StructureView);
