import path from 'path';
import fs from 'fs/promises';
import debug from 'debug';
import axios from 'axios';
import 'axios-debug-log';
import prettier from 'prettier';
import Listr from 'listr';
import {
  buildDirName,
  buildFileName,
  getAssets,
  replaceAssets,
} from './utils.js';
import ReadableError from './ReadableError.js';

const log = debug('page-loader');

export default (url, outputDirpath = process.cwd()) => {
  log(`Page loader is started with url: ${url}, outputDirpath: ${outputDirpath}`);

  const pageName = buildFileName(url);
  const dirName = buildDirName(url);
  const pagepath = path.resolve(outputDirpath, pageName);
  const dirpath = path.resolve(outputDirpath, dirName);
  const { protocol } = new URL(url);

  log(`path for page: ${pagepath}`);
  log(`path for assets dir ${dirpath}`);

  const config = {
    url, outputDirpath, pageName, pagepath, dirName, dirpath, protocol,
  };

  return axios.get(config.url)
    .then((response) => {
      log('downloading page and assets');
      const rawAssets = getAssets(response.data, config);
      const assets = rawAssets.filter((asset) => Object.keys(asset).length !== 0);
      log('replacing assets in page');
      const html = replaceAssets(response.data, assets);

      return { html, assets };
    })
    .then(({ html, assets }) => {
      const fixedHtml = prettier.format(html, { parser: 'html', tabWidth: 2 }).trim();
      const writeFile = fs.writeFile(config.pagepath, fixedHtml, 'utf-8');

      log('page downloaded ok');
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
      log('assets downloaded ok');

      const tasks = responses.map((response) => {
        const { data } = response;
        const href = response.config.url;
        const assetpath = path.resolve(config.dirpath, buildFileName(href));

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
