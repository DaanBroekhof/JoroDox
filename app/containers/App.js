// @flow
import React, {Component} from 'react';
import SplitterLayout from 'react-splitter-layout';
import {Link} from 'react-router-dom';
import {Switch, Route, Router} from 'react-router';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import {MuiThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import {autorun, reaction} from 'mobx';

import {inject, observer, Provider} from 'mobx-react';

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
import ProjectForm from '../components/ProjectForm';
import EventEditor from '../components/EventEditor';
import ProjectsTree from '../components/ProjectsTree';
import ErrorPage from '../components/ErrorPage';
import WatchDirectoryTask from '../utils/tasks/WatchDirectoryTask';
import JdxDatabase from '../utils/JdxDatabase';
import SchemaValidatorTask from '../utils/tasks/SchemaValidatorTask';

const {getCurrentWebContents, getGlobal} = require('electron').remote;
const jetpack = require('electron').remote.require('fs-jetpack');
const remote = require('electron').remote;


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

@inject('store')
@observer
class App extends Component {
  constructor(props) {
    super(props);

    JdxDatabase.loadDefinitions();

    autorun(() => {
      if (this.props.store.projectStore.currentProject) {
        remote.getCurrentWindow().setTitle('Jorodox - ' + this.props.store.projectStore.currentProject.name);
      } else {
        remote.getCurrentWindow().setTitle('Jorodox');
      }
    });

    reaction(
      () => this.props.store.projectStore.currentProject ? this.props.store.projectStore.currentProject.watchDirectory : null,
      () => {
        this.startWatcher();
      }
    );
  }

  componentDidMount() {
    this.keyPressListener = this.keyPressListener.bind(this);
    document.addEventListener('keydown', this.keyPressListener, false);

    this.inPageSearch = searchInPage(getCurrentWebContents(), {
      customSearchWindowHtmlPath: getGlobal('searchWindowDir') + '/search-window.html',
      customCssPath: getGlobal('searchWindowDir') + '/default-style.css',
    });

    //this.startWatcher();
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keyPressListener, false);
  }

  startWatcher() {
    if (this.watcher) {
      this.watcher.task.close();
    }

    const project = this.props.store.projectStore.currentProject;

    if (!project || !project.watchDirectory) {
      return;
    }

    if (project.rootPath === '/' || !project.rootPath || !jetpack.exists(project.rootPath)) {
      return;
    }

    this.watcher = WatchDirectoryTask.start(
      {rootDir: project.rootPath},
      (progress, total, message) => console.log(`[${progress}/${total}] ${message}`),
      (data) => {
        const names = _(data).filter(x => x.eventType !== 'dirChange').map('filename').uniq().value();

        return JdxDatabase.loadByPaths(project, names, null, 'Change detected...').then((result) => {
          project.databaseVersion += 1;
          return result;
        }).then((updateByType) => {
          _.forOwn(updateByType, (update, typeId) => {
            try {
              const typeDefinition = JdxDatabase.getTypeDefinition(project, typeId);
              SchemaValidatorTask.start(
                {
                  project,
                  typeDefinition: typeDefinition,
                  taskTitle: 'Validating `' + typeId + '`',
                  useCachedValidator: true,
                  typeIds: typeDefinition.primaryKey === 'path' ? update.paths : null,
                },
                (progress, total, message) => null,
                (result) => {},
                (error) => { console.error('Type ' + typeId, error); },
              );
            } catch (exception) {
              console.error('Type ' + typeId, exception);
            }
          });
        });
      }
    );
  }

  keyPressListener(event) {
    if (event.ctrlKey && event.keyCode === 70) {
      this.inPageSearch.openSearchWindow();
    }
  }

  handleTab = (event, newTab) => {
    switch (newTab) {
      default:
      case 'fileview':
        this.props.store.goto('/fileview/' + (this.props.store.projectStore.currentProject ? this.props.store.projectStore.currentProject.rootPath : ''));
        break;
      case 'structure': {
        const currentProject = this.props.store.projectStore.currentProject;
        if (currentProject.structureCurrentNodeKind === 'root') {
          this.props.store.goto('/structure');
        } else if (currentProject.structureCurrentNodeKind === 'category') {
          this.props.store.goto(`/structure/c/${currentProject.structureCurrentNodeKindId}`);
        } else if (currentProject.structureCurrentNodeKind === 'type') {
          this.props.store.goto(`/structure/t/${currentProject.structureCurrentNodeKindType}`);
        } else if (currentProject.structureCurrentNodeKind === 'item') {
          this.props.store.goto(`/structure/t/${currentProject.structureCurrentNodeKindType}/${currentProject.structureCurrentNodeKindId}`);
        } else {
          this.props.store.goto('/structure');
        }
        break;
      }
      case 'projects':
        this.props.store.goto('/projects');
        break;
    }
  };

  render() {
    const currentProject = this.props.store.projectStore.currentProject;
    const currentProjectGameType = currentProject ? currentProject.gameType : null;

    let currentTab = false;
    if (this.props.store.routingStore.location.pathname.startsWith('/fileview') && currentProject) {
      currentTab = 'fileview';
    }
    if (this.props.store.routingStore.location.pathname.startsWith('/structure') && currentProjectGameType) {
      currentTab = 'structure';
    }
    if (this.props.store.routingStore.location.pathname.startsWith('/projects')) {
      currentTab = 'projects';
    }

    return (
      <Provider store={this.props.store}>
        <Router history={this.props.history}>
          <MuiThemeProvider theme={theme}>
            <div style={{height: '100%', display: 'flex', flexDirection: 'column', background: 'white'}}>
              <AppBar position="static">
                <Toolbar>
                  <Typography variant="title" color="inherit" style={{paddingRight: 40, lineHeight: '90%'}}>Jorodox Tool<br />
                    <span style={{fontSize: '50%', color: '#ccc', float: 'right'}}>v2.0.0-beta-1</span>
                  </Typography>
                  <div style={{display: 'flex', flexGrow: 1}}>
                    <Tabs value={currentTab} onChange={this.handleTab}>
                      <Tab value="projects" label="Project" />
                      {currentProject && currentProject.rootPath && <Tab value="fileview" label="Files" />}
                      {currentProjectGameType && <Tab value="structure" label="Game data" />}
                    </Tabs>
                    <ProgressInfo style={{marginLeft: '40px'}} />
                    <Button color="primary" variant="raised" style={{marginRight: '10px'}} component={Link} to="/about">About</Button>
                  </div>
                </Toolbar>
              </AppBar>
              <SplitterLayout horizontal primaryIndex={1} secondaryInitialSize={300} customClassName="top-splitter">
                <Switch>
                  {currentProjectGameType && <Route path="/structure/:kind?/:type?/:id?" render={(props) => <StructureTree project={currentProject} expandToDepth={0} routeParams={props.match.params} />} />}
                  {currentProject && <Route path="/fileview/:path(.*)" render={(props) => <FileTree project={currentProject} {...props} />} />}
                  <Route path="/projects(.*)" render={() => <ProjectsTree store={this.props.store} />} />
                  <Route path="/" render={() => <ProjectsTree store={this.props.store} />} />
                </Switch>
                <SplitterLayout vertical primaryIndex={0} primaryMinSize={100} secondaryInitialSize={34} secondaryMinSize={34} customClassName="sub-splitter">
                  <Switch>
                    {currentProjectGameType && <Route path="/structure/e/events/:id" component={(props) => <EventEditor project={currentProject} {...props.match.params} />} />}
                    {currentProjectGameType && <Route path="/structure/c/:category" component={(props) => <StructureView project={currentProject} {...props} />} />}
                    {currentProjectGameType && <Route path="/structure/t/:type/:id(.*)" component={(props) => <StructureItemView project={currentProject} {...props} />} />}
                    {currentProjectGameType && <Route path="/structure/t/:type" component={(props) => <StructureTypeView project={currentProject} {...props} />} />}
                    {currentProjectGameType && <Route path="/structure" component={(props) => <StructureView project={currentProject} {...props} />} />}
                    {currentProject && <Route path="/fileview/:path(.*)" component={(props) => <FileView project={currentProject} {...props} />} />}
                    {currentProject && <Route path="/projects/:id" component={(props) => {
                      this.props.store.projectStore.setCurrentProjectById(props.match.params.id);
                      const project = this.props.store.projectStore.projects.find(x => x.id === props.match.params.id);

                      return <ProjectForm project={project} />
                    }} />}
                    <Route path="/settings" component={SettingsPage} />
                    {currentProject && <Route path="/" component={(props) => <ProjectForm project={currentProject} />} />}
                  </Switch>
                  <Switch>
                    {currentProjectGameType && <Route path="/structure/t/:type/:id(.*)" render={(props) => <ErrorPage project={currentProject} type={props.match.params.type} typeId={props.match.params.id} category={false} {...props} />} />}
                    {currentProjectGameType && <Route path="/structure/t/:type" render={(props) => <ErrorPage project={currentProject} type={props.match.params.type} typeId={false} category={false} {...props} />} />}
                    {currentProjectGameType && <Route path="/structure/c/:type" render={(props) => <ErrorPage project={currentProject} category={props.match.params.type} typeId={false} type={false} {...props} />} />}
                    {currentProject && <Route path="/" render={(props) => <ErrorPage project={currentProject} type={false} typeId={false} category={false} {...props} />} />}
                  </Switch>
                </SplitterLayout>
              </SplitterLayout>
              <Route path="/about" component={AboutPage} />
            </div>
          </MuiThemeProvider>
        </Router>
      </Provider>
    );
  }
}

export default App;
