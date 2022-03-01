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
        .map((item) => {
          const assetSrc = item.attribs[attribute];
          const assetUrl = new URL(assetSrc, origin);
          const assetName = slugifyFileName(assetUrl);
          const assetNode = $(item);

          return {
            assetNode, assetUrl, attribute, assetName,
          };
        });

      return assetData;
    })
    .filter(({ assetUrl }) => assetUrl.origin === origin)
    .map(({
      assetNode, assetUrl, attribute, assetName,
    }) => {
      assetNode.attr(attribute, path.join(dirName, assetName));

      return { assetUrl, assetName };
    });

  const html = $.root().html();

  return { html, assets };
};

const writeFile = (filePath, content) => fs.writeFile(filePath, content, { encoding: 'utf-8' });

const downloadAsset = (assetUrl, assetPath) => axios
  .get(assetUrl, { responseType: 'arraybuffer' })
  .then((response) => writeFile(assetPath, response.data));

export {
  slugifyDirName,
  slugifyFileName,
  extractAssets,
  writeFile,
  downloadAsset,
};
