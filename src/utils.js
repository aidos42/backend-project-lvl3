import path from 'path';
import * as cheerio from 'cheerio';
import _ from 'lodash';

const slugifyName = ({ hostname, pathname }) => {
  const name = path.join(hostname, pathname);
  return name.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s/g, '-');
};

const buildFileName = (url) => {
  const { pathname, origin } = new URL(url);
  const { name, dir, ext } = path.parse(pathname);
  const normalizedUrl = slugifyName(new URL(path.join(dir, name), origin));
  const normalizedExt = ext || '.html';

  return `${normalizedUrl}${normalizedExt}`;
};

const buildDirName = (url) => {
  const { pathname, origin } = new URL(url);
  const { name, dir } = path.parse(pathname);
  const normalizedName = slugifyName(new URL(path.join(dir, name), origin));

  return `${normalizedName}_files`;
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

const getAssets = (html, { url, dirName, protocol }) => {
  const { hostname, pathname } = new URL(url);
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

      const newSrc = path.join(dirName, buildFileName(href));

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

export {
  buildDirName,
  buildFileName,
  getAssets,
  replaceAssets,
};
