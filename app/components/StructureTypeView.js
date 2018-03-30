// @flow
import React, {Component} from 'react';
import {Grid, Actions} from 'react-redux-grid';
import {Icon, IconButton, Paper, TextField, Tooltip, Typography} from 'material-ui';
import _ from 'lodash';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux';
import JdxDatabase from '../utils/JdxDatabase';
import Eu4Definition from '../definitions/eu4';
import FileLoaderTask from '../utils/tasks/FileLoaderTask';
import PdxScriptParserTask from '../utils/tasks/PdxScriptParserTask';
import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';
import StructureScannerTask from '../utils/tasks/StructureScannerTask';

class StructureTypeView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      search: '',
    };
  }

  componentDidMount() {
    // this.props.reloadGrid(this.gridSettings);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.root !== this.props.root) {
      this.props.reloadGrid(this.gridSettings, this.getDataSource(nextProps.root, nextProps.type, this.state.search));
    }
  }

  loadTypeFiles(typeId) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      FileLoaderTask.start(
        {
          root: this.props.root,
          typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
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
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      PdxScriptParserTask.start(
        {
          root: this.props.root,
          definition: Eu4Definition,
          filterTypes: [type.id],
        },
        (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
        (result) => { resolve(result); },
        (error) => { reject(error); },
      );
    });
  }

  scanType(typeId) {
    const type = _(Eu4Definition.types).find(x => x.id === typeId);

    return new Promise((resolve, reject) => {
      StructureScannerTask.start(
        {
          root: this.props.root,
          typeDefinition: type,
        },
        (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
        (result) => {
          resolve(result);
          console.log(result);
        },
        (error) => { reject(error); },
      );
    });
  }

  reloadTypeById(typeId) {
    return JdxDatabase.reloadTypeById(this.props.root, typeId).then(() => {
      console.log('done');
      return this.props.reloadGrid(this.gridSettings);
    });
  }

  getDataSource(rootPath, type, search) {
    const typeDefinition = _(Eu4Definition.types).find(x => x.id === type);

    return function getData({pageIndex, pageSize}) {
      if (!pageIndex) {
        pageIndex = 0;
      }
      if (!pageSize) {
        pageSize = typeDefinition.listView.pageSize;
      }

      return new Promise((resolve) => {
        return JdxDatabase.get(rootPath).then(db => {
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

    const typeDefinition = _(Eu4Definition.types).find(x => x.id === this.props.match.params.type);
    if (!typeDefinition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Could not find type definition.</p></Paper>);
    }

    const columns = typeDefinition.listView.columns.map(c => {
      if (c.linkTo) {
        c.renderer = ({value, column, row}) => {
          const linkToId = column.linkKey ? _.get(row, column.linkKey) : value;

          return <span><Link to={`/structure/${column.linkTo.replace('[self]', this.props.match.params.type)}/${linkToId}`}>{value}</Link></span>;
        };
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
      dataSource: this.getDataSource(this.props.root, this.props.match.params.type, this.state.search),
      stateKey: `typeList-${this.props.root}-${this.props.match.params.type}`,
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

    const itemPath = `${this.props.root}/${typeDefinition.sourceType.pathPrefix.replace('{type.id}', this.props.match.params.type)}`;

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
            <Tooltip id="tooltip-icon" title="Scan data" placement="bottom">
              <IconButton onClick={() => this.scanType(this.props.match.params.type)}><Icon color="action">download</Icon></IconButton>
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
});

export default connect(null, mapDispatchToProps)(StructureTypeView);
