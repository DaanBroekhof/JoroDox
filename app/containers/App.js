// @flow
import React, {Component} from 'react';
import SplitterLayout from 'react-splitter-layout';
import {Link} from 'react-router-dom';
import {Switch, Route} from 'react-router';
import {Button, MuiThemeProvider, createMuiTheme, Toolbar, Typography} from 'material-ui';
import AppBar from 'material-ui/AppBar';
import searchInPage from 'electron-in-page-search';
import FileTree from '../components/FileTree';
import FileView from '../components/FileView';
import HomePage from '../containers/HomePage';
import SettingsPage from '../components/SettingsPage';
import AboutPage from '../components/AboutPage';
import StructureTree from '../components/StructureTree';
import StructureTypeView from '../components/StructureTypeView';
import StructureItemView from '../components/StructureItemView';
import StructureView from '../components/StructureView';
import ProgressInfo from '../components/ProgressInfo';

const {dialog, getCurrentWebContents, getGlobal} = require('electron').remote;

const theme = createMuiTheme({
  palette: {
    primary: {
      light: '#6d6d6d',
      main: '#424242',
      dark: '#1b1b1b',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ffff6b',
      main: '#fdd835',
      dark: '#c6a700',
      contrastText: '#000',
    },
  },
});

export default class App extends Component {
  constructor(props) {
    super(props);

    const rootPath = localStorage.getItem('rootPath');

    // rootPath = "/Users/";

    this.state = {
      rootPath: rootPath === null ? '/' : rootPath,
    };
  }

  componentDidMount() {
    this.keyPressListener = this.keyPressListener.bind(this);
    document.addEventListener('keydown', this.keyPressListener, false);

    this.inPageSearch = searchInPage(getCurrentWebContents(), {
      customSearchWindowHtmlPath: getGlobal('searchWindowDir') + '/search-window.html',
      customCssPath: getGlobal('searchWindowDir') + '/default-style.css',
    });
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keyPressListener, false);
  }

  keyPressListener(event) {
    if (event.ctrlKey && event.keyCode === 70) {
      this.inPageSearch.openSearchWindow();
    }
  }

  openDirectory = () => {
    const dir = dialog.showOpenDialog({properties: ['openDirectory', 'showHiddenFiles']});

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
              <Typography variant="title" color="inherit" style={{paddingRight: 40, lineHeight: '90%'}}>
                              Jorodox Tool<br />
                <span style={{fontSize: '50%', color: '#ccc', float: 'right'}}>v2.0.0-beta</span>
              </Typography>
              <div style={{display: 'flex', padding: 10, flexGrow: 1}}>
                <Button color="primary" variant="raised" style={{marginRight: '10px'}} component={Link} to="/">Files</Button>
                <Button color="primary" variant="raised" style={{marginRight: '10px'}} component={Link} to="/structure">Structure</Button>
                {/* <Button color="primary" variant="raised" style={{marginRight: '10px'}} component={Link} to="/settings">Settings</Button> */}
                <Button color="primary" variant="raised" style={{marginRight: '10px'}} component={Link} to="/about">About</Button>
                <ProgressInfo style={{marginLeft: '40px'}} />
                <Button color="primary" variant="raised" style={{marginRight: '10px'}} onClick={this.openDirectory}>Open...</Button>
              </div>
            </Toolbar>
          </AppBar>
          <SplitterLayout horizontal primaryIndex={1} secondaryInitialSize={300}>
            <Switch>
              <Route path="/structure/c/:category" render={(props) => <StructureTree root={this.state.rootPath} {...props} />} />
              <Route path="/structure/:kind?/:type?/:id?" render={(props) => <StructureTree root={this.state.rootPath} {...props} />} />
              <Route path="/fileview/:path(.*)" render={(props) => <FileTree root={this.state.rootPath} {...props} />} />
              <Route path="/" render={(props) => <FileTree root={this.state.rootPath} {...props} />} />
            </Switch>
            <Switch>
              <Route path="/structure/c/:category" component={(props) => <StructureView root={this.state.rootPath} {...props} />} />
              <Route path="/structure/t/:type/:id(.*)" component={(props) => <StructureItemView root={this.state.rootPath} {...props} />} />
              <Route path="/structure/t/:type" component={(props) => <StructureTypeView root={this.state.rootPath} {...props} />} />
              <Route path="/structure" component={(props) => <StructureView root={this.state.rootPath} {...props} />} />
              <Route path="/fileview/:path(.*)" component={FileView} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/" component={HomePage} />
            </Switch>
          </SplitterLayout>
          <Route path="/about" component={AboutPage} />
        </div>
      </MuiThemeProvider>
    );
  }
}
