import {observable, autorun, computed} from 'mobx';
import Project from '../models/Project';

export default class ProjectStore {
  rootStore;

  projectsDb;

  @observable projects = [];
  @observable isLoading = true;

  constructor(rootStore, projectsDb) {
    this.rootStore = rootStore;
    this.loadDb(projectsDb).then(() => {
      this.loadProjects();
    });
  }

  async loadDb(projectsDb) {
    this.projectsDb = await projectsDb;
  }

  /**
   * Fetches all todo's from the server
   */
  async loadProjects() {
    this.isLoading = true;
    const fetchedProjects = await this.projectsDb.toArray();

    fetchedProjects.forEach(data => this.updateProjectFromDb(data));

    if (fetchedProjects.length === 0) {
      const project = this.createProject();
      project.name = 'New Project';
      project.isCurrent = true;
    }

    //this.currentProject = this.projects.find(x => x.data.isCurrent);

    this.isLoading = false;
  }

  /**
   * Update a todo with information from the server. Guarantees a todo
   * only exists once. Might either construct a new todo, update an existing one,
   * or remove an todo if it has been deleted on the server.
   */
  updateProjectFromDb(data) {
    let project = this.projects.find(project => project.id === data.id);
    if (!project) {
      project = new Project(this, data.id);
      this.projects.push(project);
    }
    if (data.isDeleted) {
      this.removeProject(project);
    } else {
      project.updateFromJson(data);
    }
  }

  /**
   * Creates a fresh todo on the client and server
   */
  createProject() {
    const project = new Project(this);
    this.projects.push(project);
    return project;
  }

  /**
   * A todo was somehow deleted, clean it from the client memory
   */
  removeProject(project) {
    this.projects.splice(this.projects.indexOf(project), 1);
    project.dispose();
    if (project.isCurrent && this.projects.length > 0) {
      this.projects[0].isCurrent = true;
    }
  }

  @computed get currentProject() {
    return this.projects.find(x => x.isCurrent);
  }

  set currentProject(project) {
    this.projects.forEach(p => {
      p.isCurrent = (p === project);
    });
  }


  setCurrentProjectById(id) {
    this.projects.forEach(p => {
      p.isCurrent = (p.id === id);
    });
  }
}
