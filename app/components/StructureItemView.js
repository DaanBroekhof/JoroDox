// @flow
import React, { Component } from 'react';

import {Icon, IconButton, Paper, Tooltip, Typography} from "material-ui";
import Eu4Definition from "../definitions/eu4";
import JdxDatabase from "../utils/JdxDatabase";
import {applyGridConfig, Grid} from 'react-redux-grid';
import _ from 'lodash';
import {Link} from "react-router-dom";
import {Actions} from "react-redux-grid";
import {connect} from "react-redux";


class StructureItemView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            item: null,
            relationsFrom: [],
            relationsTo: [],
        };
    }

    createTreeItem(key, item, startAtParentId, parentId, idCounter, depth) {
        if (!idCounter) {
            idCounter = {id: 1};
        }
        if (depth === undefined) {
            depth = 0;
        }
        else {
            depth = depth + 1;
        }

        let isArray = _.isArray(item);

        let treeItem = {
            id: !parentId ? -1 : idCounter.id++,
            key: key,
            value: isArray ? <i style={{color: 'lightgrey'}}>[{item.length} items]</i> : (_.isPlainObject(item) ?
                <i style={{color: 'lightgrey'}}>[{_(item).size()} properties]</i> :
                <span style={{color: 'green'}}>{(_.isObject(item) ? item.toString() : item)}</span>),
            parentId: parentId,
            _hideChildren: parentId && depth > 1 ? true : false,
            children: [],
        };
        idCounter.id++;

        if (_.isArray(item)) {
            _(item).forEach((value, key) => {
                treeItem.children.push(this.createTreeItem(!isArray ? key :
                    <i>{key}</i>, value, startAtParentId, treeItem.id, idCounter, depth));
            });
        }
        else if (_.isPlainObject(item)) {
            _(item).forOwn((value, key) => {
                treeItem.children.push(this.createTreeItem(key, value, startAtParentId, treeItem.id, idCounter, depth));
            });
        }

        if (treeItem.children.length > 200 && !startAtParentId) {
            treeItem.children = [];
            treeItem.leaf = false;
            treeItem._hideChildren = false;
        }

        if (startAtParentId && idCounter.id > startAtParentId && treeItem.id !== startAtParentId) {
            let found = treeItem.children.find(x => x && x.id === startAtParentId);
            if (found)
                treeItem = found;
        }

        return !parentId && !startAtParentId ? {root: treeItem} : treeItem;
    }

    componentDidMount() {
        this.loadRelations(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.loadRelations(nextProps);
    }

    loadRelations(props) {
        let typeDefinition = _(Eu4Definition.types).find(x => x.id === props.match.params.type);

        if (typeDefinition) {
            JdxDatabase.get(props.root).then(db => {
                db.relations.where(['fromType', 'fromId']).equals([typeDefinition.id, props.match.params.id]).toArray(relations => {
                    this.setState({relationsFrom: _.sortBy(relations, ['toKey', 'toType', 'toId'])});
                });
                db.relations.where(['toType', 'toId']).equals([typeDefinition.id, props.match.params.id]).toArray(relations => {
                    this.setState({relationsTo: _.sortBy(relations, ['fromKey', 'fromType', 'fromId'])});
                });
            });
        }
    }

    render() {
        if (!this.props.match.params.type) {
            return <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Error during type view load.</p></Paper>;
        }

        let typeDefinition = _(Eu4Definition.types).find(x => x.id === this.props.match.params.type);
        if (!typeDefinition) {
            return <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Could not find type definition.</p></Paper>;
        }

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
        }*/
        let view = this;
        let dataSource = function getData({pageIndex, pageSize, parentId}) {
            let x = new Promise((resolve) => {
                JdxDatabase.get(view.props.root).then(db => {
                    db[typeDefinition.id].where({[typeDefinition.primaryKey]: view.props.match.params.id}).first(item => {
                        if (item) {
                            let treeItem = view.createTreeItem('root', item, parentId);
                            view.setState({item: item});
                            if (parentId) {
                                resolve({data: treeItem.children, partial: true});
                                //this.props.setTreeNodeVisibility(row.id, !row._isExpanded, "typeView-" + this.props.match.params.type +"-" + this.props.match.params.id, true);
                            }
                            else
                                resolve({data: treeItem, total: 1});
                        }
                    });
                });
            });

            return x;
        };

        let gridSettings = {
            height: false,
            gridType: 'tree',
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
            dataSource: dataSource,
            stateKey: "typeView-" + this.props.match.params.type +"-" + this.props.match.params.id,
            pageSize: 1000,
            style: {
                display: 'flex',
                flexDirection: 'column',
            },
            events: {
                HANDLE_ROW_CLICK: ({row}) => {
                    if (row.leaf === false && row._hasChildren === false) {
                        dataSource({parentId: row._id}).then((result) => {
                            this.props.setPartialTreeData(result.data, "typeView-" + this.props.match.params.type + "-" + this.props.match.params.id, row._id);
                        })
                    }
                    else {
                        this.props.setTreeNodeVisibility(row._id, !row._isExpanded, "typeView-" + this.props.match.params.type + "-" + this.props.match.params.id, false);
                    }
                },
            },
            ref2: (grid) => {
                let x= 34234;
                this.grid = grid;
            }
        };

        return (
            <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}>
                <Typography variant="display1" gutterBottom><Link to={`/structure/${this.props.match.params.type}`}>{typeDefinition.title}</Link>: {this.props.match.params.id}</Typography>

                <Grid ref={(input) => { this.grid = input; }} {...gridSettings}></Grid>

                {this.state.relationsFrom.length > 0 &&
                    <div>
                        <h4>Linked from</h4>
                        <ul>
                            {this.state.relationsFrom.map(r => <li key={r.id}>{r.toKey}: <Link
                                to={`/structure/${r.toType}/${r.toId}`}>{r.toId}</Link></li>)}
                        </ul>
                    </div>
                }
                {this.state.relationsTo.length > 0 &&
                    <div>
                        <h4>Linked to</h4>
                        <ul>
                            {this.state.relationsTo.map(r => <li key={r.id}>{r.fromKey}: <Link
                                to={`/structure/${r.fromType}/${r.fromId}`}>{r.fromId}</Link></li>)}
                        </ul>
                    </div>
                }

            </Paper>
        );
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        setTreeNodeVisibility: (id, visible, stateKey, showTreeRootNode) => {
            dispatch(Actions.GridActions.setTreeNodeVisibility({id, visible, stateKey, showTreeRootNode}))
        },
        setPartialTreeData: (data, stateKey, parentId) => {
            dispatch(Actions.GridActions.setTreeData({partial: true, data, parentId, stateKey}));
        },
    }
}

export default connect(null, mapDispatchToProps)(StructureItemView);