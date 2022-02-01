import path from 'path';
import * as cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';

const log = debug('page-loader');

const slugifyUrl = (url) => {
  const { pathname, origin } = url;
  const { name, dir } = path.parse(pathname);
  const urlWithoutExt = new URL(path.join(dir, name), origin);
  const nameWithoutExt = path.join(urlWithoutExt.hostname, urlWithoutExt.pathname);

  return nameWithoutExt.replace(/[^\w]/g, ' ').replace(/\s/g, '-');
};

const slugifyFileName = (url) => {
  const customUrl = new URL(url);
  const normalizedUrl = slugifyUrl(customUrl);
  const { ext } = path.parse(customUrl.pathname);
  const fileExtension = ext || '.html';

  return `${normalizedUrl}${fileExtension}`;
};

const slugifyDirName = (url) => {
  const customUrl = new URL(url);
  const normalizedUrl = slugifyUrl(customUrl);

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

const getAssets = (html, { url, dirName }) => {
  const { hostname, pathname, protocol } = new URL(url);
  const $ = cheerio.load(html);
  const elements = ['img', 'link', 'script'];
  const attributes = ['src', 'href'];
  const assets = elements.map((element) => {
    const assetData = $(element).toArray().map((item) => {
      const attribute = attributes.find((value) => _.has(item.attribs, value));
      const oldSrc = item.attribs[attribute];
      const origin = path.join(hostname, pathname);
      const { href } = buildFullSrc(oldSrc, origin, protocol);

      if (!isSameOrigin(url, href)) {
        return {};
      }

      const newSrc = path.join(dirName, slugifyFileName(href));

      log(`downloading asset: ${href}`);

      return {
        oldSrc, newSrc, href, element, attribute,
      };
    });

    return assetData;
  });

  return assets.flat().filter((asset) => Object.keys(asset).length !== 0);
};

const replaceAssets = (html, assets) => {
  const $ = cheerio.load(html);
  assets.forEach(({
    oldSrc, newSrc, element, attribute,
  }) => {
    const selector = `${element}[${attribute}=${oldSrc}]`;

    log(`replacing asset ${oldSrc} by ${newSrc}`);

    $(selector).attr(attribute, newSrc);
  });

  return $.root().html();
};

export {
  slugifyDirName,
  slugifyFileName,
  getAssets,
  replaceAssets,
};
