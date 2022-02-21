import path from 'path';
import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import debug from 'debug';
import axios from 'axios';

const log = debug('page-loader');

const elements = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const slugifyUrl = (url) => {
  const { pathname, hostname } = url;
  const name = path.join(hostname, pathname);

  return name.replace(/[^\w]/g, '-');
};

const slugifyFileName = (url) => {
  const { pathname, origin } = url;
  const { ext, dir, name } = path.parse(pathname);
  const urlWithoutExt = new URL(path.join(dir, name), origin);
  const slugifiedUrl = slugifyUrl(urlWithoutExt);
  const fileExtension = ext || '.html';

  return `${slugifiedUrl}${fileExtension}`;
};

const slugifyDirName = (url) => {
  const slugifiedUrl = slugifyUrl(url);

  return `${slugifiedUrl}_files`;
};

const extractAssets = (data, url, dirName) => {
  const { origin } = url;
  const $ = cheerio.load(data);
  const assets = Object.keys(elements)
    .map((element) => {
      const assetData = $(element).toArray().map((item) => {
        const attribute = elements[item.tagName];
        const assetSrc = item.attribs[attribute];
        const assetUrl = new URL(assetSrc, origin);

        return {
          oldSrc: assetSrc, assetUrl, element, attribute,
        };
      });

      return assetData;
    })
    .flat()
    .filter(({ assetUrl }) => url.origin === assetUrl.origin)
    .map((item) => {
      const {
        oldSrc, element, attribute, assetUrl,
      } = item;

      const newSrc = path.join(dirName, slugifyFileName(assetUrl));
      const selector = `${element}[${attribute}=${oldSrc}]`;

      log(`replacing asset ${oldSrc} by ${newSrc}`);

      $(selector).attr(attribute, newSrc);

      return item;
    });

  const html = $.root().html();

  return { html, assets };
};

const writeFile = (filePath, content) => fs.writeFile(filePath, content, { encoding: 'utf-8' });

const getAsset = (assetUrl, assetPath) => axios.get(assetUrl, { responseType: 'arraybuffer' }).then((response) => writeFile(assetPath, response.data));

export {
  slugifyDirName,
  slugifyFileName,
  extractAssets,
  writeFile,
  getAsset,
};
