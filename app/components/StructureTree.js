import React from 'react';
import classNames from 'classnames';
import InfiniteTree from 'react-infinite-tree';
import Icon from '@material-ui/core/Icon';
import {Route} from 'react-router';
import {inject, observer} from 'mobx-react';
import {autorun} from 'mobx';

import 'react-infinite-tree/dist/react-infinite-tree.css';
import FileView from './FileView';
import JdxDatabase from '../utils/JdxDatabase';

const jetpack = require('electron').remote.require('fs-jetpack');
const syspath = require('electron').remote.require('path');

@inject('store')
@observer
export default class StructureTree extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      treeData: null
    };
  }

  componentDidMount() {
    this.setTreeState(this.props.project.rootPath);

    autorun(() => {
      const mappedParams = {
        category: this.props.routeParams.kind === 'c' ? this.props.routeParams.type : null,
        type: this.props.routeParams.kind === 't' ? this.props.routeParams.type : null,
        id: this.props.routeParams.kind === 't' ? this.props.routeParams.id : null,
      };

      if (!mappedParams.category && mappedParams.type) {
        const typeDefinition = this.props.project.definition.types.find(x => x.id === mappedParams.type);
        if (typeDefinition) {
          mappedParams.category = typeDefinition.category;
        }
      }

      const node = this.doOpenToPath(this.tree.getRootNode(), ['root', mappedParams.category, mappedParams.type].filter(x => x).join('.'));
      if (node) {
        this.tree.selectNode(node);
      }
    });
  }

  componentWillReceiveProps(nextProps) {
    return;
    if (nextProps.project.rootPath !== this.props.project.rootPath) {
      this.setTreeState(nextProps.project.rootPath);
    }


    if (!this.tree.getSelectedNode() || this.tree.getSelectedNode().id) {
      if (nextProps.currentRouteMatch) {
        // I think we don't want to navigate here... but not 100% sure
        //this.doOpenToType(this.tree.getRootNode(), nextProps.routeParams.category, nextProps.routeParams.type);
      }
    }
  }

  tree = null;
  treeData = null;

  doOpenToPath(node, path) {
    if (node.id === path) {
      this.tree.selectNode(node);
      return node;
    }

    if (_.startsWith(path, node.id + '.' )) {
      if (!node.state.open) {
        this.tree.openNode(node, {
          async: true,
          asyncCallback: () => {
            console.log(node, path);
            this.doOpenToPath(node, path);
          }
        });
      }
    }

    for (const child of node.children) {
      const foundNode = this.doOpenToPath(child, path);
      if (foundNode) {
        return foundNode;
      }
    }
  }

  setTreeState() {
    return this.setState({
      treeData: {
        id: 'root',
        name: this.props.project.definition.name,
        loadOnDemand: true,
        kind: 'root',
      },
    }, () => {
      this.tree.loadData(this.state.treeData);
      this.tree.openNode(this.tree.getRootNode().children[0]);

      //this.doOpenToPath(this.tree.getRootNode(), this.props.routeParams.category, this.props.routeParams.type);

      return true;
    });
  }


  navigateToNode(node) {
    if (node.kind === 'root') {
      this.props.store.goto('/structure');
    }
    if (node.kind === 'category') {
      this.props.store.goto(`/structure/c/${node.kindId}`);
    }
    if (node.kind === 'type') {
      this.props.store.goto(`/structure/t/${node.kindId}`);
    }
    if (node.kind === 'item') {
      this.props.store.goto(`/structure/t/${node.kindId}/${node.kindId}`);
    }
  }

  render() {
    const fileTree = this;
    return (
      <Route render={({history}) => (
        <InfiniteTree
          style={{display: 'flex', flex: 1, backgroundColor: 'white'}}
          ref={(c) => { this.tree = c ? c.tree : null; }}
          autoOpen
          loadNodes={(parentNode, done) => {
            if (parentNode.children.length) {
              done(null, []);
              return;
            }
            if (parentNode.kind === 'root') {
              const categories = _(this.props.project.definition.types).map(type => type.category).uniq().map(category => ({
                id: `root.${category}`,
                name: category,
                loadOnDemand: true,
                kind: 'category',
                kindId: category,
              })).value();

              done(null, categories);
            } else if (parentNode.kind === 'category') {
              const items = [];
              _(this.props.project.definition.types).filter(x => x.category === parentNode.kindId).sortBy(x => x.title).forEach(type => {
                items.push({
                  id: `root.${parentNode.kindId}.${type.id}`,
                  name: type.title,
                  kind: 'type',
                  kindId: type.id,
                });
              });

              done(null, items);
            } else {
              done(null, []);
            }
          }}
          rowRenderer={(node, treeOptions) => {
            const {id, name, loadOnDemand = false, state} = node;
            const {depth, open, selected = false} = state;
            const more = node.hasChildren();

            return (
              <div className={classNames('infinite-tree-item', {'infinite-tree-selected': selected})} data-id={id}>
                <div className="infinite-tree-node" style={{marginLeft: (depth - 1) * 18}}>
                  {!more && loadOnDemand &&
                    <a className={classNames(treeOptions.togglerClass, 'infinite-tree-closed')}>❯</a>
                  }
                  {more && open &&
                    <a className={classNames(treeOptions.togglerClass)}>❯</a>
                  }
                  {more && !open &&
                    <a className={classNames(treeOptions.togglerClass, 'infinite-tree-closed')}>❯</a>
                  }
                  {!more && !loadOnDemand &&
                    <span className={classNames(treeOptions.togglerClass)} />
                  }
                  <span
                    className={classNames(['infinite-tree-type', more || loadOnDemand ? 'infinite-tree-type-more' : ''])}
                  >{more || loadOnDemand ?
                    <Icon style={{fontSize: '19px', paddingTop: '2px'}}>folder</Icon> :
                    <Icon style={{fontSize: '19px', paddingTop: '2px'}}>description</Icon>
                  }
                  </span>
                  <span className={classNames(['infinite-tree-title', FileView.getFileType(node) !== 'unknown' ? 'filetree-known-type' : ''])}>{name}</span>
                </div>
              </div>
            );
          }}
          selectable
          shouldSelectNode={(node) => {
            if (!node || (node === this.tree.getSelectedNode())) {
              if (node && node.kind === 'category') {
                this.tree.toggleNode(node, {async: true});
              }
              return false; // Prevent from deselecting the current node
            }
            return true;
          }}
          onClick={(event) => {
            const target = event.target || event.srcElement; // IE8
            let nodeTarget = target;

            // Find the node
            while (nodeTarget && nodeTarget.parentElement !== this.tree.contentElement) {
              nodeTarget = nodeTarget.parentElement;
            }

            if (nodeTarget && nodeTarget.dataset) {
              const node = this.tree.getNodeById(nodeTarget.dataset.id);
              this.navigateToNode(node, history);
            }
          }}
          onDoubleClick={(event) => {
            // dblclick event
          }}
          onKeyDown={(event) => {
            // keydown event
          }}
          onKeyUp={(event) => {
            // keyup event
          }}
          onOpenNode={(node) => {
            //this.tree.openNode(node, {async: true});
            //fileTree.doOpenToType(node);
          }}
          onCloseNode={(node) => {}}
          onSelectNode={(node) => {
            //this.tree.scrollToNode(node);
            if (node.kind === 'category') {
              //this.tree.openNode(node, {async: true});
            }
            //if (this.props.routeParams.kind === 'c' || this.props.routeParams.kind === 't') {
            //  this.navigateToNode(node, history);
            //}
          }}
          onClusterWillChange={() => {}}
          onClusterDidChange={() => {}}
          onContentWillUpdate={() => {}}
          onContentDidUpdate={() => {}}
        />)}
      />
    );
  }
}
