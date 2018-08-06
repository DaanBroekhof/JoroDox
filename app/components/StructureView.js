// @flow
import React, {Component} from 'react';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import _ from 'lodash';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux';
import {Column} from 'react-virtualized';
import {inject, observer} from 'mobx-react';
import {observable, reaction, when} from 'mobx';

import JdxDatabase from '../utils/JdxDatabase';
import PdxScriptParserTask from '../utils/tasks/PdxScriptParserTask';
import PdxDataParserTask from '../utils/tasks/PdxDataParserTask';
import StructureLoaderTask from '../utils/tasks/StructureLoaderTask';
import DeleteRelatedTask from '../utils/tasks/DeleteRelatedTask';
import {incrementVersion} from '../actions/database';
import ItemGrid from './ItemGrid';
import SchemaValidatorTask from '../utils/tasks/SchemaValidatorTask';

@inject('store')
@observer
class StructureView extends Component {

  componentDidMount() {
    //this.reloadCounts();
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

  render() {
    if (!this.props.project.definition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>No data.</p></Paper>);
    }

    const extendedTypes = _.orderBy(this.props.project.definition.types.filter(x => !this.props.match.params.category || x.category === this.props.match.params.category), 'title');

    // This is to trigger rerender... not sure why component below does not trigger it
    this.props.project.typeIds;

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 200}}>
        <Typography variant="display2">{this.props.match.params.category || this.props.project.name}</Typography>
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
