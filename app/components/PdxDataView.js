// @flow
import React, { Component } from 'react';
const jetpack = require('electron').remote.require('fs-jetpack');
import InfiniteTree from 'react-infinite-tree';
import classNames from 'classnames';
import PdxData from '../utils/PdxData';

export default class PdxDataView extends Component {

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
        let parser = new PdxData();
        let data = parser.readFromBuffer(new Uint8Array(jetpack.read(path, 'buffer')).buffer);

        let id = 1;
        let addIdsToTree = function (node) {
            node.id = id;
            id++;
            if (node.children) {
                for (let child of node.children) {
                    addIdsToTree(child);
                }
            }
            return node
        };
        data = addIdsToTree(data);

        return data;
    }


    componentDidMount() {
        this.tree.loadData(this.state.fileTreeData);
        if (this.tree.getChildNodes())
            this.tree.selectNode(this.tree.getChildNodes()[0]);
    }

    componentDidUpdate() {
        this.tree.loadData(this.state.fileTreeData);
        if (this.tree.getChildNodes())
            this.tree.selectNode(this.tree.getChildNodes()[0]);
    }

    render() {
        return (
            <InfiniteTree
                ref={(c) => this.tree = c ? c.tree : null}
                style={{display: 'flex', flex: 1, border : '1px solid #eee'}}
                autoOpen={false}
                loadNodes={(parentNode, done) => {
                }}
                rowRenderer={(node, treeOptions) => {
                    const { id, name, loadOnDemand = false, children, state, props = {} } = node;
                    const droppable = treeOptions.droppable;
                    const { depth, open, path, total, selected = false } = state;
                    const more = node.children && node.hasChildren();

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
                            <div className="pdx-data-type">{node.type}</div>
                            <div className="pdx-data-value">{Array.isArray(node.value) ? '[' + node.value.join(', ') + ']' : node.value}</div>
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
        );
    }
}
