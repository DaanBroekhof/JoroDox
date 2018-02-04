/* eslint global-require: 1, flowtype-errors/show-errors: 0 */

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
const BrowserWindow = require('electron').BrowserWindow;
const MenuBuilder = require('./menu');

let mainWindow = null;
let backgroundWindow = null;

if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
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
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
        await installExtensions();
    }
    const path = require('path');

    backgroundWindow = new BrowserWindow({
        show: true,
        webPreferences: {
            nodeIntegrationInWorker: true
        },
    });

    mainWindow = new BrowserWindow({
        show: false,
        width: 2048,
        height: 1024,
        icon: path.join(__dirname, 'assets/icons/png/icon-128.png'),
        webPreferences: {
            nodeIntegrationInWorker: true
        },
    });

    mainWindow.loadURL(`file://${__dirname}/app.html`);
    backgroundWindow.loadURL(`file://${__dirname}/background.html`);

    // @TODO: Use 'ready-to-show' event
    //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
    mainWindow.webContents.on('did-finish-load', () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined');
        }
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('app-command', (e, cmd) => {
        // Navigate the window back when the user hits their mouse back button
        if (cmd === 'browser-backward' && mainWindow.webContents.canGoBack()) {
            mainWindow.webContents.goBack();
        }
    });


    ipc.on('background-request', function(event, data) {
        backgroundWindow.webContents.send('background-request', data);
    });
    ipc.on('background-response', function(event, data) {
        mainWindow.webContents.send('background-response', data);
    });


    const menuBuilder = new MenuBuilder(mainWindow);
    menuBuilder.buildMenu(false);

    const backgroundMenuBuilder = new MenuBuilder(backgroundWindow);
    backgroundMenuBuilder.buildMenu(true);


    let handleExternalUrls = (e, url) => {
        if (url !== mainWindow.webContents.getURL()) {
            e.preventDefault();
            require('electron').shell.openExternal(url);
        }
    };
    mainWindow.webContents.on('will-navigate', handleExternalUrls);
    mainWindow.webContents.on('new-window', handleExternalUrls);
});

