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
import ItemGrid from './ItemGrid';
import {inject, observer} from 'mobx-react';
import {reaction} from 'mobx';

import JdxDatabase from '../utils/JdxDatabase';
import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';
import PdxMeshView from './PdxMeshView';
import ImageView from './ImageView';
import DdsImageView from './DdsImageView';
import SchemaValidatorTask from '../utils/tasks/SchemaValidatorTask';
import StructureDataTree from './StructureDataTree';

const minimatch = require('minimatch');

@inject('store')
@observer
class StructureItemView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      item: null,
      relationsFrom: [],
      relationsTo: [],
    };
  }

  componentDidMount() {
    this.disposeReaction = reaction(
      () => this.props.project.databaseVersion,
      () => {
        this.loadItemData(this.props);
        this.loadRelations(this.props);
      },
      {fireImmediately: true}
    );
  }

  componentWillUnmount() {
    this.disposeReaction();
  }

  async loadItemData(props) {
    const db = await JdxDatabase.get(props.project);
    const id = props.match.params.id;
    const typeDefinition = this.props.project.definition.types.find(x => x.id === props.match.params.type);

    const item = await db[typeDefinition.id].where({[typeDefinition.primaryKey]: id}).first();

    this.setState({item});
  }

  createTreeItem(key, item, startAtParentId, relations, parentId, idCounter, depth, path) {
    if (!idCounter) {
      idCounter = {id: 1};
    }
    if (depth === undefined) {
      depth = 0;
    } else {
      depth += 1;
    }
    if (path === undefined) {
      path = '';
    } else {
      path += `/${key}`;
    }

    const isArray = _.isArray(item);

    let relation = relations && relations.find(x => x.type === 'valueByPath' && minimatch(path, `/${x.path.join('/')}`));
    if (!relation) {
      relation = relations && relations.find(x => x.type === 'arrayValuesByPath' && minimatch(path, `/${x.path.join('/')}/*`));
    }

    let valueRender = '';
    if (isArray) {
      valueRender = <i style={{color: 'lightgrey'}}>[{item.length} items]</i>;
    } else if (_.isPlainObject(item)) {
      valueRender = <i style={{color: 'lightgrey'}}>[{_(item).size()} properties]</i>;
    } else if (_.isPlainObject(item)) {
      valueRender = <i style={{color: 'lightgrey'}}>[{_(item).size()} properties]</i>;
    } else if (relation) {
      valueRender = <Link to={`/structure/t/${relation.toType}/${item}`}>{(_.isObject(item) ? item.toString() : item)}</Link>;
    } else {
      valueRender = <span style={{color: 'green'}}>{(_.isObject(item) ? item.toString() : item)}</span>;
    }

    let treeItem = {
      id: !parentId ? -1 : idCounter.id++,
      key,
      value: valueRender,
      parentId,
      _hideChildren: !!(parentId && depth > 1),
      children: [],
    };
    idCounter.id += 1;

    if (_.isArray(item)) {
      _(item).forEach((value, key2) => {
        treeItem.children.push(this.createTreeItem(!isArray ? key2 : <i>{key2}</i>, value, startAtParentId, relations, treeItem.id, idCounter, depth, path));
      });
    } else if (_.isPlainObject(item)) {
      _(item).forOwn((value, key2) => {
        treeItem.children.push(this.createTreeItem(key2, value, startAtParentId, relations, treeItem.id, idCounter, depth, path));
      });
    }

    if (treeItem.children.length > 200 && !startAtParentId) {
      treeItem.children = [];
      treeItem.leaf = false;
      /* eslint no-underscore-dangle: ["error", { "allow": ["treeItem", "_hideChildren"] }] */
      treeItem._hideChildren = false;
    }

    if (startAtParentId && idCounter.id > startAtParentId && treeItem.id !== startAtParentId) {
      const found = treeItem.children.find(x => x && x.id === startAtParentId);
      if (found) { treeItem = found; }
    }

    return !parentId && !startAtParentId ? {root: treeItem} : treeItem;
  }

  loadRelations(props) {
    const typeDefinition = _(this.props.project.definition.types).find(x => x.id === props.match.params.type);

    if (typeDefinition) {
      return JdxDatabase.get(props.project).then((db) => {
        const stores = _.uniq(this.props.project.definition.types.map(x => _.get(x, ['sourceTransform', 'relationsStorage'])).filter(x => x));
        stores.push('relations');


        let relationsFrom = [];
        stores.reduce((promise, store) => promise.then(() => db[store].where(['fromType', 'fromId']).equals([typeDefinition.id, props.match.params.id]).toArray(relations => {
          relationsFrom = relationsFrom.concat(relations);
        })), Promise.resolve()).then(() => {
          this.setState({relationsFrom: _.sortBy(relationsFrom, ['toKey', 'toType', 'toId'])});
        });

        let relationsTo = [];
        stores.reduce((promise, store) => promise.then(() => db[store].where(['toType', 'toId']).equals([typeDefinition.id, props.match.params.id]).toArray(relations => {
          relationsTo = relationsTo.concat(relations);
        })), Promise.resolve()).then(() => {
          this.setState({relationsTo: _.sortBy(relationsTo, ['fromKey', 'fromType', 'fromId'])});
        });
      });
    }
  }

  getItemPath() {
    if (this.state.item && this.state.item.path) {
      return `${this.props.project.rootPath}/${this.state.item.path}`;
    }

    const pathTypeIds = this.props.project.definition.types.filter(x => x.primaryKey === 'path').map(x => x.id);

    const fileRelation = this.state.relationsFrom.find(x => pathTypeIds.indexOf(x.toType) !== -1 );

    if (fileRelation) {
      return `${this.props.project.rootPath}/${fileRelation.toId}`;
    }

    return '';
  }

  validateTypeItem() {
    const type = _(this.props.project.definition.types).find(x => x.id === this.props.match.params.type);
    JdxDatabase.loadDefinitions();

    return new Promise((resolve, reject) => {
      SchemaValidatorTask.start(
        {
          taskTitle: 'Validating `' + type.id + '`, item `'+ this.props.match.params.id +'`',
          project: this.props.project,
          typeDefinition: type,
          typeId: this.props.match.params.id
        },
        (progress, total, message) => null,
        (result) => {
          resolve(result);
          this.props.project.errorsVersion += 1;
        },
        (error) => {
          reject(error);
          console.error(error);
        },
      );
    });
  }

  render() {
    if (!this.props.match.params.type) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Error during type view load.</p></Paper>);
    }

    const typeDefinition = this.props.project.definition.types.find(x => x.id === this.props.match.params.type);
    if (!typeDefinition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Could not find type definition.</p></Paper>);
    }

    const itemPath = this.getItemPath();

    return (
      <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
        <div style={{display: 'flex'}}>
          <Typography variant="display1" gutterBottom>
            <Link to={`/structure/t/${this.props.match.params.type}`}>{typeDefinition.title}</Link>: {this.props.match.params.id}
          </Typography>
          <span style={{marginLeft: 20}}>
            <Tooltip id="tooltip-icon" title="Show in file explorer" placement="bottom">
              <IconButton onClick={() => OperatingSystemTask.start({showItemInFolder: this.getItemPath()})}><Icon color="action">pageview</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Open in operating system" placement="bottom">
              <IconButton onClick={() => OperatingSystemTask.start({openItem: this.getItemPath()})}><Icon color="action">open_in_new</Icon></IconButton>
            </Tooltip>
            <Tooltip id="tooltip-icon" title="Validate item" placement="bottom">
              <IconButton onClick={() => this.validateTypeItem()}><Icon color="action">assignment_turned_in</Icon></IconButton>
            </Tooltip>
          </span>
        </div>

        {typeDefinition.id === 'pdx_meshes' && itemPath && <div><PdxMeshView file={{path: itemPath}} databaseVersion={this.props.databaseVersion} /><br /></div>}
        {typeDefinition.id === 'indexed_bmps' && itemPath && <div><ImageView file={{path: itemPath}} /><br /></div>}
        {typeDefinition.id === 'dds_images' && itemPath && <div><DdsImageView file={{path: itemPath}} /><br /></div>}
        {typeDefinition.sourceType && typeDefinition.sourceType.id === 'dds_images' && itemPath && <div><DdsImageView file={{path: itemPath}} flipY={typeDefinition.sourceType.flipY} /><br /></div>}
        {typeDefinition.sourceType && typeDefinition.sourceType.id === 'files' && itemPath && _.endsWith(itemPath, '.dds') && <div><DdsImageView file={{path: itemPath}} /><br /></div>}
        {typeDefinition.id === 'events' && <Link to={`/structure/e/events/${this.props.match.params.id}`}>Event editor</Link>}
        {typeDefinition.id !== 'dds_images' && typeDefinition.sourceType && typeDefinition.sourceType.id !== 'dds_images' && _.endsWith(itemPath, '.dds') && <div><DdsImageView file={{path: itemPath}} /><br /></div>}
        {itemPath && (_.endsWith(itemPath, '.tga') || _.endsWith(itemPath, '.png') || _.endsWith(itemPath, '.jpg') || _.endsWith(itemPath, '.bmp')) && <div><ImageView file={{path: itemPath}} /><br /></div>}

        <StructureDataTree data={this.state.item} maxHeight={1000} expandToDepth={2} />

        {this.state.relationsFrom.length > 0 && (
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <h4>References to ({this.state.relationsFrom.length})</h4>
            <ItemGrid list={this.state.relationsFrom.slice(0, 1000)} maxHeight={400} databaseVersion={this.props.databaseVersion} style={{minHeight: 200}} disableHeight>
              <Column
                width={20}
                dataKey="type"
                label="Type"
                cellRenderer={({rowData}) => rowData.toKey}
              />
              <Column
                width={100}
                dataKey="ID"
                label="ID"
                cellRenderer={({rowData}) => <Link to={`/structure/t/${rowData.toType}/${rowData.toId}`}>{rowData.toId}</Link>}
              />
            </ItemGrid>
          </div>
        )}
        {this.state.relationsTo.length > 0 && (
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <h4>Referenced in ({this.state.relationsTo.length})</h4>
            <ItemGrid list={this.state.relationsTo.slice(0, 1000)} maxHeight={400} databaseVersion={this.props.databaseVersion} style={{minHeight: 200}} disableHeight>
              <Column
                width={20}
                dataKey="type"
                label="Type"
                cellRenderer={({rowData}) => rowData.fromKey}
              />
              <Column
                width={100}
                dataKey="ID"
                label="ID"
                cellRenderer={({rowData}) => <Link to={`/structure/t/${rowData.fromType}/${rowData.fromId}`}>{rowData.fromId}</Link>}
              />
            </ItemGrid>
          </div>
        )}

      </Paper>
    );
  }
}

export default StructureItemView;
