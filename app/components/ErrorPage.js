// @flow
import React, {Component} from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Icon from '@material-ui/core/Icon';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import _ from 'lodash';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux';
import {Column} from 'react-virtualized';
import JdxDatabase from '../utils/JdxDatabase';
import {incrementVersion} from '../actions/database';
import ItemGrid from './ItemGrid';
import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';

const ipc = require('electron').ipcRenderer;

class ErrorPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      typeCounts: {},
      definition: JdxDatabase.getDefinition(props.project.gameType),
      gameType: props.project.gameType,
      errors: [],
      errorTotal: null,
      filterByView: true,
    };

    this.eventListener = (sender, response) => {
      if (response.type === 'response' && response.data && response.data.errorsUpdate) {
        this.loadErrors();
      }
    };
    ipc.on('background-response', this.eventListener);
  }

  componentDidMount() {
    this.loadErrors();
  }

  componentWillReceiveProps(nextProps, nextState) {
    if (nextProps.project.gameType !== this.state.gameType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.gameType)});
    }
    if (nextProps.project.rootPath !== this.props.project.rootPath) {
      // reload
      this.loadErrors(nextProps.project, nextProps.type, nextProps.typeId);
    } else if (nextProps.databaseVersion !== this.props.databaseVersion) {
      this.loadErrors(nextProps.project, nextProps.type, nextProps.typeId);
    } else if (nextProps.type !== this.props.type) {
      this.loadErrors(nextProps.project, nextProps.type, nextProps.typeId);
    } else if (nextProps.typeId !== this.props.typeId) {
      this.loadErrors(nextProps.project, nextProps.type, nextProps.typeId);
    }
  }

  componentWillUnmount() {
    ipc.removeListener('background-response', this.eventListener);
  }


  async loadErrors(project, type, typeId) {
    if (project === undefined) {
      project = this.props.project;
    }
    if (type === undefined) {
      type = this.props.type;
    }
    if (typeId === undefined) {
      typeId = this.props.typeId;
    }

    if (this.state.filterByView && type) {
      let errors = await (await JdxDatabase.getErrors(project)).orderBy('creationTime').reverse().limit(10000).toArray();
      errors = errors.filter(x => x.type === type && (typeId === false || x.typeId === typeId));

      const errorTotal = errors.length;
      return this.setState({errors, errorTotal});
    } else {
      const errors = await (await JdxDatabase.getErrors(project)).orderBy('creationTime').reverse().limit(1000).toArray();
      const errorTotal = await (await JdxDatabase.getErrors(project)).count();

      return this.setState({errors, errorTotal});
    }
  }

  toggleFilterByView() {
    this.setState({filterByView: !this.state.filterByView}, () => this.loadErrors());
  }

  getItemPath(error) {
    if (error.path) {
      return `${this.props.project.rootPath}/${error.path}`;
    }

    const pathTypeIds = this.state.definition.types.filter(x => x.primaryKey === 'path').map(x => x.id);

    const fileRelation = this.state.relationsFrom.find(x => pathTypeIds.indexOf(x.toType) !== -1);

    if (fileRelation) {
      return `${this.props.project.rootPath}/${fileRelation.toId}`;
    }

    return '';
  }

  render() {
    const currentError = this.state.errors[0];

    const {filterByView} = this.state;
    
    return (
      <Paper style={{flex: 1, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden'}}>
        <div style={{padding: 2, display: 'flex', minHeight: 30}}>
          <IconButton
            style={{width: 30, height: 30, backgroundColor: (filterByView ? '#fdd835' : 'inherit')}}
            onClick={() => this.toggleFilterByView(this.props.project)}
            title="Filter errors by current view"
          >
            <Icon>filter_list</Icon>
          </IconButton>
          <IconButton
            style={{width: 30, height: 30}}
            onClick={() => this.loadErrors()}
            title="Refresh"
          >
            <Icon color="action">refresh</Icon>
          </IconButton>
          <IconButton
            style={{width: 30, height: 30}}
            onClick={() => JdxDatabase.deleteAllErrors(this.props.project).then(() => this.loadErrors())}
            title="Remove all errors"
          >
            <Icon color="action">delete</Icon>
          </IconButton>
          <IconButton
            style={{width: 30, height: 30}} onClick={() => OperatingSystemTask.start({})}
            title="Previous"><Icon color="action">chevron_left</Icon></IconButton>
          <IconButton style={{width: 30, height: 30}} onClick={() => OperatingSystemTask.start({})} title="Next"><Icon
            color="action">chevron_right</Icon></IconButton>
          {currentError &&
            <div style={{display: 'flex', paddingLeft: 10}}>
              <IconButton style={{height: 30, width: 60, backgroundColor: '#eee', borderRadius: 3, fontSize: 16, verticalAlign: 'middle'}} disabled><Icon color="action" style={{color: 'red', marginLeft: 4}}>warning</Icon><span style={{width: 38, marginLeft: 4, marginTop: 2, marginRight: 4, textAlign: 'right'}}>{this.state.errorTotal !== null ? this.state.errorTotal : ''}</span></IconButton>
              <div style={{height: 30, fontSize: 14, paddingLeft: 10, verticalAlign: 'middle', display: 'flex', justifyContent: 'center', flexDirection: 'column', whiteSpace: 'nowrap'}}>
                <Link to={currentError.typeId ? `/structure/t/${currentError.type}/${currentError.typeId}` : `/structure/t/${currentError.type}`}>{currentError.message}</Link>
              </div>
              <div style={{height: 30, fontSize: 14, paddingLeft: 10, verticalAlign: 'middle', display: 'flex', justifyContent: 'center', flexDirection: 'column', whiteSpace: 'nowrap', paddingRight: 10}}>
                <span>(<Link to={`/structure/t/${currentError.type}`}>{currentError.type}</Link>: <Link to={currentError.typeId ? `/structure/t/${currentError.type}/${currentError.typeId}` : `/structure/t/${currentError.type}`}>{currentError.typeId}</Link>)</span>
              </div>
              <Tooltip id="tooltip-icon" title="Open in default editor" placement="top">
                <IconButton style={{width: 30, height: 30}} onClick={() => OperatingSystemTask.start({openItem: this.getItemPath(currentError)})}><Icon color="action">open_in_new</Icon></IconButton>
              </Tooltip>
              <div style={{height: 30, fontSize: 14, verticalAlign: 'middle', display: 'flex', justifyContent: 'center', flexDirection: 'column'}}>
                <Link to={`/structure/t/files/${currentError.path}`}>{currentError.path}</Link>
              </div>
            </div>
          }
          {!currentError &&
            <div style={{height: 30, fontSize: 14, paddingLeft: 10, verticalAlign: 'middle', display: 'flex', justifyContent: 'center', flexDirection: 'column', whiteSpace: 'nowrap', color: 'grey'}}>
              <i>No recorded errors{this.props.type ? ` for type '${this.props.type}'`:''}.</i>
            </div>
          }
        </div>
        <div className="ItemGrid">
          <ItemGrid list={this.state.errors}>
            <Column
              width={100}
              dataKey="item"
              label="Item"
              cellRenderer={({rowData}) => <span><Link to={`/structure/t/${rowData.type}`}>{rowData.type}</Link>: <Link to={rowData.typeId ? `/structure/t/${rowData.type}/${rowData.typeId}` : `/structure/t/${rowData.type}`}>{rowData.typeId}</Link></span>}
            />
            <Column
              width={200}
              dataKey="message"
              label="Error message"
              cellRenderer={({rowData}) =>
                <span>
                  <Link
                    to={rowData.typeId ? `/structure/t/${rowData.type}/${rowData.typeId}` : `/structure/t/${rowData.type}`}>{rowData.message}</Link>
                  {rowData.data && rowData.data.dataPath ?
                    <span style={{color: 'grey'}}> {rowData.data.dataPath.replace(/^\.data\./, '')}</span> : ''}
                </span>
              }
            />
          </ItemGrid>
        </div>
      </Paper>
    );
  }
}


const mapStateToProps = state => {
  return {
    databaseVersion: state.database,
  };
};

const mapDispatchToProps = (dispatch) => ({
  incrementDatabaseVersion: () => {
    dispatch(incrementVersion());
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(ErrorPage);
