// @flow
import React, {Component} from 'react';
import {Grid, applyGridConfig} from 'react-redux-grid';
import {Icon, IconButton, Paper, Tooltip, Typography} from "material-ui";
import JdxDatabase from "../utils/JdxDatabase";
import _ from 'lodash';
import Eu4Definition from '../definitions/eu4';
import {Link} from "react-router-dom";

export default class StructureTypeView extends Component {

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
                    return <span><Link to={"/structure/"+ column.linkTo +"/"+ value}>{value}</Link></span>
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

        return (
            <Paper style={{flex: 1, margin: 20, padding: 20, display: 'flex', flexDirection: 'column'}}>
                <Typography variant="display2" gutterBottom>Type: {typeDefinition.title}</Typography>

                <Grid {...gridSettings}></Grid>
            </Paper>
        );
    }
}