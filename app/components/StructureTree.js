import React from 'react';
import classNames from 'classnames';
import InfiniteTree from 'react-infinite-tree';
import Icon from '@material-ui/core/Icon';
import {Route} from 'react-router';
import {inject, observer} from 'mobx-react';
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
      treeData: null,
      definition: JdxDatabase.getDefinition(props.project.gameType),
    };
  }

  componentDidMount() {
    this.setTreeState(this.props.project.rootPath);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.project.rootPath !== this.props.project.rootPath) {
      this.setTreeState(nextProps.project.rootPath);
    }

    if (nextProps.project.gameType !== this.props.project.gameType) {
      this.setState({definition: JdxDatabase.getDefinition(nextProps.project.gameType)}, () => this.setTreeState(nextProps.project.rootPath));
    }

    if (!this.tree.getSelectedNode() || this.tree.getSelectedNode().id) {
      if (nextProps.match) {
        // I think we don't want to navigate here... but not 100% sure
        //this.doOpenToType(this.tree.getRootNode(), nextProps.match.params.category, nextProps.match.params.type);
      }
    }
  }

  tree = null;
  treeData = null;

  doOpenToType(node, category, type) {
    if (!type && this.props.match.params.type) {
      type = this.props.match.params.type;
    }
    if (!category && this.props.match.params.category) {
      category = this.props.match.params.category;
    }

    if (!category && type) {
      const typeDefinition = this.state.definition.types.find(x => x.id === type);
      if (typeDefinition) {
        category = typeDefinition.category;
      }
    }

    for (const child of node.children) {
      if (child.info.view === 'types') {
        if (!child.state.open) {
          this.tree.openNode(child);
        } else {
          this.doOpenToType(child, category, type);
        }
        if (!type && !category) {
          this.tree.selectNode(child);
        }
      } else if (child.info.view === 'category') {
        if (child.info.type === category) {
          if (!child.state.open && type) {
            this.tree.openNode(child);
          } else if (!type) {
            this.tree.selectNode(child);
          } else {
            this.doOpenToType(child, category, type);
          }
        }
      } else if (child.info.view === 'type') {
        if (child.info.type === type) {
          this.tree.selectNode(child);
        }
      }
    }
  }

  setTreeState(root) {
    return this.setState({
      treeData: {
        id: `root:${root}`,
        name: this.state.definition.name,
        loadOnDemand: true,
        info: {
          view: 'types',
        },
      },
    }, () => {
      this.tree.loadData(this.state.treeData);
      this.tree.openNode(this.tree.getRootNode().children[0]);

      this.doOpenToType(this.tree.getRootNode(), this.props.match.params.category, this.props.match.params.type);

      return true;
    });
  }


  navigateToNode(node) {
    if (node.info.view === 'types') {
      this.props.store.goto('/structure');
    }
    if (node.info.view === 'category') {
      this.props.store.goto(`/structure/c/${node.info.type}`);
    }
    if (node.info.view === 'type') {
      this.props.store.goto(`/structure/t/${node.info.type}`);
    }
    if (node.info.view === 'item') {
      this.props.store.goto(`/structure/t/${node.info.type}/${node.info.id}`);
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
            if (parentNode.info.view === 'types') {
              const categories = _(this.state.definition.types).map(type => (type.category ? type.category : 'Game structures')).uniq().map(category => ({
                id: `category:${category}`,
                name: category,
                loadOnDemand: true,
                info: {
                  view: 'category',
                  type: category,
                }
              })).value();

              done(null, categories);
          } else if (_.startsWith(parentNode.id, 'category:')) {
            const items = [];
            _(this.state.definition.types)
              .filter(x => `category:${x.category}` === parentNode.id)
              .sortBy(x => x.title).forEach(type => {
              items.push({
                  id: `type:${type.id}`,
                  name: type.title,
                  info: {
                      view: 'type',
                      type: type.id,
                  },
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
              if (node && node.info.view === 'category') {
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
            fileTree.doOpenToType(node);
          }}
          onCloseNode={(node) => {}}
          onSelectNode={(node) => {
            if (node.info.view === 'category') {
              this.tree.openNode(node, {async: true});
            }
            //if (this.props.match.params.kind === 'c' || this.props.match.params.kind === 't') {
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
