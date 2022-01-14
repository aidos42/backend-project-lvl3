import os from 'os';
import path, { dirname } from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import nock from 'nock';
import pageLoader from '../src/index.js';

nock.disableNetConnect();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const readFile = (filepath) => fs.readFile(filepath, 'utf-8');

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
};

const assetsFixtures = [
  {
    fixturePath: '/assets/professions/nodejs.png',
    name: 'ru-hexlet-io-assets-professions-nodejs.png',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/nodejs.png'),
  },
  {
    fixturePath: '/assets/application.css',
    name: 'ru-hexlet-io-assets-application.css',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/application.css'),
  },
  {
    fixturePath: '/courses',
    name: 'ru-hexlet-io-courses.html',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/ru-hexlet-io-courses.html'),
  },
  {
    fixturePath: '/packs/js/runtime.js',
    name: 'ru-hexlet-io-packs-js-runtime.js',
    expected: getFixturePath('/expected/ru-hexlet-io-courses_files/runtime.js'),
  },
];

let tempDirpath;

beforeAll(async () => {
  nock(networkFixtures.base)
    .persist()
    .get(pageFixture.path)
    .replyWithFile(200, pageFixture.origin);

  assetsFixtures.forEach(({ fixturePath, expected }) => {
    nock(networkFixtures.base)
      .persist()
      .get(fixturePath)
      .replyWithFile(200, expected);
  });
});

describe('positive cases', () => {
  beforeEach(async () => {
    tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test('page content should match expected', async () => {
    await pageLoader(networkFixtures.page.url, tempDirpath);

    const result = await readFile(path.join(tempDirpath, 'ru-hexlet-io-courses.html'));
    const expected = await readFile(pageFixture.expected);

    expect(result).toBe(expected);
  });

  test.each(assetsFixtures)('should download asset $name', async ({ name, expected }) => {
    await pageLoader(networkFixtures.page.url, tempDirpath);

    const resultAssetPath = path.join(tempDirpath, networkFixtures.dir, name);
    const resultAsset = await readFile(resultAssetPath);
    const expectedAsset = await readFile(expected);

    expect(resultAsset).toBe(expectedAsset);
  });
});

describe('negative cases', () => {
  describe('filesystem errors', () => {
    test('should throw error if there is wrong folder', async () => {
      await expect(pageLoader(networkFixtures.page.url, path.join(tempDirpath, '/wrong-folder'))).rejects.toThrow('ENOENT');
    });

    test('should throw error if there is no access to folder', async () => {
      const unaccessableDir = '/var/lib';
      await expect(pageLoader(networkFixtures.page.url, unaccessableDir)).rejects.toThrow('EACCES');
    });
  });

  describe('network errors', () => {
    test.each(networkErrorsList)('should throw if there network error: %s', async (errorText, errorCode) => {
      const seed = new Date().getMilliseconds();
      nock(networkFixtures.base).get(`${networkFixtures.error.path}/${seed}`).reply(errorCode);
      await expect(pageLoader(`${networkFixtures.error.url}/${seed}`, tempDirpath)).rejects.toThrow(errorText);
    });

    test('should throw if there network error: timeout', async () => {
      nock(networkFixtures.base)
        .get(networkFixtures.error.path)
        .replyWithError({ code: 'ETIMEDOUT' });

      await expect(pageLoader(networkFixtures.error.url, tempDirpath)).rejects.toThrow('ETIMEDOUT');
    });
  });
});
