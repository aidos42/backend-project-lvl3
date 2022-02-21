import path from 'path';
import fs from 'fs/promises';
import debug from 'debug';
import axios from 'axios';
import 'axios-debug-log';
import Listr from 'listr';
import {
  slugifyDirName,
  slugifyFileName,
  extractAssets,
  writeFile,
  getAsset,
} from './utils.js';

const log = debug('page-loader');

export default (url, outputDirPath = process.cwd()) => {
  log(`Page loader is started with url: ${url}, outputDirpath: ${outputDirPath}`);

  const pageUrl = new URL(url);
  const pageName = slugifyFileName(pageUrl);
  const dirName = slugifyDirName(pageUrl);
  const pagePath = path.join(outputDirPath, pageName);
  const dirPath = path.join(outputDirPath, dirName);

  return axios.get(url)
    .then((response) => {
      log(`path for assets dir ${dirPath}`);

      return fs.access(dirPath)
        .catch(() => fs.mkdir(dirPath))
        .then(() => response);
    })
    .then((response) => extractAssets(response.data, pageUrl, dirName))
    .then(({ html, assets }) => {
      log(`path for page: ${pagePath}`);

      return writeFile(pagePath, html).then(() => assets);
    })
    .then((assets) => {
      const tasks = assets.map(({ assetUrl }) => {
        const assetPath = path.resolve(dirPath, slugifyFileName(assetUrl));

        return {
          title: `download asset ${assetUrl.toString()}`,
          task: () => getAsset(assetUrl.toString(), assetPath),
        };
      });

      return new Listr(tasks, { concurrent: true }).run();
    })
    .then(() => pagePath);
};
