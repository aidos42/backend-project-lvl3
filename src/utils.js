import path from 'path';
import * as cheerio from 'cheerio';

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
    return new URL(src, hostname);
  }

  return new URL(`https:${src}`);
};

const getImgs = (html, { url, dirName }) => {
  const { hostname, pathname } = new URL(url);
  const $ = cheerio.load(html);
  const imgData = $('img').toArray().map((img) => {
    const { src: oldSrc } = img.attribs;
    const fullpath = path.join(hostname, pathname);
    const { href } = buildFullSrc(oldSrc, `https:${fullpath}`);
    const newSrc = path.join(dirName, buildName.file(href));

    return { oldSrc, newSrc, href };
  });

  return imgData;
};

const replaceImgs = (html, imgs) => {
  const $ = cheerio.load(html);
  imgs.forEach(({ oldSrc, newSrc }) => {
    $(`img[src="${oldSrc}"]`).attr('src', newSrc);
  });

  return $.root().html();
};

export { buildName, getImgs, replaceImgs };
