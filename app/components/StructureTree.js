import React from 'react';
import classNames from 'classnames';
import InfiniteTree from 'react-infinite-tree';
import 'react-infinite-tree/dist/react-infinite-tree.css';

const jetpack = require('electron').remote.require('fs-jetpack');
const syspath = require('electron').remote.require('path');

import { Route } from 'react-router';
import FileView from './FileView';
import { Icon } from 'material-ui';
import Eu4Definition from '../definitions/eu4';

export default class StructureTree extends React.Component {
    tree = null;
    treeData = null;
    openToType = null;

    constructor(props) {
      super(props);

      this.state = {
        treeData: null,
      };
    }

    componentDidMount() {
      this.setTreeState(this.props.root);
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.root !== this.props.root) {
        this.setTreeState(nextProps.root);
      }
      if (!this.tree.getSelectedNode() || this.tree.getSelectedNode().id) {
        if (nextProps.match) { this.doOpenToType(this.tree.getRootNode(), nextProps.match.params.type); }
      }
    }

    doOpenToType(node, type = null, updated = false) {
      if (type) { this.openToType = type; }
      if (!this.openToType) { return; }

      let found = false;
      for (const child of node.children) {
        if (this.openToType === child.info.type) {
          this.openToType = null;
          this.tree.selectNode(child);
          found = true;
          break;
        } else if (child.info.type === 'typekind') {
          if (!child.state.open) { this.tree.openNode(child, { async: true }); } else { this.doOpenToType(child, type); }
          found = true;
          break;
        }
      }

      if (!found && !updated) {
        // this.updateNode(node);
        // this.doOpenToPath(node, path, true);
      }
    }

    updateNode(node) {
      if (!node.id) { return; }

      const localJetpack = jetpack.cwd(node.id);
      const dirs = localJetpack.find('.', {
        matching: '*', recursive: false, files: false, directories: true
      });
      const files = localJetpack.find('.', {
        matching: '*', recursive: false, files: true, directories: false
      });

      const nodeIds = [];
      const newNodes = {};
      for (const dirName of dirs) {
        const id = node.id + syspath.sep + dirName;
        nodeIds.push(`D:${id}`);
        if (!this.tree.getNodeById(id)) {
          newNodes[`D:${id}`] = {
            id,
            name: dirName,
            loadOnDemand: true,
            info: {
              name: dirName,
              type: 'dir',
              absolutePath: id,
            },
          };
        }
      }
      for (const fileName of files) {
        const id = node.id + syspath.sep + fileName;
        nodeIds.push(`F:${id}`);
        if (!this.tree.getNodeById(id)) {
          newNodes[`F:${id}`] = {
            id,
            name: fileName,
            loadOnDemand: false,
            info: {
              name: fileName,
              type: 'file',
              absolutePath: id,
            },
          };
        }
      }

      nodeIds.sort((a, b) => a.localeCompare(b));

      // Remove all nodes that no longer exist
      for (const c of node.children) {
        if (!nodeIds.includes((c.info.type === 'dir' ? 'D:' : 'F:') + c.id)) {
          this.tree.removeNode(c);
        }
      }

      // Insert new nodes
      let index = 0;
      for (const nodeId of nodeIds) {
        if (newNodes[nodeId]) {
          this.tree.addChildNodes([newNodes[nodeId]], index, node);
        }
        index++;
      }
    }

    setTreeState(root) {
      this.setState({
        treeData: {
          id: `root:${root}`,
          name: syspath.basename(root),
          loadOnDemand: true,
          info: {
            view: 'types',
          },
        },
      }, function () {
        this.tree.loadData(this.state.treeData);

        this.tree.openNode(this.tree.getRootNode().children[0]);

        if (this.props.match.params.type) {
          this.doOpenToType(this.tree.getRootNode(), this.props.match.params.type);
        } else {
          //                this.doOpenToPath(this.tree.getRootNode(), root);
        }
      });
    }

    navigateToNode(node, history) {
      if (node.info.view === 'types') {
        if (history.location.pathname !== '/structure') { history.push('/structure'); }
      }
      if (node.info.view === 'type') {
        if (history.location.pathname !== `/structure/${node.info.type}`) { history.push(`/structure/${node.info.type}`); }
      }
      if (node.info.view === 'item') {
        if (history.location.pathname !== `/structure/${node.info.type}/${node.info.id}`) { history.push(`/structure/${node.info.type}/${node.info.id}`); }
      }
    }

    render() {
      const fileTree = this;
      return (
        <Route render={({ history }) => (<InfiniteTree
          style={{ display: 'flex', flex: 1, backgroundColor: 'white' }}
          ref={(c) => this.tree = c ? c.tree : null}
          autoOpen
          loadNodes={(parentNode, done) => {
                    if (parentNode.info.view === 'types') {
                        const categories = _(Eu4Definition.types).map(type => (type.category ? type.category : 'Game structures')).uniq().map(category => ({
                                id: `category:${category}`,
                                name: category,
                                loadOnDemand: true,
                                info: {
                                    view: 'category',
                                    type: category,
                                }
                            }))
.value();

                        done(null, categories, () => {
                            this.tree.toggleNode(this.tree.getNodeById('category:Game structures'), { async: true });
                        });
                    } else if (_.startsWith(parentNode.id, 'category:')) {
                        const items = [];
                        _(Eu4Definition.types).filter(x => `category:${x.category ? x.category : 'Game structures'}` === parentNode.id).sortBy(x => x.title).forEach(type => {
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
                    const {
 id, name, loadOnDemand = false, children, state, props = {}
} = node;
                    const droppable = treeOptions.droppable;
                    const {
 depth, open, path, total, selected = false
} = state;
                    const more = node.hasChildren();

                    return (
                      <div
                        className={classNames(
                                'infinite-tree-item',
                                { 'infinite-tree-selected': selected }
                            )}
                        data-id={id}
                      >
                        <div
                          className="infinite-tree-node"
                          style={{ marginLeft: (depth - 1) * 18 }}
                        >
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
                          <span className={classNames(['infinite-tree-type', more || loadOnDemand ? 'infinite-tree-type-more' : ''])}>{more || loadOnDemand ? <Icon style={{ fontSize: '19px', paddingTop: '2px' }}>folder</Icon> : <Icon style={{ fontSize: '19px', paddingTop: '2px' }}>description</Icon>}</span>
                          <span className={classNames(['infinite-tree-title', FileView.getFileType(node) !== 'unknown' ? 'filetree-known-type' : ''])}>{name}</span>
                        </div>
                      </div>
                    );
                }}
          selectable
          shouldSelectNode={(node) => {
                    if (!node || (node === this.tree.getSelectedNode())) {
                        if (node && node.info.view === 'category') {
                            this.tree.toggleNode(node, { async: true });
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

                    if (nodeTarget.dataset) {
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
          onCloseNode={(node) => {
                }}
          onSelectNode={(node) => {
                    if (node.info.view === 'category') {
                        this.tree.openNode(node, { async: true });
                    }
                    this.navigateToNode(node, history);
                }}
          onClusterWillChange={() => {
                }}
          onClusterDidChange={() => {
                }}
          onContentWillUpdate={() => {
                }}
          onContentDidUpdate={() => {
                }}
        />)}
        />
      );
    }
}
