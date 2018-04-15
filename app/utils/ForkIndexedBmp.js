const indexedBmp = require('./IndexedBmp');

process.on('message', (args) => {
  process.send(indexedBmp.parse(args.path));
});
