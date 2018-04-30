import React from 'react';
import classNames from 'classnames';
import InfiniteTree from 'react-infinite-tree';
import 'react-infinite-tree/dist/react-infinite-tree.css';

import {Route} from 'react-router';
import {Icon} from 'material-ui';
import FileView from './FileView';

const jetpack = require('electron').remote.require('fs-jetpack');
const syspath = require('electron').remote.require('path');

type Props = {
  project: object,
  match: object
};
type State = {
  treeData: object
};

export default class FileTree extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      treeData: null,
    };
  }

  componentDidMount() {
    this.setTreeState(this.props.project.rootPath);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.project.rootPath !== this.props.project.rootPath) {
      this.setTreeState(nextProps.project.rootPath);
    }
    if (!this.tree.getSelectedNode() || nextProps.match.params.path !== this.tree.getSelectedNode().id) {
      if (nextProps.match && nextProps.match.params.path) {
        this.doOpenToPath(this.tree.getRootNode(), nextProps.match.params.path);
      }
    }
  }

  tree = null;
  treeData = null;

  doOpenToPath(node, path = null, updated = false, select = true) {
    if (path) { this.openToPath = path; }
    if (!this.openToPath) { return; }

    let found = false;
    for (const child of node.children) {
      if (this.openToPath === child.id) {
        this.openToPath = null;
        if (child && child.info.type === 'dir') {
          this.tree.openNode(child, {async: true});
        }
        if (select) {
          this.tree.selectNode(child);
        }
        found = true;
        break;
      } else if (this.openToPath.startsWith(child.id + syspath.sep)) {
        if (!child.state.open) {
          this.tree.openNode(child, {async: true});
        } else {
          this.doOpenToPath(child);
        }
        found = true;
        break;
      }
    }

    if (!found && !updated) {
      this.updateNode(node);
      this.doOpenToPath(node, path, true);
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
      index += 1;
    }
  }

  setTreeState(root) {
    const rootInfo = jetpack.inspect(root, {absolutePath: true});

    this.setState({
      treeData: {
        id: rootInfo.absolutePath,
        name: rootInfo.name,
        loadOnDemand: true,
        info: rootInfo,
      }
    }, () => {
      this.tree.loadData(this.state.treeData);

      if (this.props.match.params.path && this.props.match.params.path.startsWith(root)) {
        this.doOpenToPath(this.tree.getRootNode(), this.props.match.params.path);
      } else {
        this.doOpenToPath(this.tree.getRootNode(), root, false, false);
      }
    });
  }

  render() {
    const fileTree = this;
    return (
      <Route render={({history}) => (<InfiniteTree
        style={{display: 'flex', flex: 1, backgroundColor: 'white'}}
        ref={(c) => { this.tree = c ? c.tree : null; }}
        autoOpen
        loadNodes={(parentNode, done) => {
          const localJetpack = jetpack.cwd(parentNode.id);
          const dirs = localJetpack.find('.', {
matching: '*', recursive: false, files: false, directories: true
});
          const files = localJetpack.find('.', {matching: '*', recursive: false});

          const dirNodes = dirs.map((name) => ({
            id: parentNode.id + syspath.sep + name,
            name,
            loadOnDemand: true,
            info: {
                name,
                type: 'dir',
                absolutePath: parentNode.id + syspath.sep + name,
            },
          })).sort((a, b) => a.name.localeCompare(b.name));
          const fileNodes = files.map((name) => ({
            id: parentNode.id + syspath.sep + name,
            name,
            loadOnDemand: false,
            info: {
              name,
              type: 'file',
              absolutePath: parentNode.id + syspath.sep + name,
            },
          })).sort((a, b) => a.name.localeCompare(b.name));

          done(null, dirNodes.concat(fileNodes));
      }}
        rowRenderer={(node, treeOptions) => {
          const {
id, name, loadOnDemand = false, state
} = node;
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
                <span className={classNames(['infinite-tree-type', more || loadOnDemand ? 'infinite-tree-type-more' : ''])}>{
                  more || loadOnDemand ? <Icon style={{fontSize: '19px', paddingTop: '2px'}}>folder</Icon> : <Icon style={{fontSize: '19px', paddingTop: '2px'}}>description</Icon>
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
            if (node && node.info.type === 'dir') {
              this.tree.toggleNode(node, {async: true});
            }
            return false; // Prevent from deselecting the current node
          }
          return true;
        }}
        onClick={(event) => {
          // click event
          // const target = event.target || event.srcElement; // IE8
          // history.push('/fileview/')
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
          fileTree.doOpenToPath(node);
        }}
        onCloseNode={(node) => {
        }}
        onSelectNode={(node) => {
          if (node.info.type === 'dir') {
            this.tree.openNode(node, {async: true});
          }
          if (history.location.pathname !== `/fileview/${node.info.absolutePath}`) {
            history.push(`/fileview/${node.info.absolutePath}`);
          }
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
