// @flow
const app = require('electron').app;
const Menu = require('electron').Menu;
const shell = require('electron').shell;

class MenuBuilder {
  constructor(window, backgroundWindow) {
    this.window = window;
    this.backgroundWindow = backgroundWindow;
  }

  buildMenu(windowSpecific) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      this.setupDevelopmentEnvironment();
    }

    let template;

    if (process.platform === 'darwin') {
      template = this.buildDarwinTemplate();
    } else {
      template = this.buildDefaultTemplate();
    }

    const menu = Menu.buildFromTemplate(template);
    if (windowSpecific) {
      this.window.setMenu(menu);
    } else {
      Menu.setApplicationMenu(menu);
    }

    return menu;
  }

  setupDevelopmentEnvironment() {
    this.window.openDevTools();
    this.window.webContents.on('context-menu', (e, props) => {
      const {x, y} = props;

      Menu
        .buildFromTemplate([{
          label: 'Inspect element',
          click: () => {
            this.window.inspectElement(x, y);
          }
        }])
        .popup(this.window);
    });
  }

  buildDarwinTemplate() {
    const subMenuAbout = {
      label: 'Electron',
      submenu: [
        {label: 'About ElectronReact', selector: 'orderFrontStandardAboutPanel:'},
        {type: 'separator'},
        {label: 'Services', submenu: []},
        {type: 'separator'},
        {label: 'Hide ElectronReact', accelerator: 'Command+H', selector: 'hide:'},
        {label: 'Hide Others', accelerator: 'Command+Shift+H', selector: 'hideOtherApplications:'},
        {label: 'Show All', selector: 'unhideAllApplications:'},
        {type: 'separator'},
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    };
    const subMenuEdit = {
      label: 'Edit',
      submenu: [
        {label: 'Undo', accelerator: 'Command+Z', selector: 'undo:'},
        {label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:'},
        {type: 'separator'},
        {label: 'Cut', accelerator: 'Command+X', selector: 'cut:'},
        {label: 'Copy', accelerator: 'Command+C', selector: 'copy:'},
        {label: 'Paste', accelerator: 'Command+V', selector: 'paste:'},
        {label: 'Select All', accelerator: 'Command+A', selector: 'selectAll:'}
      ]
    };
    const subMenuViewDev = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.window.webContents.reload();
          }
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.window.setFullScreen(!this.window.isFullScreen());
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.window.toggleDevTools();
          }
        },
        {
          label: 'Toggle Background Window',
          click: () => {
            if (this.backgroundWindow.isVisible()) {
              this.backgroundWindow.hide();
            } else {
              this.backgroundWindow.show();
            }
          }
        }
      ]
    };
    const subMenuViewProd = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.window.setFullScreen(!this.window.isFullScreen());
          }
        }
      ]
    };
    const subMenuWindow = {
      label: 'Window',
      submenu: [
        {label: 'Minimize', accelerator: 'Command+M', selector: 'performMiniaturize:'},
        {label: 'Close', accelerator: 'Command+W', selector: 'performClose:'},
        {type: 'separator'},
        {label: 'Bring All to Front', selector: 'arrangeInFront:'}
      ]
    };
    const subMenuHelp = {
      label: 'Help',
      submenu: [{
        label: 'Source',
        click() {
          shell.openExternal('https://github.com/DaanBroekhof/JoroDox');
        }
      }]
    };

    const subMenuView = process.env.NODE_ENV === 'development'
      ? subMenuViewDev
      : subMenuViewProd;

    return [
      subMenuAbout,
      subMenuEdit,
      subMenuView,
      subMenuWindow,
      subMenuHelp
    ];
  }

  buildDefaultTemplate() {
    const templateDefault = [{
      label: '&File',
      submenu: [
        /* {
                    label: '&open',
                    accelerator: 'Ctrl+O',
                    click: () => {
                        let options = {properties: ['openDirectory']};
                        let parentWindow = (process.platform === 'darwin') ? null : BrowserWindow.getFocusedWindow();

                        dialog.showopenDialog(parentWindow, options, function (f) {
                            if (f) {
                                console.log("Directory contents: ", jetpack.inspect(f[0], {'times': true}), jetpack.list(f[0]))
                            }
                        });
                    }
                }, */
        {
          label: '&Close',
          accelerator: 'Ctrl+W',
          click: () => {
            this.window.close();
          }
        }
      ]
    }, {
      label: '&View',
      submenu: (process.env.NODE_ENV === 'development') ? [{
        label: '&Reload',
        accelerator: 'Ctrl+R',
        click: () => {
          this.window.webContents.reload();
        }
      }, {
        label: 'Toggle &Full Screen',
        accelerator: 'F11',
        click: () => {
          this.window.setFullScreen(!this.window.isFullScreen());
        }
      }, {
        label: 'Toggle &Developer Tools',
        accelerator: 'Alt+Ctrl+I',
        click: () => {
          this.window.toggleDevTools();
        }
      }, {
        label: 'Toggle Background Window',
        click: () => {
          if (this.backgroundWindow.isVisible()) {
            this.backgroundWindow.hide();
          } else {
            this.backgroundWindow.show();
          }
        }
      }] : [{
        label: 'Toggle &Full Screen',
        accelerator: 'F11',
        click: () => {
          this.window.setFullScreen(!this.window.isFullScreen());
        }
      }, {
        label: 'Toggle &Developer Tools',
        accelerator: 'Alt+Ctrl+I',
        click: () => {
          this.window.toggleDevTools();
        }
      }, {
        label: 'Toggle Background Window',
        click: () => {
          if (this.backgroundWindow.isVisible()) {
            this.backgroundWindow.hide();
          } else {
            this.backgroundWindow.show();
          }
        }
      }]
    }, {
      label: 'Help',
      submenu: [{
        label: 'Source',
        click() {
          shell.openExternal('https://github.com/DaanBroekhof/JoroDox');
        }
      }]
    }];

    return templateDefault;
  }
}

module.exports = MenuBuilder;
