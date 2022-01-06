import os from 'os';
import path, { dirname } from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import _ from 'lodash';
import nock from 'nock';
import pageLoader from '../src/index.js';

nock.disableNetConnect();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);

const networkErrorsList = [
  ['404', 404],
  ['500', 500],
];

const networkFixtures = {
  base: 'https://ru.hexlet.io/',
  dir: 'ru-hexlet-io-courses_files',
  page: {
    url: 'https://ru.hexlet.io/courses',
  },
  error: {
    path: '/error.html',
    url: 'https://ru.hexlet.io/error.html',
  },
};

const dataFixtures = {
  page: {
    path: '/courses',
    origin: getFixturePath('ru-hexlet-io-courses.html'),
    expected: getFixturePath('/expected/ru-hexlet-io-courses.html'),
  },
  img: {
    path: '/assets/professions/nodejs.png',
    name: 'ru-hexlet-io-assets-professions-nodejs.png',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/nodejs.png'),
  },
  css: {
    path: '/assets/application.css',
    name: 'ru-hexlet-io-assets-application.css',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/application.css'),
  },
  link: {
    path: '/courses',
    name: 'ru-hexlet-io-courses.html',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/ru-hexlet-io-courses.html'),
  },
  script: {
    path: '/packs/js/runtime.js',
    name: 'ru-hexlet-io-packs-js-runtime.js',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/runtime.js'),
  },
};

let tempDirpath;

beforeEach(async () => {
  await fs.rmdir(tempDirpath, { recursive: true, force: true }).catch(_.noop);
  tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  nock(networkFixtures.base)
    .get(dataFixtures.page.path)
    .replyWithFile(200, dataFixtures.page.origin, {
      'Content-Type': 'text/html',
    })
    .get(dataFixtures.img.path)
    .replyWithFile(200, dataFixtures.img.expected, {
      'Content-Type': 'image/png',
    })
    .get(dataFixtures.css.path)
    .replyWithFile(200, dataFixtures.css.expected, {
      'Content-Type': 'text/css',
    })
    .get(dataFixtures.link.path)
    .replyWithFile(200, dataFixtures.link.expected, {
      'Content-Type': 'text/html',
    })
    .get(dataFixtures.script.path)
    .replyWithFile(200, dataFixtures.script.expected, {
      'Content-Type': 'text/javascript',
    });
});

describe('positive cases', () => {
  test('page content should match expected', async () => {
    await pageLoader(networkFixtures.page.url, tempDirpath);

    const results = await fs.readdir(tempDirpath);
    const resultPage = await fs.readFile(path.join(tempDirpath, results[0]), 'utf-8');
    const expected = await fs.readFile(dataFixtures.page.expected, 'utf-8');

    expect(resultPage).toBe(expected);
  });

  test('should download assets', async () => {
    await pageLoader(networkFixtures.page.url, tempDirpath);

    const resultDir = await fs.access(path.join(tempDirpath, networkFixtures.dir));
    const resultImg = await fs.access(path.join(tempDirpath,
      networkFixtures.dir, dataFixtures.img.name));
    const resultCSS = await fs.access(path.join(tempDirpath,
      networkFixtures.dir, dataFixtures.css.name));
    const resultLink = await fs.access(path.join(tempDirpath,
      networkFixtures.dir, dataFixtures.link.name));
    const resultScript = await fs.access(path
      .join(tempDirpath, networkFixtures.dir, dataFixtures.script.name));

    expect(resultDir).toBeUndefined();
    expect(resultImg).toBeUndefined();
    expect(resultCSS).toBeUndefined();
    expect(resultLink).toBeUndefined();
    expect(resultScript).toBeUndefined();
  });
});

describe('negative cases: filesystem errors', () => {
  test('should throw error if there is wrong folder', async () => {
    const wrongTempDirPath = path.join(tempDirpath, '/wrong-folder');

    await expect(async () => {
      await pageLoader(networkFixtures.page.url, wrongTempDirPath);
    }).rejects.toThrow(/ENOENT/);
  });

  test('should throw error if there is no access to folder', async () => {
    const unaccessableDir = '/root';
    await expect(async () => {
      await pageLoader(networkFixtures.page.url, unaccessableDir);
    }).rejects.toThrow(/EACCES/);
  });
});

describe('negative cases: network errors', () => {
  test.each(networkErrorsList)('%s', async (errorText, errorCode) => {
    nock(networkFixtures.base).get(networkFixtures.error.path).reply(errorCode);
    const regexp = new RegExp(errorText);
    await expect(async () => {
      await pageLoader(networkFixtures.error.url, tempDirpath);
    }).rejects.toThrow(regexp);
  });

  test('timeout', async () => {
    nock(networkFixtures.base)
      .get(networkFixtures.error.path)
      .replyWithError({ code: 'ETIMEDOUT' });

    await expect(async () => {
      await pageLoader(networkFixtures.error.url, tempDirpath);
    }).rejects.toThrow(/ETIMEDOUT/);
  });
});
