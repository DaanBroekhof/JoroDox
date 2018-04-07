const jetpack = require('fs-jetpack');
const syspath = require('path');

async function getFilesMetaData(root, filesList) {
  const localJetpack = jetpack.cwd(root);

  const regex = new RegExp(`\\${syspath.sep}`, 'g');

  const filesMetaData = [];
  const promises = [];
  for (const file of filesList) {
    const promise = localJetpack.inspectAsync(file, {times: true}).then(info => {
      filesMetaData.push({
        path: file.replace(regex, '/'),
        info: Object.assign({}, info),
      });
      return null;
    });
    promises.push(promise);
  }

  await Promise.all(promises);

  // We return a JSON string because that is faster to communicate for large data structures with objects in electron
  // (in comparison to a 'full' object dump it normally does)
  return JSON.stringify(filesMetaData);
}

exports.getFilesMetaData = getFilesMetaData;
