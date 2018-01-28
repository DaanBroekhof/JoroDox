// @flow
import React, { Component } from 'react';
import FileTree from '../components/FileTree';
import SplitterLayout from 'react-splitter-layout';
import { Link } from 'react-router-dom';

import { Switch, Route } from 'react-router';
import FileView from '../components/FileView';
import HomePage from '../containers/HomePage';

import SettingsPage from "../components/SettingsPage";
import AboutPage from "../components/AboutPage";

import StructureTree from '../components/StructureTree';
import StructureTypeView from '../components/StructureTypeView';
import StructureItemView from '../components/StructureItemView';
import StructureView from '../components/StructureView';


import AppBar from 'material-ui/AppBar';
import {Button, Card, MuiThemeProvider, createMuiTheme, Toolbar, Typography} from "material-ui";
import blueGrey from 'material-ui/colors/blueGrey';
import red from 'material-ui/colors/red';
import grey from 'material-ui/colors/grey';

const {dialog} = require('electron').remote;

const theme = createMuiTheme({
    palette: {
        primary: blueGrey,
        error: red,
        canvasColor: grey,
    },
});

export default class App extends Component {
    constructor(props) {
        super(props);

        let rootPath = localStorage.getItem('rootPath');

        //rootPath = "/Users/";

        this.state = {
            rootPath: rootPath === null ? "/" : rootPath,
        };
    }

    openDirectory = () => {
        let dir = dialog.showOpenDialog({properties: ['openDirectory', 'showHiddenFiles']});

        console.log(dir);

        if (dir && dir.length > 0) {
            this.setState({rootPath: dir[0]}, () => {
                localStorage.setItem('rootPath', this.state.rootPath);
            });
        }
    };

    render() {
        return (
            <MuiThemeProvider theme={theme}>
                <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                    <AppBar position="static">
                        <Toolbar>
                            <Typography type="title" color="inherit" style={{paddingRight: 40}}>
                                Jorodox Tool
                            </Typography>
                            <div style={{alignItems: 'right'}}>
                                <Button color="primary" style={{margin: '10px'}} onClick={this.openDirectory} raised>Explore</Button>
                                <Button color="primary" style={{margin: '10px'}} component={Link} to="/settings" raised>Settings</Button>
                                <Button color="primary" style={{margin: '10px'}} component={Link} to="/about" raised>About</Button>
                                <Button color="primary" style={{margin: '10px'}} component={Link} to="/structure" raised>Structure View</Button>
                                <Button color="primary" style={{margin: '10px'}} component={Link} to="/fileview" raised>File View</Button>
                                <Button color="primary" style={{margin: '10px'}} component={Link} to="/home" raised>Home</Button>
                            </div>
                        </Toolbar>
                    </AppBar>
                    <SplitterLayout horizontal primaryIndex={1} secondaryInitialSize={300}>
                        <Switch>
                            <Route path="/structure/:type?/:id?" render={(props) => <StructureTree root={this.state.rootPath}  {...props}/>} />
                            <Route path="/fileview/:path(.*)" render={(props) => <FileTree root={this.state.rootPath}  {...props}/>} />
                            <Route path="/" render={(props) => <FileTree root={this.state.rootPath}  {...props}/>} />
                        </Switch>
                        <Switch>
                            <Route path="/structure/:type/:id" component={(props) => <StructureItemView root={this.state.rootPath}  {...props}/>}/>
                            <Route path="/structure/:type" component={(props) => <StructureTypeView root={this.state.rootPath}  {...props}/>}/>
                            <Route path="/structure" component={(props) => <StructureView root={this.state.rootPath}  {...props}/>}/>
                            <Route path="/fileview/:path(.*)" component={FileView}/>
                            <Route path="/settings" component={SettingsPage}/>
                            <Route path="/about" component={AboutPage}/>
                            <Route path="/" component={HomePage}/>
                        </Switch>
                    </SplitterLayout>
                </div>
            </MuiThemeProvider>
        );
    }
}
