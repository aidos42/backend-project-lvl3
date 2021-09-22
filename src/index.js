import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

export default (pagepath, dirpath) => {
  const myUrl = new URL(pagepath);
  const { hostname, pathname } = myUrl;
  const regex = /[A-Za-z0-9]/;
  const name = path.join(hostname, pathname).split('').map((char) => {
    if (!char.match(regex)) {
      return '-';
    }

    return char;
  }).join('');

  const filepath = `${path.join(dirpath, name)}.html`;

  return axios.get(pagepath)
    .then((response) => {
      const page = response.data;
      return page;
    })
    .then((response) => {
      fs.writeFile(filepath, response);
    })
    .then(() => filepath)
    .catch((err) => console.log(err));
};
