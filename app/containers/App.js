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

        this.state = {
            rootPath: "F:\\Games\\Steam\\steamapps\\common\\Europa Universalis IV",
        };

        //this.openDirectory = this.openDirectory.bind(this);
    }

    openDirectory = () => {
        let dir = dialog.showOpenDialog({properties: ['openDirectory']});

        console.log(dir);

        if (dir && dir.length > 0)
            this.setState({rootPath: dir[0]});
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
                            </div>
                        </Toolbar>
                    </AppBar>
                    <SplitterLayout horizontal primaryIndex={1} secondaryInitialSize={300}>
                        <FileTree root={this.state.rootPath}/>
                        <Switch>
                            <Route path="/fileview/:path*" component={FileView}/>
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
