import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import prettier from 'prettier';
import { buildName, getImgs, replaceImgs } from './utils.js';

/* const buildName = (hostname, pathname) => {
  const regex = /[A-Za-z0-9]/;

  return path.join(hostname, pathname).split('').map((char) => {
    if (!char.match(regex)) {
      return '-';
    }

    return char;
  }).join('');
};

export default (url, outputDirpath) => {
  const myUrl = new URL(url);
  const { hostname, pathname } = myUrl;

  const name = buildName(hostname, pathname);

  const filepath = `${path.join(outputDirpath, name)}.html`;
  const filesDirpath = `${path.join(outputDirpath, name)}_files`;

  const srcs = [];
  let html;

  return axios.get(url)
    .then((response) => {
      const page = response.data;
      return page;
    })
    .then((page) => {
      const $ = cheerio.load(page);
      html = $;
      const imgs = $('img').toArray();
      imgs.forEach(({ attribs }) => srcs.push(new URL(`https://${path.join('aidos42.github.io/sample-page/', attribs.src)}`)));
      return page;
    })
    .then((response) => {
      fs.writeFile(filepath, response);
      fs.mkdir(filesDirpath);
      const promises = srcs.map((src) => {
        const config = {
          method: 'GET',
          url: src.toString(),
          responseType: 'stream',
        };
        const promise = axios.request(config);
        return promise;
      });
      return Promise.all(promises);
    })
    .then(([...responses]) => {
      const imgnames = [];
      responses.forEach((response) => {
        const image = response.data;
        const { url: srcUrl } = response.config;
        const { hostname: srcHostname, pathname: srcPathname } = new URL(srcUrl);
        const imgname = `${buildName(srcHostname, srcPathname).slice(0, -4)}.jpg`;
        const imgpath = `${path.join(filesDirpath, imgname)}`;
        imgnames.push(imgname);
        fs.writeFile(imgpath, image);
      });
      return imgnames;
    })
    .then((response) => {
      response.forEach(() => {
        html('img').attr('src', `${filesDirpath}/aidos42-github-io-sample-page-img-sample13.jpg`);
      });
    })
    .then(() => filepath)
    .catch((err) => console.log(err));
}; */

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
      const imgs = getImgs(response.data, config);
      const html = replaceImgs(response.data, imgs);
      return { html, imgs };
    })
    .then(({ html, imgs }) => {
      const fixedHtml = prettier.format(html, { parser: 'html', tabWidth: 2 }).trim();
      const writeFile = fs.writeFile(config.pagepath, fixedHtml, 'utf-8');
      const makeDir = fs.mkdir(config.dirpath);
      const downloadFiles = imgs.map(({ href }) => {
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
        const img = response.data;
        const href = response.config.url;
        const imgpath = path.resolve(config.dirpath, buildName.file(href));
        fs.writeFile(imgpath, img);
      });
    })
    .then(() => config.pagepath);
};
