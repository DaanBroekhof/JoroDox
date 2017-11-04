const shell = require('electron').shell;

/**
 * This util wrapper exists, because calling these methods from the main process has different behaviour than
 * calling it in the renderer process via remote(). (mainly focus of new windows)
 */
class OperatingSystem {
    static showItemInFolder(path) {
        return shell.showItemInFolder(path);
    }
    static openItem(path) {
        return shell.openItem(path);
    }
}

module.exports = OperatingSystem;