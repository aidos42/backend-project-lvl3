import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import _ from 'lodash';
import nock from 'nock';
import pageLoader from '../src/index.js';

nock.disableNetConnect();

const getFixturePath = (filename) => path.join(process.cwd(), '__fixtures__', filename);

const fixtures = {
  base: 'https://ru.hexlet.io/',
  dir: 'ru-hexlet-io-courses_files',
  page: {
    url: 'https://ru.hexlet.io/courses',
    path: '/courses',
    before: 'before.html',
    after: 'after.html',
  },
  img: {
    path: '/assets/professions/nodejs.png',
    name: 'ru-hexlet-io-assets-professions-nodejs.png',
    expected: 'nodejs.png',
  },
  css: {
    path: '/assets/application.css',
    name: 'ru-hexlet-io-assets-application.css',
    expected: 'application.css',
  },
  link: {
    path: '/courses',
    name: 'ru-hexlet-io-courses.html',
    expected: 'ru-hexlet-io-courses.html',
  },
  script: {
    path: '/packs/js/runtime.js',
    name: 'ru-hexlet-io-packs-js-runtime.js',
    expected: 'runtime.js',
  },
};

let tempDirpath;
let page;
let expectedPage;
let expectedImg;
let expectedCSS;
let expectedLink;
let expectedScript;

beforeEach(async () => {
  await fs.rmdir(tempDirpath, { recursive: true, force: true }).catch(_.noop);
  tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  page = await fs.readFile(getFixturePath(fixtures.page.before), 'utf-8');
  expectedPage = await fs.readFile(getFixturePath(fixtures.page.after), 'utf-8');
  expectedImg = await fs.readFile(getFixturePath(fixtures.img.expected), 'utf-8');
  expectedCSS = await fs.readFile(getFixturePath(fixtures.css.expected), 'utf-8');
  expectedLink = await fs.readFile(getFixturePath(fixtures.link.expected), 'utf-8');
  expectedScript = await fs.readFile(getFixturePath(fixtures.script.expected), 'utf-8');
});

describe('positive case', () => {
  test('should work correct', async () => {
    nock(fixtures.base)
      .get(fixtures.page.path)
      .reply(200, page)
      .get(fixtures.img.path)
      .reply(200, expectedImg)
      .get(fixtures.css.path)
      .reply(200, expectedCSS)
      .get(fixtures.link.path)
      .reply(200, expectedLink)
      .get(fixtures.script.path)
      .reply(200, expectedScript);

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
  beforeEach(async () => {
    nock.cleanAll();
    nock(fixtures.base)
      .get(fixtures.page.path)
      .reply(200, page)
      .get(fixtures.img.path)
      .reply(200, expectedImg)
      .get(fixtures.css.path)
      .reply(200, expectedCSS)
      .get(fixtures.link.path)
      .reply(200, expectedLink)
      .get(fixtures.script.path)
      .reply(200, expectedScript);
  });

  test('should throw error if there is wrong folder', async () => {
    const wrongTempDirPath = path.join(tempDirpath, '/wrong-folder');

    await expect(async () => {
      await pageLoader(fixtures.page.url, wrongTempDirPath);
    }).rejects.toThrow(/ENOENT/);
  });

  test('should throw error if there is no access to folder', async () => {
    await fs.chmod(tempDirpath, 0);

    await expect(async () => {
      await pageLoader(fixtures.page.url, tempDirpath);
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
