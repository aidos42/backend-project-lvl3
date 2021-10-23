import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const buildName = (hostname, pathname) => {
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
  const imgDirpath = path.join(outputDirpath, 'img');

  const srcs = [];

  return axios.get(url)
    .then((response) => {
      const page = response.data;
      return page;
    })
    .then((page) => {
      const $ = cheerio.load(page);
      const imgs = $('img').toArray();
      imgs.forEach(({ attribs }) => srcs.push(path.join('aidos42.github.io/sample-page/', attribs.src)));
      return page;
    })
    .then((response) => {
      fs.writeFile(filepath, response);
      fs.mkdir(imgDirpath);
      const promises = srcs.map((src) => {
        const config = {
          method: 'get',
          url: src,
          responseType: 'stream',
        };
        return axios.request(config);
      });
      return Promise.all(promises);
    })
    .then(([...responses]) => {
      responses.forEach((response) => {
        const image = response.data;
        const { url1 } = response.config;
        console.log(`image = ${image} url = ${url1}`);
      });
    })
    .then(() => filepath)
    .catch((err) => console.log(err));
};
