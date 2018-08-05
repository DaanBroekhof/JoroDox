// @flow
import React, {Component} from 'react';
import {Grid, Actions} from 'react-redux-grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import TextField from '@material-ui/core/TextField';
import {Column} from 'react-virtualized';
import {inject, observer} from 'mobx-react';
import {reaction, observable, autorun} from 'mobx';


import _ from 'lodash';
import {Link} from 'react-router-dom';
import JdxDatabase from '../utils/JdxDatabase';
import FileLoaderTask from '../utils/tasks/FileLoaderTask';
import PdxScriptParserTask from '../utils/tasks/PdxScriptParserTask';
import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';
import StructureScannerTask from '../utils/tasks/StructureScannerTask';
import SchemaValidatorTask from '../utils/tasks/SchemaValidatorTask';
import {incrementVersion} from '../actions/database';
import InfiniteItemGrid from './InfiniteItemGrid';

@inject('store')
@observer
class StructureTypeView extends Component {

  @observable data = {
    rowCount: 0
  };

  constructor(props) {
    super(props);

    this.state = {
      search: '',
      definition: props.project ? JdxDatabase.getDefinition(props.project.gameType) : null,
      items: []
    };
  }

  componentDidMount() {
    autorun(
      () => {
        this.props.project.databaseVersion;
        this.loadRowCount();
      }
    );
  }

  loadRowCount() {
    if (this.props.project.typeIds[this.props.match.params.type] === undefined) {
      return;
    }

    const ids = this.props.project.typeIds[this.props.match.params.type];

    if (this.state.search) {
      const count = Array.from(ids.entries()).filter(x => x.toString().match(new RegExp(_.escapeRegExp(this.state.search), 'i'))).length;
      this.data.rowCount = count;
      if (this.itemGrid) {
        this.itemGrid.reloadLastRows();
      }
    } else {
      this.data.rowCount = ids.size;
      if (this.itemGrid) {
        this.itemGrid.reloadLastRows();
      }
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
        (result) => {
          resolve(result);
        },
        (error) => {
          reject(error);
        },
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
        (result) => {
          resolve(result);
        },
        (error) => {
          reject(error);
        },
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
    JdxDatabase.loadDefinitions();

    return new Promise((resolve, reject) => {
      SchemaValidatorTask.start(
        {
          taskTitle: 'Validating `' + type.id + '`',
          project: this.props.project,
          typeDefinition: type,
        },
        (progress, total, message) => null,
        (result) => {
          resolve(result);
        },
        (error) => {
          reject(error);
          console.error(error);
        },
      );
    });
  }

  reloadTypeById(typeId) {
    JdxDatabase.loadDefinitions();
    return JdxDatabase.reloadTypeById(this.props.project, typeId).then(() => {
      this.props.project.databaseVersion += 1;
    });
  }

  async loadMoreRows({startIndex, stopIndex}) {
    const db = await JdxDatabase.get(this.props.project);
    const type = _(this.state.definition.types).find(x => x.id === this.props.match.params.type);

    const rows = db[type.id].offset(startIndex).limit((stopIndex - startIndex) + 1);

    if (this.state.search) {
      return rows.filter(x => x[type.primaryKey].toString().match(new RegExp(_.escapeRegExp(this.state.search), 'i'))).toArray();
    }
    return rows.toArray();
  }

  render() {
    if (!this.props.match.params.type || !this.state.definition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Definitions not loaded yet.</p></Paper>);
    }

    const typeDefinition = _(this.state.definition.types).find(x => x.id === this.props.match.params.type);
    if (!typeDefinition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Could not find type definition.</p></Paper>);
    }


    let itemPath = `${this.props.project.rootPath}/`;
    if (typeDefinition.sourceType && typeDefinition.sourceType.pathPrefix) {
      itemPath += typeDefinition.sourceType.pathPrefix.replace('{type.id}', this.props.match.params.type);
    } else if (typeDefinition.sourceType && typeDefinition.sourceType.path) {
      itemPath += typeDefinition.sourceType.path.replace('{type.id}', this.props.match.params.type);
    }

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, display: 'flex', flexDirection: 'column'}}>
        <div style={{display: 'flex', flexGrow: 0, flexShrink: 0}}>
          <Typography variant="display2" gutterBottom>
            <Link to={'/structure/c/' + typeDefinition.category}>{typeDefinition.category}</Link>: {typeDefinition.title} ({this.data.rowCount})
          </Typography>
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
            <Tooltip id="tooltip-icon" title="Scan" placement="bottom">
              <IconButton onClick={() => this.scanType(this.props.match.params.type)}><Icon color="action">printer</Icon></IconButton>
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
              this.itemGrid.reloadLastRows();

              return this.loadRowCount();
            });
          }}
        />

        <div className="ItemGrid">
          <InfiniteItemGrid loadMoreRows={this.loadMoreRows.bind(this)} rowCount={this.data.rowCount} ref={(ref) => { this.itemGrid = ref; }}>
            { typeDefinition.listView.columns.map((c, index) => {
              if (c.linkTo) {
                c.renderer = ({rowData, cellData}) => {
                  const linkToId = c.linkKey ? _.get(rowData, c.linkKey) : cellData;

                  return <span><Link to={`/structure/t/${c.linkTo.replace('[self]', this.props.match.params.type)}/${linkToId}`}>{cellData}</Link></span>;
                };
              } else {
                _.filter(typeDefinition.relations, (x) => _.isEqual(x.path, c.dataIndex)).forEach(relation => {
                  c.renderer = ({rowData, cellData}) => {
                    const linkToId = c.linkKey ? _.get(rowData, c.linkKey) : cellData;
                    return <span><Link to={`/structure/t/${relation.toType}/${linkToId}`}>{cellData}</Link></span>;
                  };
                });
              }

              return (
                <Column
                  key={'column-' + index}
                  cellDataGetter={({dataKey, rowData}) => _.get(rowData, dataKey)}
                  dataKey={c.dataIndex}
                  label={c.name}
                  width={c.width ? _.toNumber(c.width) : 100}
                  cellRenderer={c.renderer}
                />
              );
            })}

          </InfiniteItemGrid>
        </div>
      </Paper>
    );
  }
}

export default StructureTypeView;
