import React from 'react';
import classNames from 'classnames';
import InfiniteTree from 'react-infinite-tree';
import 'react-infinite-tree/dist/react-infinite-tree.css';
const jetpack = require('electron').remote.require('fs-jetpack');
const syspath = require('electron').remote.require('path');
import { Route } from 'react-router';
import FileView from './FileView';
import {Icon} from "material-ui";

export default class StructureTree extends React.Component {
    tree = null;
    treeData = null;

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
        if (!this.tree.getSelectedNode() || nextProps.match.params.path !== this.tree.getSelectedNode().id) {
            if (nextProps.match)
                this.doOpenToPath(this.tree.getRootNode(), nextProps.match.params.path);
        }
    }

    doOpenToPath(node, path = null, updated = false) {
        if (path)
            this.openToPath = path;
        if (!this.openToPath)
            return;

        let found = false;
        for (let child of node.children) {
            if (this.openToPath === child.id) {
                this.openToPath = null;
                this.tree.selectNode(child);
                found = true;
                break;
            }
            else if (this.openToPath.startsWith(child.id + syspath.sep)) {
                if (!child.state.open)
                    this.tree.openNode(child, {async: true});
                else
                    this.doOpenToPath(child);
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
        if (!node.id)
            return;

        let localJetpack = jetpack.cwd(node.id);
        let dirs = localJetpack.find('.', {matching: '*', recursive: false, files: false, directories: true});
        let files = localJetpack.find('.', {matching: '*', recursive: false, files: true, directories: false});

        let nodeIds = [];
        let newNodes = {};
        for (let dirName of dirs) {
            let id = node.id + syspath.sep + dirName;
            nodeIds.push('D:'+id);
            if (!this.tree.getNodeById(id)) {
                newNodes['D:'+id] = {
                    id: id,
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
        for (let fileName of files) {
            let id = node.id + syspath.sep + fileName;
            nodeIds.push('F:'+id);
            if (!this.tree.getNodeById(id)) {
                newNodes['F:'+id] = {
                    id: id,
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

        nodeIds.sort((a, b) => {
            return a.localeCompare(b);
        });

        // Remove all nodes that no longer exist
        for (let c of node.children) {
            if (!nodeIds.includes((c.info.type === 'dir' ? 'D:' : 'F:') + c.id)) {
                this.tree.removeNode(c);
            }
        }

        // Insert new nodes
        let index = 0;
        for (let nodeId of nodeIds) {
            if (newNodes[nodeId]) {
                this.tree.addChildNodes([newNodes[nodeId]], index, node)
            }
            index++;
       }
    }

    setTreeState() {

        this.setState({
            treeData: {
                id: 'root:0',
                name: 'Types',
                loadOnDemand: true,
                info: {
                    view: 'types',
                },
            }
        }, function() {
            this.tree.loadData(this.state.treeData);

            this.tree.openNode(this.tree.getRootNode().children[0]);

            if (this.props.match.params.path && this.props.match.params.path.startsWith(root)) {
//                this.doOpenToPath(this.tree.getRootNode(), this.props.match.params.path);
            }
            else {
//                this.doOpenToPath(this.tree.getRootNode(), root);
            }
        });
    }

    render(){
        let fileTree = this;
        return (
            <Route render={({ history}) => (<InfiniteTree
                style={{display: 'flex', flex: 1, backgroundColor: 'white'}}
                ref={(c) => this.tree = c ? c.tree : null}
                autoOpen={true}
                loadNodes={(parentNode, done) => {

                    if (parentNode.id === 'root:0') {
                        done(null, [{
                            id: 'type:files',
                            name: 'Files',
                            info: {
                                view: 'type',
                                type: 'files',
                            },
                        }]);
                    }
                    else {
                        done(null, []);
                    }
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
                                className="infinite-tree-node"
                                style={{ marginLeft: (depth-1) * 18 }}
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
                                <span className={classNames(["infinite-tree-type", more || loadOnDemand ? 'infinite-tree-type-more' : ''])}>{more || loadOnDemand ? <Icon style={{fontSize: '19px', paddingTop: '2px'}}>folder</Icon> : <Icon style={{fontSize: '19px', paddingTop: '2px'}}>description</Icon>}</span>
                                <span className={classNames(["infinite-tree-title", FileView.getFileType(node) !== 'unknown' ? 'filetree-known-type' : ''])}>{name}</span>
                            </div>
                        </div>
                    );
                }}
                selectable={true}
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
                    const target = event.target || event.srcElement; // IE8
                    //history.push('/fileview/')

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
                        //this.tree.openNode(node, {async: true});
                    }


                    if (node.info.view === 'types') {
                        if (history.location.pathname !== '/structure')
                            history.push('/structure');
                    }
                    if (node.info.view === 'type') {
                        if (history.location.pathname !== '/structure/' + node.info.type)
                            history.push('/structure/' + node.info.type);
                    }
                    if (node.info.view === 'item') {
                        if (history.location.pathname !== '/structure/' + node.info.type +'/'+ node.info.id)
                            history.push('/structure/' + node.info.type +'/'+ node.info.id);
                    }
                }}
                onClusterWillChange={() => {
                }}
                onClusterDidChange={() => {
                }}
                onContentWillUpdate={() => {
                }}
                onContentDidUpdate={() => {
                }}
            />)} />
        );
    }
}
