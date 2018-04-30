// @flow
import React, {Component} from 'react';
import SplitterLayout from 'react-splitter-layout';
import {Link} from 'react-router-dom';
import {Switch, Route} from 'react-router';
import {Button, MuiThemeProvider, createMuiTheme, Toolbar, Typography, Tabs, Tab} from 'material-ui';
import AppBar from 'material-ui/AppBar';
import searchInPage from 'electron-in-page-search';
import FileTree from '../components/FileTree';
import FileView from '../components/FileView';
import SettingsPage from '../components/SettingsPage';
import AboutPage from '../components/AboutPage';
import StructureTree from '../components/StructureTree';
import StructureTypeView from '../components/StructureTypeView';
import StructureItemView from '../components/StructureItemView';
import StructureView from '../components/StructureView';
import ProgressInfo from '../components/ProgressInfo';
import ProjectsPage from '../components/ProjectsPage';

const {getCurrentWebContents, getGlobal} = require('electron').remote;

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

    let projects = JSON.parse(localStorage.getItem('projects'));
    if (!projects) {
      projects = [];
    }

    let currentProject = projects.find(x => x.isCurrent);

    if (!currentProject) {
      currentProject = {
        rootPath: '/',
        definitionType: 'eu4',
        isCurrent: true,
      };
      projects.push(currentProject);
    }

    this.state = {
      project: currentProject,
      projects,
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

  changeProject = (newSettings) => {
    const newProjectState = {...(this.state.project), ...newSettings};
    const newProjectsState = this.state.projects.map(p => (p.isCurrent ? newProjectState : p));

    this.setState({project: newProjectState, projects: newProjectsState}, () => {
      localStorage.setItem('projects', JSON.stringify(this.state.projects));
    });
  };

  handleTab = (event, newTab) => {
    switch (newTab) {
      default:
      case 'fileview': this.props.history.push('/fileview/' + this.state.project.rootPath); break;
      case 'structure': this.props.history.push('/structure'); break;
      case 'projects': this.props.history.push('/projects'); break;
    }
  }

  render() {
    let currentTab = false;
    if (this.props.location.pathname.startsWith('/fileview')) {
      currentTab = 'fileview';
    }
    if (this.props.location.pathname.startsWith('/structure')) {
      currentTab = 'structure';
    }
    if (this.props.location.pathname.startsWith('/projects')) {
      currentTab = 'projects';
    }

    return (
      <MuiThemeProvider theme={theme}>
        <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="title" color="inherit" style={{paddingRight: 40, lineHeight: '90%'}}>Jorodox Tool<br />
                <span style={{fontSize: '50%', color: '#ccc', float: 'right'}}>v2.0.0-beta</span>
              </Typography>
              <div style={{display: 'flex', flexGrow: 1}}>
                <Tabs value={currentTab} onChange={this.handleTab}>
                  <Tab value="projects" label="Project" />
                  <Tab value="fileview" label="Files" />
                  <Tab value="structure" label="Game data" />
                </Tabs>
                <ProgressInfo style={{marginLeft: '40px'}} />
                <Button color="primary" variant="raised" style={{marginRight: '10px'}} component={Link} to="/about">About</Button>
              </div>
            </Toolbar>
          </AppBar>
          <SplitterLayout horizontal primaryIndex={1} secondaryInitialSize={300}>
            <Switch>
              <Route path="/structure/c/:category" render={(props) => <StructureTree project={this.state.project} {...props} />} />
              <Route path="/structure/:kind?/:type?/:id?" render={(props) => <StructureTree project={this.state.project} {...props} />} />
              <Route path="/fileview/:path(.*)" render={(props) => <FileTree project={this.state.project} {...props} />} />
              <Route path="/" render={(props) => <FileTree project={this.state.project} {...props} />} />
            </Switch>
            <Switch>
              <Route path="/structure/c/:category" component={(props) => <StructureView project={this.state.project} {...props} />} />
              <Route path="/structure/t/:type/:id(.*)" component={(props) => <StructureItemView project={this.state.project} {...props} />} />
              <Route path="/structure/t/:type" component={(props) => <StructureTypeView project={this.state.project} {...props} />} />
              <Route path="/structure" component={(props) => <StructureView project={this.state.project} {...props} />} />
              <Route path="/fileview/:path(.*)" component={FileView} />
              <Route path="/projects" component={(props) => <ProjectsPage project={this.state.project} projects={this.state.projects} handleChange={this.changeProject} {...props} />} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/" component={(props) => <ProjectsPage project={this.state.project} projects={this.state.projects} handleChange={this.changeProject} {...props} />} />
            </Switch>
          </SplitterLayout>
          <Route path="/about" component={AboutPage} />
        </div>
      </MuiThemeProvider>
    );
  }
}
