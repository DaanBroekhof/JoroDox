// @flow
import React, {Component} from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import _ from 'lodash';
import {Link} from 'react-router-dom';
import {Column} from 'react-virtualized';
import {inject, observer} from 'mobx-react';
import {observable, reaction, when} from 'mobx';

import JdxDatabase from '../utils/JdxDatabase';
import PdxScriptParserTask from '../utils/tasks/PdxScriptParserTask';
import PdxDataParserTask from '../utils/tasks/PdxDataParserTask';
import StructureLoaderTask from '../utils/tasks/StructureLoaderTask';
import DeleteRelatedTask from '../utils/tasks/DeleteRelatedTask';
import ItemGrid from './ItemGrid';
import SchemaValidatorTask from '../utils/tasks/SchemaValidatorTask';

@inject('store')
@observer
class StructureView extends Component {

  componentDidMount() {
    if (!this.props.match.params.category) {
      this.props.project.structureCurrentNodeKind = 'root';
    } else {
      this.props.project.structureCurrentNodeKind = 'category';
      this.props.project.structureCurrentNodeKindId = this.props.match.params.category;
    }
  }

  reloadType(typeId) {
    const type = _(this.props.project.definition.types).find(x => x.id === typeId);
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
    _(this.props.project.definition.types).forEach(type => {
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
      {project: this.props.project, type: 'files', typeIds: ['common/ages/00_default.txt'], types: this.props.project.definition.types},
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
    const types = this.props.project.definition.types
      .filter(x => x.reader === 'StructureLoader')
      .filter(x => !this.props.match.params.category || this.props.match.params.category === x.category);

    await JdxDatabase.deleteAllErrors(this.props.project);
    await JdxDatabase.reloadTypesByIds(this.props.project, types, !this.props.match.params.category);

    this.props.project.databaseVersion += 1;
  }

  async validateAll() {
    const types = this.props.project.definition.types
      .filter(x => !this.props.match.params.category || this.props.match.params.category === x.category);

    await JdxDatabase.deleteErrorsByTypes(this.props.project, types);

    const activeTasks = observable({counter: 0});
    for (const type of types) {
      try {
        await when(() => activeTasks.counter < 2)
        activeTasks.counter += 1;
        SchemaValidatorTask.start(
          {
            project: this.props.project,
            typeDefinition: type,
            taskTitle: 'Validating `' + type.id + '`',
            useCachedValidator: true
          },
          (progress, total, message) => null,
          (result) => {
          },
          (error) => {
            console.error(error);
          },
        ).then(() => {
          activeTasks.counter -= 1;
          this.props.project.errorsVersion += 1;
        });
      } catch (exception) {
        console.error('Type '+ type.id, exception);
      }
    }
  }

  reloadDiff() {
    JdxDatabase.loadByPaths(this.props.project, null, null, 'Synchronizing changes...').then(() => {
      this.props.project.databaseVersion += 1;
    });
  }

  testParse() {
    const data = JdxDatabase.parseProjectTriggerDefinitionFile(this.props.project);
    //console.log(data.effects.find(x => x.name === 'random_war_participant'));
    console.log(JSON.stringify(data));
    //console.log(data);
  }

  render() {
    if (!this.props.project.definition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>No data.</p></Paper>);
    }

    const extendedTypes = _.orderBy(this.props.project.definition.types.filter(x => !this.props.match.params.category || x.category === this.props.match.params.category), 'title');

    // This is to trigger rerender... not sure why component below does not trigger it
    this.props.project.typeIds;

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 200}}>
        <div style={{display: 'flex', flexGrow: 0, flexShrink: 0}}>
          <Typography variant="display2" gutterBottom>{this.props.match.params.category || this.props.project.name}</Typography>
          <span style={{marginLeft: 20}}>
            <Tooltip id="tooltip-icon" title="Reload all" placement="bottom">
              <IconButton onClick={() => this.reloadAll()}><Icon color="action">refresh</Icon></IconButton>
            </Tooltip>
            {!this.props.match.params.category &&
              <Tooltip id="tooltip-icon" title="Reload diff" placement="bottom">
                <IconButton onClick={() => this.reloadDiff()}><Icon color="action">compare_arrows</Icon></IconButton>
              </Tooltip>
            }
            <Tooltip id="tooltip-icon" title="Validate all" placement="bottom">
                <IconButton onClick={() => this.validateAll()}><Icon color="action">assignment_turned_in</Icon></IconButton>
              </Tooltip>
            <Tooltip id="tooltip-icon" title="Definition reload" placement="bottom">
              <IconButton onClick={() => this.props.project.reloadDefinition() }><Icon color="action">code</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Parse test" placement="bottom">
              <IconButton onClick={() => this.testParse() }><Icon color="action">code</Icon></IconButton>
            </Tooltip>
          </span>
        </div>

        <Typography variant="subheading" gutterBottom style={{color: 'grey'}}>
          Last global change: {this.props.project.lastGlobalUpdate ? (new Date(this.props.project.lastGlobalUpdate)).toLocaleString() : <i>- unknown -</i>}
        </Typography>

        <div className="ItemGrid">
          <ItemGrid
            list={extendedTypes}
            headerCorrectionWidth={-2}
            headerCorrectionHeight={-6}
          >
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
              cellRenderer={({rowData}) => {
                return <div>{this.props.project.typeIds && this.props.project.typeIds[rowData.id] ? this.props.project.typeIds[rowData.id].size : '-'}</div>;
              }}
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

export default StructureView;
