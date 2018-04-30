import BackgroundTask from './BackgroundTask';
const {fork} = require('child_process');
const fs = require('fs');
const path = require('path');

export default class IndexedBmpParserForkTask extends BackgroundTask {
  static getTaskType() {
    return 'IndexedBmpParserForkTask';
  }

  async execute(args) {

    const fileName = 'ForkIndexedBmp.js';
    let cwd = path.join(__dirname, '..');

    // Hack to be compatible for `production` build
    if (fs.existsSync(path.join(__dirname, 'utils', fileName))) {
      cwd = path.join(__dirname, 'utils');
    }

    return new Promise((resolve, reject) => {
      const forkedIndexedBmp = fork(path.join(cwd, fileName), [], {cwd});
      forkedIndexedBmp.on('message', (m) => {
        resolve(m);
      });
      forkedIndexedBmp.on('error', (m) => {
        reject(m);
      });
      forkedIndexedBmp.send({path: args.path});
    });
  }
}
