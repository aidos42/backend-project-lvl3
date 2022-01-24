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

const networkFixture = {
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

const assetsFixtures = [
  {
    assetPath: '/assets/professions/nodejs.png',
    filePath: 'ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png',
  },
  {
    assetPath: '/assets/application.css',
    filePath: 'ru-hexlet-io-courses_files/ru-hexlet-io-assets-application.css',
  },
  {
    assetPath: '/courses',
    filePath: 'ru-hexlet-io-courses_files/ru-hexlet-io-courses.html',
  },
  {
    assetPath: '/packs/js/runtime.js',
    filePath: 'ru-hexlet-io-courses_files/ru-hexlet-io-packs-js-runtime.js',
  },
];

const scope = nock(networkFixture.base).persist();

beforeAll(async () => {
  assetsFixtures.forEach(({ assetPath, filePath }) => {
    scope
      .get(assetPath)
      .replyWithFile(200, getFixturePath(filePath));
  });
});

describe('positive cases', () => {
  let tempDirpath;

  beforeEach(async () => {
    tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test('page content should match expected', async () => {
    await pageLoader(networkFixture.page.url, tempDirpath);

    const actualPage = await readFile(path.join(tempDirpath, 'ru-hexlet-io-courses.html'));
    const expectedPage = await readFile(getFixturePath('ru-hexlet-io-courses.html'));

    expect(actualPage).toBe(expectedPage);
  });

  test.each(assetsFixtures)('should download asset $name', async ({ filePath }) => {
    await pageLoader(networkFixture.page.url, tempDirpath);

    const actualContent = await readFile(path.join(tempDirpath, filePath));
    const expectedContent = await readFile(getFixturePath(filePath));

    expect(actualContent).toBe(expectedContent);
  });
});

describe('negative cases', () => {
  describe('filesystem errors', () => {
    test('should throw error if there is wrong folder', async () => {
      await expect(pageLoader(networkFixture.page.url, '/wrong-folder'))
        .rejects.toThrow('ENOENT');
    });

    test('should throw error if there is no access to folder', async () => {
      await expect(pageLoader(networkFixture.page.url, '/var/lib'))
        .rejects.toThrow('EACCES');
    });
  });

  describe('network errors', () => {
    test.each([404, 500])('should throw if there network error: %s', async (errorCode) => {
      scope
        .get(`${networkFixture.error.path}/${errorCode}`)
        .reply(errorCode);

      await expect(pageLoader(`${networkFixture.error.url}/${errorCode}`))
        .rejects.toThrow(`Request failed with status code ${errorCode}`);
    });

    test('should throw if there network error: timeout', async () => {
      scope
        .get(networkFixture.error.path)
        .replyWithError({ code: 'ETIMEDOUT' });

      await expect(pageLoader(networkFixture.error.url))
        .rejects.toThrow('ETIMEDOUT');
    });
  });
});
