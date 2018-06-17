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
import OperatingSystemTask from "../utils/tasks/OperatingSystemTask";

class ErrorPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      typeCounts: {},
      definition: JdxDatabase.getDefinition(props.project.gameType),
      gameType: props.project.gameType,
      errors: [],
    };
  }

  componentDidMount() {
    this.loadErrors(this.props.project);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.project.gameType !== this.state.gameType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.gameType)});
    }
    if (nextProps.project.rootPath !== this.props.project.rootPath) {
      // reload
      this.loadErrors(nextProps.project);
    }
    if (nextProps.databaseVersion !== this.props.databaseVersion) {
      this.loadErrors(nextProps.project);
    }
  }

  async loadErrors(project) {
    const errors = await (await JdxDatabase.getErrors(project)).orderBy('creationTime').reverse().toArray();

    return this.setState({errors});
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
    
    return (
      <Paper style={{flex: 1, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'hidden'}}>
        <div style={{padding: 2, display: 'flex', minHeight: 30}}>
          <Tooltip id="tooltip-icon" title="Refresh" placement="top">
            <IconButton style={{width: 30, height: 30}} onClick={() => this.loadErrors(this.props.project)}><Icon color="action">refresh</Icon></IconButton>
          </Tooltip>
          <Tooltip id="tooltip-icon" title="Remove all errors" placement="top">
            <IconButton style={{width: 30, height: 30}} onClick={() => JdxDatabase.deleteAllErrors(this.props.project).then(() => this.loadErrors(this.props.project))}><Icon color="action">delete</Icon></IconButton>
          </Tooltip>
          <Tooltip id="tooltip-icon" title="Previous" placement="top">
            <IconButton style={{width: 30, height: 30}} onClick={() => OperatingSystemTask.start({})}><Icon color="action">chevron_left</Icon></IconButton>
          </Tooltip>
          <Tooltip id="tooltip-icon" title="Next" placement="top">
            <IconButton style={{width: 30, height: 30}} onClick={() => OperatingSystemTask.start({})}><Icon color="action">chevron_right</Icon></IconButton>
          </Tooltip>
          {currentError &&
            <div style={{display: 'flex', paddingLeft: 10}}>
              <IconButton style={{width: 30, height: 30, backgroundColor: '#eee', borderRadius: 3}} disabled><Icon color="action" style={{color: 'red'}}>warning</Icon></IconButton>
              <div style={{height: 30, fontSize: 14, paddingLeft: 10, verticalAlign: 'middle', display: 'flex', justifyContent: 'center', flexDirection: 'column', whiteSpace: 'nowrap'}}>
                <Link to={currentError.typeId ? `/structure/t/${currentError.type}/${currentError.typeId}` : `/structure/t/${currentError.type}`}>{currentError.message}</Link>
              </div>
              <div style={{height: 30, fontSize: 14, paddingLeft: 10, verticalAlign: 'middle', display: 'flex', justifyContent: 'center', flexDirection: 'column', whiteSpace: 'nowrap', paddingRight: 10}}>
                <span>(<Link to={`/structure/t/${currentError.type}`}>{currentError.type}</Link>: <Link to={currentError.typeId ? `/structure/t/${currentError.type}/${currentError.typeId}` : `/structure/t/${currentError.type}`}>{currentError.typeId})</Link></span>
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
              <i>No recorded errors.</i>
            </div>
          }
        </div>
        <div className="ItemGrid">
          <ItemGrid list={this.state.errors}>
            <Column
              width={100}
              dataKey="message"
              label="Error message"
              cellRenderer={({rowData}) => <Link to={rowData.typeId ? `/structure/t/${rowData.type}/${rowData.typeId}` : `/structure/t/${rowData.type}`}>{rowData.message}</Link>}
            />
            <Column
              width={100}
              dataKey="path"
              label="Path"
              cellRenderer={({rowData}) => <Link to={rowData ? `/structure/t/files/${rowData.path}` : ''}>{rowData.path}</Link>}
            />
            <Column
              width={100}
              dataKey="data"
              label="Data"
              cellRenderer={({rowData}) => <div>{JSON.stringify(rowData)}</div>}
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
