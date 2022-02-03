import path from 'path';
import fs from 'fs/promises';
import debug from 'debug';
import axios from 'axios';
import 'axios-debug-log';
import Listr from 'listr';
import {
  slugifyDirName,
  slugifyFileName,
  getAssets,
  createFile,
} from './utils.js';

const log = debug('page-loader');

export default (url, outputDirpath = process.cwd()) => {
  log(`Page loader is started with url: ${url}, outputDirpath: ${outputDirpath}`);

  const customUrl = new URL(url);
  const pageName = slugifyFileName(customUrl);
  const dirName = slugifyDirName(customUrl);
  const pagepath = path.resolve(outputDirpath, pageName);
  const dirpath = path.resolve(outputDirpath, dirName);

  log(`path for page: ${pagepath}`);
  log(`path for assets dir ${dirpath}`);

  return axios.get(customUrl.toString())
    .then((response) => getAssets(response.data, customUrl, dirName, dirpath))
    .then(({ html, assets }) => {
      const writeFile = fs.writeFile(pagepath, html, 'utf-8');
      const makeDir = fs.mkdir(dirpath);

      const promises = Promise.all([writeFile, makeDir]);

      return { assets, promises };
    })
    .then(({ assets }) => {
      const tasks = assets.map(({ href, assetpath }) => ({
        title: `download asset ${href}`,
        task: () => axios
          .get(href, { responseType: 'arraybuffer' })
          .then((response) => createFile(assetpath, response.data)),
      }));

      return new Listr(tasks, { concurrent: true }).run();
    })
    .then(() => pagepath);
};
