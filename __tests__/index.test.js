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

const pageFixture = {
  path: '/courses',
  origin: getFixturePath('ru-hexlet-io-courses.html'),
  expected: getFixturePath('/expected/ru-hexlet-io-courses.html'),
  contentType: 'text/html',
};

const assetsFixtures = [
  {
    fixturePath: '/assets/professions/nodejs.png',
    name: 'ru-hexlet-io-assets-professions-nodejs.png',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/nodejs.png'),
    contentType: 'image/png',
  },
  {
    fixturePath: '/assets/application.css',
    name: 'ru-hexlet-io-assets-application.css',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/application.css'),
    contentType: 'text/css',
  },
  {
    fixturePath: '/courses',
    name: 'ru-hexlet-io-courses.html',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/ru-hexlet-io-courses.html'),
    contentType: 'text/html',
  },
  {
    fixturePath: '/packs/js/runtime.js',
    name: 'ru-hexlet-io-packs-js-runtime.js',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/runtime.js'),
    contentType: 'text/javascript',
  },
];

let tempDirpath;

beforeEach(async () => {
  await fs.rmdir(tempDirpath, { recursive: true, force: true }).catch(_.noop);
  tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  nock(networkFixtures.base)
    .get(pageFixture.path)
    .replyWithFile(200, pageFixture.origin, { 'Content-Type': pageFixture.contentType });

  assetsFixtures.forEach(({ fixturePath, expected, contentType }) => {
    nock(networkFixtures.base)
      .get(fixturePath)
      .replyWithFile(200, expected, { 'Content-Type': contentType });
  });
});

describe('positive cases', () => {
  test('page content should match expected', async () => {
    await pageLoader(networkFixtures.page.url, tempDirpath);

    const results = await fs.readdir(tempDirpath);
    const resultPage = await fs.readFile(path.join(tempDirpath, results[0]), 'utf-8');
    const expected = await fs.readFile(pageFixture.expected, 'utf-8');

    expect(resultPage).toBe(expected);
  });

  test.each(assetsFixtures)('should download asset $name', async ({ name, expected }) => {
    await pageLoader(networkFixtures.page.url, tempDirpath);

    const resultAssetPath = path.join(tempDirpath, networkFixtures.dir, name);
    const resultAsset = await fs.readFile(resultAssetPath, 'utf-8');
    const expectedAsset = await fs.readFile(expected, 'utf-8');

    expect(resultAsset).toBe(expectedAsset);
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
  test.each(networkErrorsList)('should throw if there network error: %s', async (errorText, errorCode) => {
    nock(networkFixtures.base).get(networkFixtures.error.path).reply(errorCode);
    const regexp = new RegExp(errorText);
    await expect(async () => {
      await pageLoader(networkFixtures.error.url, tempDirpath);
    }).rejects.toThrow(regexp);
  });

  test('should throw if there network error: timeout', async () => {
    nock(networkFixtures.base)
      .get(networkFixtures.error.path)
      .replyWithError({ code: 'ETIMEDOUT' });

    await expect(async () => {
      await pageLoader(networkFixtures.error.url, tempDirpath);
    }).rejects.toThrow(/ETIMEDOUT/);
  });
});
