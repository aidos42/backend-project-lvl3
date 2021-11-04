import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import prettier from 'prettier';
import { buildName, getAssets, replaceAssets } from './utils.js';

export default (url, outputDirpath) => {
  const pageName = buildName.file(url);
  const dirName = buildName.dir(url);
  const pagepath = `${path.resolve(path.join(outputDirpath, pageName))}.html`;
  const dirpath = path.resolve(path.join(outputDirpath, dirName));

  const config = {
    url, outputDirpath, pageName, pagepath, dirName, dirpath,
  };

  return axios.get(config.url)
    .then((response) => {
      const assets = getAssets(response.data, config);
      const html = replaceAssets(response.data, assets);
      return { html, assets };
    })
    .then(({ html, assets }) => {
      const fixedHtml = prettier.format(html, { parser: 'html', tabWidth: 2 }).trim();
      const writeFile = fs.writeFile(config.pagepath, fixedHtml, 'utf-8');
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
      responses.forEach((response) => {
        const asset = response.data;
        const href = response.config.url;
        const assetpath = path.resolve(config.dirpath, buildName.file(href));
        fs.writeFile(assetpath, asset);
      });
    })
    .then(() => config.pagepath);
};
