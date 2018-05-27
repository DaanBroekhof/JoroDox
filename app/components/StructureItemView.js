// @flow
import React, {Component} from 'react';

import {Icon, IconButton, Paper, Tooltip, Typography} from 'material-ui';
import {applyGridConfig, Grid, Actions} from 'react-redux-grid';
import _ from 'lodash';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux';
import JdxDatabase from '../utils/JdxDatabase';
import OperatingSystemTask from '../utils/tasks/OperatingSystemTask';
import {incrementVersion} from "../actions/database";
import PdxMeshView from './PdxMeshView';
import ImageView from './ImageView';
import DdsImageView from './DdsImageView';

const minimatch = require('minimatch');


class StructureItemView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      item: null,
      relationsFrom: [],
      relationsTo: [],
      definition: JdxDatabase.getDefinition(props.project.definitionType),
    };
  }

  componentDidMount() {
    this.loadRelations(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.loadRelations(nextProps);

    if (nextProps.project.definitionType !== this.props.project.definitionType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.definitionType)});
    }

    if (nextProps.databaseVersion !== this.props.databaseVersion) {
      this.props.reloadGrid(this.gridSettings, this.getDataSource(nextProps.project.rootPath, nextProps.match.params.type, nextProps.match.params.id));
    }
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
    const typeDefinition = _(this.state.definition.types).find(x => x.id === props.match.params.type);

    if (typeDefinition) {
      return JdxDatabase.get(props.project).then((db) => {
        const stores = _.uniq(this.state.definition.types.map(x => _.get(x, ['sourceTransform', 'relationsStorage'])).filter(x => x));
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

    const pathTypeIds = this.state.definition.types.filter(x => x.primaryKey === 'path').map(x => x.id);

    const fileRelation = this.state.relationsFrom.find(x => pathTypeIds.indexOf(x.toType) !== -1 );

    if (fileRelation) {
      return `${this.props.project.rootPath}/${fileRelation.toId}`;
    }

    return '';
  }

  getDataSource(rootPath, type, id) {
    const typeDefinition = this.state.definition.types.find(x => x.id === type);

    return function getData({pageIndex, pageSize, parentId}) {
      return new Promise((resolve) => {
        return JdxDatabase.get(this.props.project).then(db => {
          return db[typeDefinition.id].where({[typeDefinition.primaryKey]: id}).first(item => {
            if (item) {
              const treeItem = this.createTreeItem('root', item, parentId, typeDefinition.relations);
              this.setState({item});

              if (parentId) {
                resolve({data: treeItem.children, partial: true});
              } else {
                resolve({data: treeItem, total: 1});
              }
            }
          });
        });
      });
    }.bind(this);
  }

  render() {
    if (!this.props.match.params.type) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Error during type view load.</p></Paper>);
    }

    const typeDefinition = this.state.definition.types.find(x => x.id === this.props.match.params.type);
    if (!typeDefinition) {
      return (<Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Could not find type definition.</p></Paper>);
    }

    const itemPath = this.getItemPath();

    /*
      if (!this.state.item) {
        JdxDatabase.get(this.props.root)[typeDefinition.id].where({[typeDefinition.primaryKey]: this.props.match.params.id}).first(item => {
            if (item) {
                console.log(this.createTreeItem('root', item));
                this.setState({
                    item: item,
                    treeItem: this.createTreeItem('root', item),
                });
            }
        });
    }
    */

    const gridSettings = {
      height: false,
      gridType: 'tree',
      emptyDataMessage: 'Loading...',
      columns: [
        {
          name: 'Name',
          dataIndex: 'key',
          width: '25%',
          expandable: true,

        },
        {
          name: 'Value',
          dataIndex: 'value',
          expandable: false,
        },
      ],
      plugins: {
        COLUMN_MANAGER: {
          resizable: true,
          minColumnWidth: 10,
          moveable: true,
          sortable: false,
        },
        LOADER: {
          enabled: true
        },
      },
      dataSource: this.getDataSource(this.props.project.rootPath, this.props.match.params.type, this.props.match.params.id),
      stateKey: `typeView-${this.props.match.params.type}-${this.props.match.params.id}`,
      pageSize: 1000,
      style: {
        display: 'flex',
        flexDirection: 'column',
      },
      events: {
        HANDLE_ROW_CLICK: ({row}) => {
          if (row.leaf === false && row._hasChildren === false) {
            return this.gridSettings.dataSource({parentId: row._id}).then((result) => {
              return this.props.setPartialTreeData(result.data, `typeView-${this.props.match.params.type}-${this.props.match.params.id}`, row._id);
            });
          }

          return this.props.setTreeNodeVisibility(row._id, !row._isExpanded, `typeView-${this.props.match.params.type}-${this.props.match.params.id}`, false);
        },
      },
      ref2: (grid) => {
        const x = 34234;
        this.grid = grid;
      }
    };
    this.gridSettings = gridSettings;

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
          </span>
        </div>

        {typeDefinition.id === 'pdx_meshes' && itemPath && <div><PdxMeshView file={{path: itemPath}} /><br /></div>}
        {typeDefinition.id === 'indexed_bmps' && itemPath && <div><ImageView file={{path: itemPath}} /><br /></div>}
        {typeDefinition.id === 'dds_images' && itemPath && <div><DdsImageView file={{path: itemPath}} /><br /></div>}
        {typeDefinition.id === 'events' && <Link to={`/structure/e/events/${this.props.match.params.id}`}>Event editor</Link>}

        <Grid ref={(input) => { this.grid = input; }} {...gridSettings} />

        {this.state.relationsFrom.length > 0 && (
          <div>
            <h4>References to ({this.state.relationsFrom.length})</h4>
            <ul>
              {this.state.relationsFrom.slice(0, 1000).map(r => (
                <li key={r.id}>{r.toKey}: <Link to={`/structure/t/${r.toType}/${r.toId}`}>{r.toId}</Link></li>
              ))}
            </ul>
          </div>
        )}
        {this.state.relationsTo.length > 0 && (
          <div>
            <h4>Referenced in ({this.state.relationsTo.length})</h4>
            <ul>
              {this.state.relationsTo.slice(0, 1000).map(r => (
                <li key={r.id}>{r.fromKey}: <Link to={`/structure/t/${r.fromType}/${r.fromId}`}>{r.fromId}</Link></li>
              ))}
            </ul>
          </div>
        )}

      </Paper>
    );
  }
}

const mapDispatchToProps = (dispatch) => ({
  reloadGrid: (gridSettings, dataSource) => {
    return dataSource({}).then((result) => {
      return dispatch(Actions.GridActions.setTreeData({
        partial: false, data: result.data, parentId: null, stateKey: gridSettings.stateKey
      }));
    });
  },
  setTreeNodeVisibility: (id, visible, stateKey, showTreeRootNode) => {
    dispatch(Actions.GridActions.setTreeNodeVisibility({
      id, visible, stateKey, showTreeRootNode
    }));
  },
  setPartialTreeData: (data, stateKey, parentId) => {
    dispatch(Actions.GridActions.setTreeData({
      partial: true, data, parentId, stateKey
    }));
  },
});

const mapStateToProps = state => {
  return {
    databaseVersion: state.database,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StructureItemView);
