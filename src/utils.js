import path from 'path';
import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import axios from 'axios';

const tagsAttributes = {
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
  const assets = Object.entries(tagsAttributes)
    .flatMap(([tagName, attribute]) => {
      const assetData = $(tagName)
        .toArray()
        .map((element) => {
          const $element = $(element);
          const src = $element.attr(attribute);
          const pageUrl = new URL(src, origin);
          const name = slugifyFileName(pageUrl);

          return {
            $element, pageUrl, attribute, name,
          };
        });

      return assetData;
    })
    .filter(({ pageUrl }) => pageUrl.origin === origin)
    .map(({
      $element, pageUrl, attribute, name,
    }) => {
      $element.attr(attribute, path.join(dirName, name));

      return { pageUrl, name };
    });

  const html = $.root().html();

  return { html, assets };
};

const writeFile = (filePath, content) => fs.writeFile(filePath, content, { encoding: 'utf-8' });

const downloadAsset = (pageUrl, assetPath) => axios
  .get(pageUrl, { responseType: 'arraybuffer' })
  .then((response) => writeFile(assetPath, response.data));

export {
  slugifyDirName,
  slugifyFileName,
  extractAssets,
  writeFile,
  downloadAsset,
};
