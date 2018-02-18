// @flow
import React, {Component} from 'react';
import {Grid, applyGridConfig, Actions} from 'react-redux-grid';
import {Button, Icon, IconButton, Paper, Tooltip, Typography} from "material-ui";
import JdxDatabase from "../utils/JdxDatabase";
import _ from 'lodash';
import Eu4Definition from '../definitions/eu4';
import {Link} from "react-router-dom";
import StructureLoaderTask from "../utils/tasks/StructureLoaderTask";
import {connect} from "react-redux";
import FileLoaderTask from "../utils/tasks/FileLoaderTask";
import PdxScriptParserTask from "../utils/tasks/PdxScriptParserTask";

class StructureTypeView extends Component {

    loadTypeFiles(typeId) {
        let type = _(Eu4Definition.types).find(x => x.id === typeId);

        return new Promise((resolve, reject) => {
            FileLoaderTask.start(
                {
                    root: this.props.root,
                    typeDefinition: _(Eu4Definition.types).find(x => x.id === 'files'),
                    searchPattern: type.sourceType.pathPattern.replace('{type.id}', type.id),
                    searchPath: type.sourceType.pathPrefix.replace('{type.id}', type.id),
                },
                (progress, total, message) => console.log('[' + progress + '/' + total + '] ' + message),
                (result) => {resolve(result);},
                (error) => {reject(error);},
            );
        });
    }

    loadPdxScriptFiles(typeId) {
        let type = _(Eu4Definition.types).find(x => x.id === typeId);

        return new Promise((resolve, reject) => {
            PdxScriptParserTask.start({
                    root: this.props.root,
                    definition: Eu4Definition,
                    filterTypes: [type.id],
                },
                (progress, total, message) => console.log('['+ progress +'/'+ total +'] '+ message),
                (result) => {resolve(result);},
                (error) => {reject(error);},
            );
        });
    }

    reloadTypeById(typeId) {
        JdxDatabase.reloadTypeById(this.props.root, typeId).then(() => {
            console.log("done");
            this.props.reloadGrid(this.gridSettings);
        });
    }

    render() {

        if (!this.props.match.params.type) {
            return <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Error during type view
                load.</p></Paper>;
        }

        let typeDefinition = _(Eu4Definition.types).find(x => x.id === this.props.match.params.type);
        if (!typeDefinition) {
            return <Paper style={{flex: 1, margin: 20, padding: 20, alignSelf: 'flex-start'}}><p>Could not find type
                definition.</p></Paper>;
        }

        let rootPath = this.props.root;
        let dataSource = function getData({pageIndex, pageSize}) {

            if (!pageIndex)
                pageIndex = 0;
            if (!pageSize)
                pageSize = typeDefinition.listView.pageSize;

            return new Promise((resolve) => {
                JdxDatabase.get(rootPath).then(db => {
                    db[typeDefinition.id].count((total) => {
                        db[typeDefinition.id].offset(pageIndex * pageSize).limit(pageSize).toArray((result) => {

                            if (typeDefinition.listView.unsetKeys) {
                                result = result.map(x => {
                                    typeDefinition.listView.unsetKeys.forEach(keys => {
                                        _.unset(x, keys);
                                    });
                                    return x;
                                });
                            }


                            resolve({
                                data: result,
                                total: total,
                            });
                        });
                    });
                });
            });
        };

        let columns = typeDefinition.listView.columns.map(c => {
            if (c.linkTo) {
                c.renderer = ({value, column}) => {
                    return <span><Link to={"/structure/"+ column.linkTo.replace('[self]', this.props.match.params.type) +"/"+ value}>{value}</Link></span>
                };
            }
            return c;
        });



        let gridSettings = {
            height: false,
            columns: columns,
            plugins: {
                PAGER: {
                    enabled: true,
                    pagingType: 'remote',
                    toolbarRenderer: (pageIndex, pageSize, total, currentRecords, recordType) => {
                        return `${pageIndex * pageSize} - ${pageIndex * pageSize + currentRecords} of ${total}`;
                    },
                    pagerComponent: false
                },
                COLUMN_MANAGER: {
                    resizable: true,
                    minColumnWidth: 10,
                    moveable: true,
                    sortable: {
                        enabled: true,
                        method: 'local',
                    }
                },
                LOADER: {
                    enabled: true
                },
            },
            dataSource: dataSource,
            stateKey: "typeList-" + this.props.match.params.type,
            pageSize: typeDefinition.listView.pageSize,
            style: {
                display: 'flex',
                flexDirection: 'column',
            },
            events: {
                HANDLE_ROW_CLICK: ({row}) => {
                    //this.props.history.push('/structure/'+ typeDefinition.id +'/'+ row[typeDefinition.primaryKey]);
                },
            }
        };

        this.gridSettings = gridSettings;

        return (
            <Paper style={{flex: 1, margin: 20, padding: 20, display: 'flex', flexDirection: 'column'}}>
                <Typography variant="display2" gutterBottom><Link to={`/structure`}>Type</Link>: {typeDefinition.title}</Typography>
                <div style={{marginBottom: 20}}>
                <Button variant="raised" color="secondary" style={{marginRight: 10}} onClick={() => this.reloadTypeById(this.props.match.params.type)}>Reload</Button>
                </div>

                <Grid {...gridSettings}></Grid>
            </Paper>
        );
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        reloadGrid: (gridSettings) => {
            dispatch(Actions.GridActions.getAsyncData({
                stateKey:  gridSettings.stateKey,
                dataSource: gridSettings.dataSource,
                type: gridSettings.type,
            }))
        },
    }
}

export default connect(null, mapDispatchToProps)(StructureTypeView);