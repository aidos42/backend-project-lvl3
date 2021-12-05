import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import _ from 'lodash';
import nock from 'nock';
import pageLoader from '../src/index.js';

nock.disableNetConnect();

const getFixturePath = (filename) => path.join(process.cwd(), '__fixtures__', filename);

const fixtures = {
  base: 'https://aidos42.github.io/sample-page/',
  dir: 'aidos42-github-io-sample-page-index_files',
  page: {
    url: 'https://aidos42.github.io/sample-page/index',
    path: '/index',
    before: 'before.html',
    after: 'after.html',
  },
  img: {
    path: '/img/sample1.jpg',
    name: 'aidos42-github-io-sample-page-img-sample1.jpg',
    expected: 'sample1.jpg',
  },
  css: {
    path: '/style.css',
    name: 'aidos42-github-io-sample-page-style.css',
    expected: 'style.css',
  },
  script: {
    path: '/js/utils.js',
    name: 'aidos42-github-io-sample-page-js-utils.js',
    expected: 'utils.js',
  },
};

let tempDirpath;
let page;
let expectedPage;
let expectedImg;
let expectedCSS;
let expectedScript;

beforeEach(async () => {
  await fs.rmdir(tempDirpath, { recursive: true, force: true }).catch(_.noop);
  tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  page = await fs.readFile(getFixturePath(fixtures.page.before), 'utf-8');
  expectedPage = await fs.readFile(getFixturePath(fixtures.page.after), 'utf-8');
  expectedImg = await fs.readFile(getFixturePath(fixtures.img.expected), 'utf-8');
  expectedCSS = await fs.readFile(getFixturePath(fixtures.css.expected), 'utf-8');
  expectedScript = await fs.readFile(getFixturePath(fixtures.script.expected), 'utf-8');
});

describe('success', () => {
  test('everything is ok', async () => {
    nock(fixtures.base)
      .get(fixtures.page.path)
      .reply(200, page)
      .get(fixtures.img.path)
      .reply(200, expectedImg)
      .get(fixtures.css.path)
      .reply(200, expectedCSS)
      .get(fixtures.script.path)
      .reply(200, expectedScript);

    await pageLoader(fixtures.page.url, tempDirpath);

    const results = await fs.readdir(tempDirpath);
    const resultPage = await fs.readFile(path.join(tempDirpath, results[0]), 'utf-8');
    const resultDir = await fs.access(path.join(tempDirpath, fixtures.dir));
    const resultImg = await fs.access(path.join(tempDirpath, fixtures.dir, fixtures.img.name));
    const resultCSS = await fs.access(path.join(tempDirpath, fixtures.dir, fixtures.css.name));
    const resultScript = await fs.access(path
      .join(tempDirpath, fixtures.dir, fixtures.script.name));

    expect(resultPage).toBe(expectedPage);
    expect(resultDir).toBeUndefined();
    expect(resultImg).toBeUndefined();
    expect(resultCSS).toBeUndefined();
    expect(resultScript).toBeUndefined();
  });
});

describe('filesysten errors', () => {
  beforeEach(async () => {
    nock.cleanAll();
    nock(fixtures.base)
      .get(fixtures.page.path)
      .reply(200, page)
      .get(fixtures.img.path)
      .reply(200, expectedImg)
      .get(fixtures.css.path)
      .reply(200, expectedCSS)
      .get(fixtures.script.path)
      .reply(200, expectedScript);
  });

  test('wrong folder', async () => {
    const wrongTempDirPath = path.join(tempDirpath, '/wrong-folder');

    expect(async () => {
      await pageLoader(fixtures.page.url, wrongTempDirPath);
    }).toThrow();
  });

  test('no access to folder', async () => {
    await fs.chmod(tempDirpath, 0);

    expect(async () => {
      await pageLoader(fixtures.page.url, tempDirpath);
    }).toThrow();
  });
});

describe('network errors', () => {
  beforeEach(async () => {
    nock.cleanAll();
  });

  test('404', async () => {
    nock(fixtures.base)
      .get(fixtures.page.path)
      .reply(404);

    expect(async () => {
      await pageLoader(fixtures.page.url, tempDirpath);
    }).toThrow();
  });

  test('500', async () => {
    nock(fixtures.base)
      .get(fixtures.page.path)
      .reply(500);

    expect(async () => {
      await pageLoader(fixtures.page.url, tempDirpath);
    }).toThrow();
  });
});
