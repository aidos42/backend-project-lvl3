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

const fixtures = {
  base: 'https://ru.hexlet.io/',
  dir: 'ru-hexlet-io-courses_files',
  page: {
    url: 'https://ru.hexlet.io/courses',
    path: '/courses',
    before: 'ru-hexlet-io-courses.html',
    after: '/expected/ru-hexlet-io-courses.html',
  },
  img: {
    path: '/assets/professions/nodejs.png',
    name: 'ru-hexlet-io-assets-professions-nodejs.png',
    expected: '/expected/ru-hexlet-io-courses_files/nodejs.png',
  },
  css: {
    path: '/assets/application.css',
    name: 'ru-hexlet-io-assets-application.css',
    expected: '/expected/ru-hexlet-io-courses_files/application.css',
  },
  link: {
    path: '/courses',
    name: 'ru-hexlet-io-courses.html',
    expected: '/expected/ru-hexlet-io-courses_files/ru-hexlet-io-courses.html',
  },
  script: {
    path: '/packs/js/runtime.js',
    name: 'ru-hexlet-io-packs-js-runtime.js',
    expected: '/expected/ru-hexlet-io-courses_files/runtime.js',
  },
};

let tempDirpath;
let expectedPage;
const page = getFixturePath(fixtures.page.before);
const expectedImg = getFixturePath(fixtures.img.expected);
const expectedCSS = getFixturePath(fixtures.css.expected);
const expectedLink = getFixturePath(fixtures.link.expected);
const expectedScript = getFixturePath(fixtures.script.expected);

beforeEach(async () => {
  await fs.rmdir(tempDirpath, { recursive: true, force: true }).catch(_.noop);
  tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  expectedPage = await fs.readFile(getFixturePath(fixtures.page.after), 'utf-8');

  nock(fixtures.base)
    .get(fixtures.page.path)
    .replyWithFile(200, page, {
      'Content-Type': 'text/html',
    })
    .get(fixtures.img.path)
    .replyWithFile(200, expectedImg, {
      'Content-Type': 'image/png',
    })
    .get(fixtures.css.path)
    .replyWithFile(200, expectedCSS, {
      'Content-Type': 'text/css',
    })
    .get(fixtures.link.path)
    .replyWithFile(200, expectedLink, {
      'Content-Type': 'text/html',
    })
    .get(fixtures.script.path)
    .replyWithFile(200, expectedScript, {
      'Content-Type': 'text/javascript',
    });
});

describe('positive case', () => {
  test('should work correct', async () => {
    await pageLoader(fixtures.page.url, tempDirpath);

    const results = await fs.readdir(tempDirpath);
    const resultPage = await fs.readFile(path.join(tempDirpath, results[0]), 'utf-8');
    const resultDir = await fs.access(path.join(tempDirpath, fixtures.dir));
    const resultImg = await fs.access(path.join(tempDirpath, fixtures.dir, fixtures.img.name));
    const resultCSS = await fs.access(path.join(tempDirpath, fixtures.dir, fixtures.css.name));
    const resultLink = await fs.access(path.join(tempDirpath, fixtures.dir, fixtures.link.name));
    const resultScript = await fs.access(path
      .join(tempDirpath, fixtures.dir, fixtures.script.name));

    expect(resultPage).toBe(expectedPage);
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
      await pageLoader(fixtures.page.url, wrongTempDirPath);
    }).rejects.toThrow(/ENOENT/);
  });

  test('should throw error if there is no access to folder', async () => {
    const unaccessableDir = '/root';
    await expect(async () => {
      await pageLoader(fixtures.page.url, unaccessableDir);
    }).rejects.toThrow(/EACCES/);
  });
});

describe('negative cases: network errors', () => {
  beforeEach(async () => {
    nock.cleanAll();
  });

  test('should throw error if timeout', async () => {
    nock(fixtures.base)
      .get(fixtures.page.path)
      .replyWithError({ code: 'ETIMEDOUT' });

    await expect(async () => {
      await pageLoader(fixtures.page.url, tempDirpath);
    }).rejects.toThrow(/ETIMEDOUT/);
  });

  test('should throw error if returns 404', async () => {
    nock(fixtures.base)
      .get(fixtures.page.path)
      .reply(404);

    await expect(async () => {
      await pageLoader(fixtures.page.url, tempDirpath);
    }).rejects.toThrow(/404/);
  });

  test('should throw error if returns 500', async () => {
    nock(fixtures.base)
      .get(fixtures.page.path)
      .reply(500);

    await expect(async () => {
      await pageLoader(fixtures.page.url, tempDirpath);
    }).rejects.toThrow(/500/);
  });
});
