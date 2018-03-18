// @flow
import React, {Component} from 'react';
import InfiniteTree from 'react-infinite-tree';
import * as iconv from 'iconv-lite';
import classNames from 'classnames';
import PdxScript from '../utils/PdxScript';

const jetpack = require('electron').remote.require('fs-jetpack');

export default class PdxScriptView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fileTreeData: this.parseFile(props.file.path)
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.file.path !== this.props.file.path) {
      this.setState({
        fileTreeData: this.parseFile(nextProps.file.path)
      });
    }
  }

  parseFile(path) {
    const parser = new PdxScript();
    const data = parser.readFile(iconv.decode(jetpack.read(path, 'buffer'), 'win1252'));
    return parser.errors.length ? null : data;
  }

  componentDidMount() {
    this.tree.loadData(this.state.fileTreeData);
    if (this.tree.getChildNodes()) { this.tree.selectNode(this.tree.getChildNodes()[0]); }
  }

  componentDidUpdate() {
    this.tree.loadData(this.state.fileTreeData);
    if (this.tree.getChildNodes()) { this.tree.selectNode(this.tree.getChildNodes()[0]); }
  }

  render() {
    return (
      <InfiniteTree
        ref={(c) => this.tree = c ? c.tree : null}
        style={{display: 'flex', flex: 1, border: '1px solid #eee'}}
        autoOpen={false}
        loadNodes={(parentNode, done) => {}}
        rowRenderer={(node, treeOptions) => {
          const {id, name, loadOnDemand = false, children, state} = node;
          const {depth, open, selected = false} = state;
          const more = node.hasChildren();

          // Do not show root node
          if (depth === 0) {
              return <div />;
          }

          return (
            <div className={classNames('infinite-tree-item', {'infinite-tree-selected': selected})} data-id={id} >
              <div className="infinite-tree-node pdx-script-node" style={{paddingLeft: (depth - 1) * 18}} >
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
                <span className={classNames(['infinite-tree-type', more || loadOnDemand ? 'infinite-tree-type-more' : ''])}>{more || loadOnDemand ? '🖿' : '🗎'}</span>
                <span className="infinite-tree-title">{name}</span>
              </div>
              <div className="pdx-script-count">{children.length ? children.length : ''}</div>
              <div className="pdx-script-value">{Array.isArray(node.value) ? `[${node.value.join(', ')}]` : node.value}</div>
            </div>
          );
        }}
        selectable
        shouldSelectNode={(node) => {
          if (!node || (node === this.tree.getSelectedNode())) {
            if (node && node.hasChildren()) {
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
          function openAllChildren(node, tree, doClose = false) {
            if (!doClose) { tree.openNode(node); } else { tree.closeNode(node); }
            if (node.hasChildren()) {
              for (const c of node.children) {
                openAllChildren(c, tree, doClose);
              }
            }
          }
          if (this.tree.getSelectedNode()) { setTimeout(() => { openAllChildren(this.tree.getSelectedNode(), this.tree); }, 0); }
        }}
        onKeyDown={(event) => {
          // keydown event
        }}
        onKeyUp={(event) => {
          // keyup event
        }}
        onOpenNode={(node) => {}}
        onCloseNode={(node) => {}}
        onSelectNode={(node) => {
          this.tree.toggleNode(node, {async: true});
        }}
        onClusterWillChange={() => {}}
        onClusterDidChange={() => {}}
        onContentWillUpdate={() => {}}
        onContentDidUpdate={() => {}}
      />
    );
  }
}
