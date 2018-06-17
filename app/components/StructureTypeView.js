// @flow
import React, {Component} from 'react';
import {Grid, Actions} from 'react-redux-grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import TextField from '@material-ui/core/TextField';

import _ from 'lodash';
import {Link} from 'react-router-dom';
import {connect, dispatch} from 'react-redux';
import JdxDatabase from '../utils/JdxDatabase';
import FileLoaderTask from '../utils/tasks/FileLoaderTask';
import PdxScriptParserTask from '../utils/tasks/PdxScriptParserTask';
import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';
import StructureScannerTask from '../utils/tasks/StructureScannerTask';
import SchemaValidatorTask from '../utils/tasks/SchemaValidatorTask';
import {incrementVersion} from '../actions/database';

class StructureTypeView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      search: '',
      definition: JdxDatabase.getDefinition(props.project.gameType),
    };
  }

  componentDidMount() {
    // this.props.reloadGrid(this.gridSettings);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.project.gameType !== this.props.project.gameType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.gameType)});
    }
    if (nextProps.project.rootPath !== this.props.project.rootPath || nextProps.databaseVersion !== this.props.databaseVersion) {
      this.props.reloadGrid(this.gridSettings, this.getDataSource(nextProps.project, nextProps.match.params.type, this.state.search));
    }
  }

  loadTypeFiles(typeId) {
    const type = _(this.state.definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      FileLoaderTask.start(
        {
          project: this.props.project,
          typeDefinition: _(this.state.definition.types).find(x => x.id === 'files'),
          searchPattern: type.sourceType.pathPattern.replace('{type.id}', type.id),
          searchPath: type.sourceType.pathPrefix.replace('{type.id}', type.id),
        },
        (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
        (result) => { resolve(result); },
        (error) => { reject(error); },
      );
    });
  }

  loadPdxScriptFiles(typeId) {
    const type = _(this.state.definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      PdxScriptParserTask.start(
        {
          project: this.props.project,
          definition: this.state.definition,
          filterTypes: [type.id],
        },
        (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
        (result) => { resolve(result); },
        (error) => { reject(error); },
      );
    });
  }

  scanType(typeId) {
    const type = _(this.state.definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      StructureScannerTask.start(
        {
          project: this.props.project,
          typeDefinition: type,
        },
        (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
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
  }

  validateType(typeId) {
    const type = _(this.state.definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      SchemaValidatorTask.start(
        {
          project: this.props.project,
          typeDefinition: type,
        },
        (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
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
  }

  reloadTypeById(typeId) {
    return JdxDatabase.reloadTypeById(this.props.project, typeId).then(() => {
      console.log('done');
      return this.props.reloadGrid(this.gridSettings);
    });
  }

  getDataSource(project, type, search) {
    const typeDefinition = _(this.state.definition.types).find(x => x.id === type);

    return function getData({pageIndex, pageSize}) {
      if (!pageIndex) {
        pageIndex = 0;
      }
      if (!pageSize) {
        pageSize = typeDefinition.listView.pageSize;
      }

      return new Promise((resolve) => {
        return JdxDatabase.get(project).then(db => {
          if (search) {
            // Just getting everything and filtering in javascript is faster than using Dexie filter()
            let base = db[typeDefinition.id];
            base = base.filter(x => x[typeDefinition.primaryKey].toString().match(new RegExp(_.escapeRegExp(search), 'i')));
            base.toArray((result) => {
              // result = result.filter(x => x[typeDefinition.primaryKey].toString().match(new RegExp(_.escapeRegExp(search), 'i')));

              const count = result.length;
              result = result.slice(pageIndex * pageSize, (pageIndex * pageSize) + pageSize);
              if (typeDefinition.listView.unsetKeys) {
                result = result.map(x => {
                  typeDefinition.listView.unsetKeys.forEach(keys => {
                    _.unset(x, keys);
                  });
                  return x;
                });
              }

              resolve({
                data: result,
                total: count,
              });
            });
          } else {
            var time = new Date().getTime();
            console.log(time);
            db[typeDefinition.id].count((total) => {
              db[typeDefinition.id].offset(pageIndex * pageSize).limit(pageSize).toArray((result) => {
                if (typeDefinition.listView.unsetKeys) {
                  result = result.map(x => {
                    typeDefinition.listView.unsetKeys.forEach(keys => {
                      _.unset(x, keys);
                    });
                    return x;
                  });
                }

                console.log(new Date().getTime() - time);
                resolve({
                  data: result,
                  total,
                });
              });
            });
          }
        });
      });
    };
  }

  render() {
    if (!this.props.match.params.type) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Error during type view load.</p></Paper>);
    }

    const typeDefinition = _(this.state.definition.types).find(x => x.id === this.props.match.params.type);
    if (!typeDefinition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Could not find type definition.</p></Paper>);
    }

    const columns = typeDefinition.listView.columns.map(c => {
      if (c.linkTo) {
        c.renderer = ({value, column, row}) => {
          const linkToId = column.linkKey ? _.get(row, column.linkKey) : value;

          return <span><Link to={`/structure/t/${column.linkTo.replace('[self]', this.props.match.params.type)}/${linkToId}`}>{value}</Link></span>;
        };
      } else {
        _.filter(typeDefinition.relations, (x) => _.isEqual(x.path, c.dataIndex)).forEach(relation => {
          c.renderer = ({value, column, row}) => {
            const linkToId = column.linkKey ? _.get(row, column.linkKey) : value;
            return <span><Link to={`/structure/t/${relation.toType}/${linkToId}`}>{value}</Link></span>;
          };
        });
      }

      return c;
    });


    const gridSettings = {
      height: false,
      columns,
      emptyDataMessage: 'Loading...',
      plugins: {
        PAGER: {
          enabled: true,
          pagingType: 'remote',
          toolbarRenderer: (pageIndex, pageSize, total, currentRecords) => `${pageIndex * pageSize} - ${(pageIndex * pageSize) + currentRecords} of ${total}`,
          pagerComponent: false
        },
        COLUMN_MANAGER: {
          resizable: true,
          minColumnWidth: 10,
          moveable: true,
          sortable: {
            enabled: true,
            method: 'local',
          }
        },
        LOADER: {
          enabled: true
        },
      },
      dataSource: this.getDataSource(this.props.project, this.props.match.params.type, this.state.search),
      stateKey: `typeList-${this.props.project.rootPath}-${this.props.match.params.type}`,
      pageSize: typeDefinition.listView.pageSize,
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

    this.gridSettings = gridSettings;

    let itemPath = `${this.props.project.rootPath}/`;
    if (typeDefinition.sourceType && typeDefinition.sourceType.pathPrefix) {
      itemPath += typeDefinition.sourceType.pathPrefix.replace('{type.id}', this.props.match.params.type);
    } else if (typeDefinition.sourceType && typeDefinition.sourceType.path) {
      itemPath += typeDefinition.sourceType.path.replace('{type.id}', this.props.match.params.type);
    }

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, display: 'flex', flexDirection: 'column'}}>
        <div style={{display: 'flex', flexGrow: 0, flexShrink: 0}}>
          <Typography variant="display2" gutterBottom><Link to="/structure">Type</Link>: {typeDefinition.title}</Typography>
          <span style={{marginLeft: 20}}>
            <Tooltip id="tooltip-icon" title="Show in file explorer" placement="bottom">
              <IconButton onClick={() => OperatingSystemTask.start({showItemInFolder: itemPath})}><Icon color="action">pageview</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Open in operating system" placement="bottom">
              <IconButton onClick={() => OperatingSystemTask.start({openItem: itemPath})}><Icon color="action">open_in_new</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Reload data" placement="bottom">
              <IconButton onClick={() => this.reloadTypeById(this.props.match.params.type)}><Icon color="action">refresh</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Validate data" placement="bottom">
              <IconButton onClick={() => this.validateType(this.props.match.params.type)}><Icon color="action">assignment_turned_in</Icon></IconButton>
            </Tooltip>
          </span>
        </div>
        <TextField
          id="search"
          placeholder="Search..."
          type="search"
          margin="normal"
          style={{display: 'flex', flexGrow: 0, flexShrink: 0}}
          value={this.state.search}
          onChange={(event) => {
            this.setState({search: event.target.value}, () => {
              this.props.reloadGrid(this.gridSettings);
            });
          }}
        />

        <Grid {...gridSettings} />
      </Paper>
    );
  }
}


const mapDispatchToProps = (dispatch) => ({
  reloadGrid: (gridSettings, dataSource) => {
    dispatch(Actions.GridActions.getAsyncData({
      stateKey: gridSettings.stateKey,
      dataSource: dataSource || gridSettings.dataSource,
      type: gridSettings.type,
    }));
  },
  incrementDatabaseVersion: () => {
    dispatch(incrementVersion());
  },
});

const mapStateToProps = state => {
  return {
    databaseVersion: state.database,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StructureTypeView);
