// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
import InfiniteTree from 'react-infinite-tree';
import classNames from 'classnames';
import PdxScript from '../utils/PdxScript';

export default class FileView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            file: jetpack.inspect(this.props.match.params.path),
            fileTreeData: null,
        };
    }

    componentWillReceiveProps(nextProps) {
        let parser = new PdxScript();
        this.state = {
            file: jetpack.inspect(nextProps.match.params.path),
            fileTreeData: null,
        };
        if (this.state.file.type === 'file') {
            let data = parser.readFile(jetpack.read(nextProps.match.params.path));
            this.state.fileTreeData = parser.errors.length ? null : data;
        }

        if (this.tree) {
            this.tree.loadData(this.state.fileTreeData);
            this.tree.selectNode(this.tree.getChildNodes()[0]);
        }
    }

    componentDidMount() {
        this.tree.loadData(this.state.fileTreeData);
    }

    render() {
        return (
            <div>
                <h2>{this.state.file.name}</h2>
                <p>Size: {this.state.file.size}</p>
                <InfiniteTree
                    ref={(c) => this.tree = c ? c.tree : null}
                    autoOpen={false}
                    loadNodes={(parentNode, done) => {
                    }}
                    rowRenderer={(node, treeOptions) => {
                        const { id, name, loadOnDemand = false, children, state, props = {} } = node;
                        const droppable = treeOptions.droppable;
                        const { depth, open, path, total, selected = false } = state;
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
                                    className="infinite-tree-node pdx-script-node"
                                    style={{ paddingLeft: depth * 18 }}
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
                                    <span className={classNames(treeOptions.togglerClass)}> </span>
                                    }
                                    <span className={classNames(["infinite-tree-type", more || loadOnDemand ? 'infinite-tree-type-more' : ''])}>{more || loadOnDemand ? '🖿' : '🗎'}</span>
                                    <span className="infinite-tree-title">{name}</span>
                                </div>
                                <div className="pdx-script-value">{node.value}</div>
                            </div>
                        );
                    }}
                    selectable={true}
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
                        const target = event.target || event.srcElement; // IE8
                        //history.push('/fileview/')

                    }}
                    onDoubleClick={(event) => {
                        function openAllChildren(node, tree, doClose = false) {
                            if (!doClose)
                                tree.openNode(node);
                            else
                                tree.closeNode(node);
                            if (node.hasChildren()) {
                                for (let c of node.children) {
                                    openAllChildren(c, tree, doClose);
                                }
                            }
                        }
                        if (this.tree.getSelectedNode())
                            setTimeout(() => { openAllChildren(this.tree.getSelectedNode(), this.tree); }, 0);
                    }}
                    onKeyDown={(event) => {
                        // keydown event
                    }}
                    onKeyUp={(event) => {
                        // keyup event
                    }}
                    onOpenNode={(node) => {
                    }}
                    onCloseNode={(node) => {
                    }}
                    onSelectNode={(node) => {
                        this.tree.toggleNode(node, {async: true});
                    }}
                    onClusterWillChange={() => {
                    }}
                    onClusterDidChange={() => {
                    }}
                    onContentWillUpdate={() => {
                    }}
                    onContentDidUpdate={() => {
                    }}
                />
            </div>
        );
    }
}
