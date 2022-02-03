import path from 'path';
import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';

const log = debug('page-loader');

const slugifyUrl = (url) => {
  const { pathname, hostname } = url;
  const name = path.join(hostname, pathname);

  return name.replace(/[^\w]/g, '-');
};

const slugifyFileName = (url) => {
  const { pathname, origin } = url;
  const { ext, dir, name } = path.parse(pathname);
  const urlWithoutExt = new URL(path.join(dir, name), origin);
  const normalizedUrl = slugifyUrl(urlWithoutExt);
  const fileExtension = ext || '.html';

  return `${normalizedUrl}${fileExtension}`;
};

const slugifyDirName = (url) => {
  const normalizedUrl = slugifyUrl(url);

  return `${normalizedUrl}_files`;
};

const hasScheme = (url) => new RegExp('^([a-z]+://|//)', 'i').test(url);

const buildFullSrc = (src, hostname, protocol = 'https:') => {
  if (!hasScheme(src)) {
    const fullHostname = hasScheme(hostname) ? hostname : `${protocol}${hostname}`;

    return new URL(src, fullHostname);
  }

  return new URL(src);
};

const isSameOrigin = (url1, url2) => {
  const { hostname: hostname1 } = new URL(url1);
  const { hostname: hostname2 } = new URL(url2);

  return hostname1 === hostname2;
};

const getAssets = (data, url, dirName, dirpath) => {
  const { hostname, pathname, protocol } = url;
  const $ = cheerio.load(data);
  const elements = ['img', 'link', 'script'];
  const attributes = ['src', 'href'];
  const assets = elements
    .map((element) => {
      const assetData = $(element).toArray().map((item) => {
        const attribute = attributes.find((value) => _.has(item.attribs, value));
        const oldSrc = item.attribs[attribute];
        const origin = path.join(hostname, pathname);
        const { href } = buildFullSrc(oldSrc, origin, protocol);

        if (!isSameOrigin(url, href)) {
          return {};
        }

        const newSrc = path.join(dirName, slugifyFileName(new URL(href)));

        log(`downloading asset: ${href}`);

        const assetpath = path.resolve(dirpath, slugifyFileName(new URL(href)));

        return {
          oldSrc, newSrc, href, element, attribute, assetpath,
        };
      });

      return assetData;
    })
    .flat()
    .filter((asset) => Object.keys(asset).length !== 0);

  assets.forEach(({
    oldSrc, newSrc, element, attribute,
  }) => {
    const selector = `${element}[${attribute}=${oldSrc}]`;

    log(`replacing asset ${oldSrc} by ${newSrc}`);

    $(selector).attr(attribute, newSrc);
  });

  const html = $.root().html();

  return { html, assets };
};

const createFile = (filepath, content) => fs.writeFile(filepath, content, { encoding: 'utf-8' });

export {
  slugifyDirName,
  slugifyFileName,
  getAssets,
  createFile,
};
