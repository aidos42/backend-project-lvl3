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
  replaceAssets,
} from './utils.js';
import ReadableError from './ReadableError.js';

const log = debug('page-loader');

export default (url, outputDirpath = process.cwd()) => {
  log(`Page loader is started with url: ${url}, outputDirpath: ${outputDirpath}`);

  const pageName = slugifyFileName(url);
  const dirName = slugifyDirName(url);
  const pagepath = path.resolve(outputDirpath, pageName);
  const dirpath = path.resolve(outputDirpath, dirName);

  log(`path for page: ${pagepath}`);
  log(`path for assets dir ${dirpath}`);

  const config = {
    url, pagepath, dirName, dirpath,
  };

  return axios.get(config.url)
    .then((response) => {
      const assets = getAssets(response.data, config);
      const html = replaceAssets(response.data, assets);

      return { html, assets };
    })
    .then(({ html, assets }) => {
      const writeFile = fs.writeFile(config.pagepath, html, 'utf-8');
      const makeDir = fs.mkdir(config.dirpath);
      const downloadFiles = assets.map(({ href }) => {
        const axiosConfig = {
          method: 'get',
          url: href,
          responseType: 'arraybuffer',
        };

        return axios.request(axiosConfig);
      });

      return Promise.all([writeFile, makeDir, ...downloadFiles]);
    })
    .then(([, , ...responses]) => {
      const tasks = responses.map((response) => {
        const { data } = response;
        const href = response.config.url;
        const assetpath = path.resolve(config.dirpath, slugifyFileName(href));

        return {
          title: `write asset ${href}`,
          task: () => fs.writeFile(assetpath, data),
        };
      });

      return new Listr(tasks, { concurrent: true, exitOnError: false }).run();
    })
    .then(() => config.pagepath)
    .catch((error) => {
      throw new ReadableError(error);
    });
};
