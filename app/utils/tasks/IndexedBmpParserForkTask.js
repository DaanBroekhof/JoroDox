import BackgroundTask from './BackgroundTask';
const {fork} = require('child_process');

export default class IndexedBmpParserForkTask extends BackgroundTask {
  static getTaskType() {
    return 'IndexedBmpParserForkTask';
  }

  async execute(args) {
    return new Promise((resolve, reject) => {
      const forkedIndexedBmp = fork(`${__dirname}/../ForkIndexedBmp`);
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
