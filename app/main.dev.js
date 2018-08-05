/* eslint global-require: 0, flowtype-errors/show-errors: 0 */

import WatchDirectoryTask from './utils/tasks/WatchDirectoryTask';
import IndexedBmpParserForkTask from './utils/tasks/IndexedBmpParserForkTask';

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */

const app = require('electron').app;
const ipc = require('electron').ipcMain;
const session = require('electron').session;

const BrowserWindow = require('electron').BrowserWindow;
const MenuBuilder = require('./menu');
const windowStateKeeper = require('electron-window-state');
const OperatingSystemTask = require('./utils/tasks/OperatingSystemTask');

let mainWindow = null;
let backgroundWindow = null;
let backgroundWindow2 = null;


// Register some globals for ease of use
global.searchWindowDir = `${__dirname}/search-window`;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const debugEnabled = (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true');

if (debugEnabled) {
  require('electron-debug')();
  const path = require('path');
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  require('module').globalPaths.push(p);
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = [
    'REACT_DEVELOPER_TOOLS',
    'REDUX_DEVTOOLS'
  ];

  return Promise
    .all(extensions.map(name => installer.default(installer[name], forceDownload)))
    .catch(console.log);
};


/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


app.on('ready', async () => {

  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

  // Fix for Electron 2.0 including a chrome build that is not referenced anymore
  // See: https://github.com/electron/electron/issues/13008#issuecomment-400261941
  session.defaultSession.webRequest.onBeforeRequest({}, (details, callback) => {
    if (details.url.indexOf('7accc8730b0f99b5e7c0702ea89d1fa7c17bfe33') !== -1) {
      callback({redirectURL: details.url.replace('7accc8730b0f99b5e7c0702ea89d1fa7c17bfe33', '57c9d07b416b5a2ea23d28247300e4af36329bdc')});
    } else {
      callback({cancel: false});
    }
  });

  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    await installExtensions();
  }
  const path = require('path');

  const mainWindowState = windowStateKeeper({
    defaultWidth: 1024,
    defaultHeight: 768,
    file: 'main-window-state.json',
  });
  const backgroundWindowState = windowStateKeeper({
    defaultWidth: 1024,
    defaultHeight: 768,
    file: 'background-window-state.json',
  });

  const backgroundWindow2State = windowStateKeeper({
    defaultWidth: 1024,
    defaultHeight: 768,
    file: 'background-window2-state.json',
  });


  console.log(app.getPath('userData'));

  backgroundWindow = new BrowserWindow({
    show: debugEnabled,
    x: backgroundWindowState.x,
    y: backgroundWindowState.y,
    width: backgroundWindowState.width,
    height: backgroundWindowState.height,
    webPreferences: {
      nodeIntegrationInWorker: true,
    },
  });

  backgroundWindow2 = new BrowserWindow({
    show: debugEnabled,
    x: backgroundWindow2State.x,
    y: backgroundWindow2State.y,
    width: backgroundWindow2State.width,
    height: backgroundWindow2State.height,
    webPreferences: {
      nodeIntegrationInWorker: true,
    },
  });

  mainWindow = new BrowserWindow({
    show: false,
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    icon: path.join(__dirname, 'assets/icons/png/icon-128.png'),
    webPreferences: {
      nodeIntegrationInWorker: true,
    },
  });

  mainWindowState.manage(mainWindow);
  backgroundWindowState.manage(backgroundWindow);
  backgroundWindow2State.manage(backgroundWindow2);


  mainWindow.loadURL(`file://${__dirname}/app.html`);
  backgroundWindow.loadURL(`file://${__dirname}/background.html`);
  backgroundWindow2.loadURL(`file://${__dirname}/background.html`);


  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (mainWindowState.isMaximized) {
      mainWindow.maximize();
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close', () => {
    mainWindowState.saveState(mainWindow);
    app.quit();
  });
  mainWindow.on('closed', () => {
    // mainWindow = null;
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  backgroundWindow.on('close', () => {
    backgroundWindowState.saveState(backgroundWindow);
  });
  backgroundWindow2.on('close', () => {
    backgroundWindow2State.saveState(backgroundWindow2);
  });
  backgroundWindow.on('closed', () => {
    // backgroundWindow = null;
  });

  mainWindow.on('app-command', (e, cmd) => {
    // Navigate the window back when the user hits their mouse back button
    if (cmd === 'browser-backward' && mainWindow.webContents.canGoBack()) {
      mainWindow.webContents.goBack();
    }
    if (cmd === 'browser-forward' && mainWindow.webContents.canGoForward()) {
      mainWindow.webContents.goForward();
    }
  });


  let requestSplitter = 0;
  ipc.on('background-request', (event, data) => {
    requestSplitter += 1;

    if (requestSplitter % 2 === 0) {
      backgroundWindow.webContents.send('background-request', data);
    } else {
      backgroundWindow2.webContents.send('background-request', data);
    }
  });
  ipc.on('background-response', (event, data) => {
    mainWindow.webContents.send('background-response', data);
  });


  const menuBuilder = new MenuBuilder(mainWindow, backgroundWindow);
  menuBuilder.buildMenu(false);

  const backgroundMenuBuilder = new MenuBuilder(backgroundWindow, backgroundWindow);
  backgroundMenuBuilder.buildMenu(true);

  const backgroundMenuBuilder2 = new MenuBuilder(backgroundWindow2, backgroundWindow2);
  backgroundMenuBuilder2.buildMenu(true);

  const handleExternalUrls = (e, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      e.preventDefault();
      require('electron').shell.openExternal(url);
    }
  };
  mainWindow.webContents.on('will-navigate', handleExternalUrls);
  mainWindow.webContents.on('new-window', handleExternalUrls);


  ipc.on('background-request', (event, request) => {
    switch (request.taskType) {
      case OperatingSystemTask.getTaskType():
        OperatingSystemTask.handle(request, event.sender);
        break;
      case WatchDirectoryTask.getTaskType():
        WatchDirectoryTask.handle(request, event.sender);
        break;
      case IndexedBmpParserForkTask.getTaskType():
        IndexedBmpParserForkTask.handle(request, event.sender);
        break;
      default:
    }
  });
});
