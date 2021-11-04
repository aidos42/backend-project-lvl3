import path from 'path';
import * as cheerio from 'cheerio';
import _ from 'lodash';

const buildFileName = (url) => {
  const { hostname, pathname } = new URL(url);
  const extension = path.extname(pathname);
  const crude = path.join(hostname, pathname.replace(extension, ''));
  const name = crude.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s/g, '-');
  return `${name}${extension}`;
};

const buildDirName = (url) => {
  const { hostname, pathname } = new URL(url);
  const crude = path.join(hostname, pathname);
  const name = crude.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s/g, '-');
  return `${name}_files`;
};

const buildName = {
  file: buildFileName,
  dir: buildDirName,
};

const hasScheme = (url) => new RegExp('^([a-z]+://|//)', 'i').test(url);

const buildFullSrc = (src, hostname) => {
  if (!hasScheme(src)) {
    const fullHostname = hasScheme(hostname) ? hostname : `https:${hostname}`;
    return new URL(src, fullHostname);
  }

  return new URL(src);
};

const getAssets = (html, { url, dirName }) => {
  const { hostname, pathname } = new URL(url);
  const $ = cheerio.load(html);
  const elements = ['img', 'link', 'script'];
  const attributes = ['src', 'href'];
  const assets = elements.map((element) => {
    const assetData = $(element).toArray().map((item) => {
      const attribute = attributes.find((value) => _.has(item.attribs, value));
      const oldSrc = item.attribs[attribute];
      const origin = path.join(hostname, pathname);
      const { href } = buildFullSrc(oldSrc, origin);
      const newSrc = path.join(dirName, buildName.file(href));

      return {
        oldSrc, newSrc, href, element, attribute,
      };
    });

    return assetData;
  });

  return assets.flat();
};

const replaceAssets = (html, assets) => {
  const $ = cheerio.load(html);
  assets.forEach(({
    oldSrc, newSrc, element, attribute,
  }) => {
    const selector = `${element}[${attribute}=${oldSrc}]`;
    $(selector).attr(attribute, newSrc);
  });

  return $.root().html();
};

export { buildName, getAssets, replaceAssets };
