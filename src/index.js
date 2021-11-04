import path from 'path';
import fs from 'fs/promises';
import debug from 'debug';
import axios from 'axios';
import 'axios-debug-log';
import prettier from 'prettier';
import { buildName, getAssets, replaceAssets } from './utils.js';

const log = debug('page-loader');

export default (url, outputDirpath = process.cwd()) => {
  log('building paths');

  const pageName = buildName.file(url);
  const dirName = buildName.dir(url);
  const pagepath = `${path.resolve(path.join(outputDirpath, pageName))}.html`;
  const dirpath = path.resolve(path.join(outputDirpath, dirName));

  log(`path for page: ${pagepath}`);
  log(`path for assets dir ${dirpath}`);

  const config = {
    url, outputDirpath, pageName, pagepath, dirName, dirpath,
  };

  return axios.get(config.url)
    .then((response) => {
      log('downloading page and assets');

      const assets = getAssets(response.data, config);

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
          responseType: 'stream',
        };

        return axios.request(axiosConfig);
      });

      return Promise.all([writeFile, makeDir, ...downloadFiles]);
    })
    .then(([, , ...responses]) => {
      log('assets downloaded ok');

      responses.forEach((response) => {
        const asset = response.data;
        const href = response.config.url;
        const assetpath = path.resolve(config.dirpath, buildName.file(href));
        fs.writeFile(assetpath, asset);
        log(`asset ${href} downloaded succesful in ${assetpath}`);
      });

      log('job finished ok');
    })
    .then(() => config.pagepath);
};
