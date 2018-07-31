import JdxDatabase from '../JdxDatabase';
import DbBackgroundTask from './DbBackgroundTask';
import PdxScript from "../PdxScript";
import * as iconv from "iconv-lite";
import FileLoaderTask from "./FileLoaderTask";

const syspath = require('electron').remote.require('path');
const jetpack = require('electron').remote.require('fs-jetpack');
const fsutils = require('electron').remote.require('./utils/FsUtils');

const _ = require('lodash');
const minimatch = require('minimatch');

export default class VirtualFileLoaderTask extends DbBackgroundTask {
  static getTaskType() {
    return 'VirtualFileLoaderTask';
  }

  async execute(args) {
    const db = await JdxDatabase.get(args.project);


    // await db.files.clear();

    // await FileLoaderTask.start({taskTitle: args.taskTitle, project: args.project, searchPath: '_game_/.', searchPattern: '_game_/**', readerFileIgnore: [
    //   ".*",
    //   ".*/**",
    //   "**/.*",
    //   "_*",
    //   "_*/**"
    // ]});
    // await FileLoaderTask.start({taskTitle: args.taskTitle, project: args.project, searchPath: '_user_/.', searchPattern: '_user_/**', readerFileIgnore: [
    //   ".*",
    //   ".*/**",
    //   "**/.*",
    //   "**/.*/**",
    //   "_*",
    //   "_*/**"
    // ]});
    const definition = args.typeDefinition;


    const mods = _.sortBy(await db.mods.toArray(), 'name').filter(x => args.project.mods[x.name]);
    const dlcs = _.sortBy(await db.dlcs.toArray(), 'name').filter(x => args.project.dlcs[x.name] === false);


    const addons = [{
      name: 'Base game',
      path: '_game_',
      data: {
        path: '',
      },
    }];
    addons.push(...dlcs);
    addons.push(...mods);

    // Sort by dependencies, in a not too efficient or pretty way
    for (let i = 0; i < addons.length; i += 1) {
      if (addons[i].data.dependencies) {
        let found = 0;
        for (let j = 0; j < i; j += 1) {
          if (addons[i].data.dependencies.includes(addons[j].name)) {
            found += 1;
            if (found === addons[i].data.dependencies.length) {
              break;
            }
          }
        }

        if (found !== addons[i].data.dependencies.length) {
          if (!addons[i + 1]) {
            throw new Error(`Cannot match dependencies of '${addons[i].name}'`);
          }

          const post = addons[i + 1];
          addons[i + 1] = addons[i];
          addons[i] = post;
          i = 0;
        }
      }
    }

    const replacePaths = {};
    addons.forEach(addon => {
      if (addon.data.replace_path) {
        addon.data.replace_path.forEach(replacePath => {
          replacePaths[replacePath] = addon;
        });
      }
    });

    const fileMapping = {};
    const overloadedPaths = [];

    const data = [];

    for (const addon of addons.reverse()) {
      if (addon.data.path !== undefined) {
        const rootType = _.startsWith(addon.path, '_user_') ? '_user_/' : '_game_/';
        const prefix = rootType + (addon.data.path ? addon.data.path + '/' : '');
        const files = await db.files.where('path').startsWith(prefix).primaryKeys();

        files.forEach(file => {
          const actualPath = file.slice(prefix.length);

          if (overloadedPaths.some(overloadedPath => _.startsWith(actualPath, overloadedPath + '/'))) {
            return;
          }
          if (!fileMapping[actualPath]) {
            fileMapping[actualPath] = true;
            data.push({
              path: actualPath,
              source: file
            });
          }
        });
      } else if (addon.data.archive) {
        const rootType = _.startsWith(addon.path, '_user_') ? '_user_/' : '_game_/';
        const zipArchive = rootType + addon.data.archive;
        const archive = await ((rootType === '_user_/' ? db.mod_zips : db.dlc_zips).where('path').equals(zipArchive).first());
        if (!archive) {
          throw new Error(`Cannot find archive '${zipArchive}'`);
        }

        archive.data.entries.forEach(entry => {
          if (overloadedPaths.some(overloadedPath => _.startsWith(entry.path, overloadedPath + '/'))) {
            return;
          }

          if (!fileMapping[entry.path]) {
            fileMapping[entry.path] = true;
            data.push({
              path: entry.path,
              source: archive.path + '/_archive_/' + entry.path
            });
          }
        });
      }

      if (addon.data.replace_path) {
        overloadedPaths.push(...addon.data.replace_path);
      }
    }

    // Delete not found file data
    //await this.deleteMissing(scripts, db.pdx_scripts, definition.types, 'pdx_scripts', args.filterTypes, args.paths);

    await db.virtual_files.clear();

    await this.saveChunked(data, db.virtual_files, 0, 500);

    JdxDatabase.updateTypeIdentifiers(args.project, 'virtualized_files');
  }
}
