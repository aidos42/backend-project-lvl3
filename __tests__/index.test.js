import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import _ from 'lodash';
import nock from 'nock';
import pageLoader from '../src/index.js';

nock.disableNetConnect();

const getFixturePath = (filename) => path.join(process.cwd(), '__fixtures__', filename);

const fixturesSiteCom = {
  base: 'https://site.com/',
  dir: 'site-com-blog-about_files',
  page: {
    url: 'https://site.com/blog/about',
    path: '/blog/about',
    before: 'site-com-blog-about.html',
    after: '/expected/site-com-blog-about.html',
  },
  img: {
    path: '/photos/me.jpg',
    name: 'site-com-photos-me.jpg',
    expected: '/expected/site-com-blog-about_files/site-com-photos-me.jpg',
  },
  css: {
    path: '/blog/about/assets/styles.css',
    name: 'site-com-blog-about-assets-styles.css',
    expected: '/expected/site-com-blog-about_files/site-com-blog-about-assets-styles.css',
  },
  link: {
    path: '/blog/about',
    name: 'site-com-blog-about.html',
    expected: '/expected/site-com-blog-about_files/site-com-blog-about.html',
  },
  script: {
    path: '/assets/scripts.js',
    name: 'site-com-assets-scripts.js',
    expected: '/expected/site-com-blog-about_files/site-com-assets-scripts.js',
  },
};

const fixturesLocalhost = {
  base: 'http://localhost/',
  dir: 'localhost-blog-about_files',
  page: {
    url: 'http://localhost/blog/about',
    path: '/blog/about',
    before: 'localhost-blog-about.html',
    after: '/expected/localhost-blog-about.html',
  },
  img: {
    path: '/photos/me.jpg',
    name: 'localhost-photos-me.jpg',
    expected: '/expected/localhost-blog-about_files/localhost-photos-me.jpg',
  },
  css: {
    path: '/blog/about/assets/styles.css',
    name: 'localhost-blog-about-assets-styles.css',
    expected: '/expected/localhost-blog-about_files/localhost-blog-about-assets-styles.css',
  },
  link: {
    path: '/blog/about',
    name: 'localhost-blog-about.html',
    expected: '/expected/localhost-blog-about_files/localhost-blog-about.html',
  },
  script: {
    path: '/assets/scripts.js',
    name: 'localhost-assets-scripts.js',
    expected: '/expected/localhost-blog-about_files/localhost-assets-scripts.js',
  },
};

describe('site.com fixtures cases', () => {
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
    page = await fs.readFile(getFixturePath(fixturesSiteCom.page.before), 'utf-8');
    expectedPage = await fs.readFile(getFixturePath(fixturesSiteCom.page.after), 'utf-8');
    expectedImg = await fs.readFile(getFixturePath(fixturesSiteCom.img.expected), 'utf-8');
    expectedCSS = await fs.readFile(getFixturePath(fixturesSiteCom.css.expected), 'utf-8');
    expectedLink = await fs.readFile(getFixturePath(fixturesSiteCom.link.expected), 'utf-8');
    expectedScript = await fs.readFile(getFixturePath(fixturesSiteCom.script.expected), 'utf-8');
  });

  describe('positive case', () => {
    test('should work correct', async () => {
      nock(fixturesSiteCom.base)
        .get(fixturesSiteCom.page.path)
        .reply(200, page)
        .get(fixturesSiteCom.img.path)
        .reply(200, expectedImg)
        .get(fixturesSiteCom.css.path)
        .reply(200, expectedCSS)
        .get(fixturesSiteCom.link.path)
        .reply(200, expectedLink)
        .get(fixturesSiteCom.script.path)
        .reply(200, expectedScript);

      await pageLoader(fixturesSiteCom.page.url, tempDirpath);

      const results = await fs.readdir(tempDirpath);
      const resultPage = await fs.readFile(path.join(tempDirpath, results[0]), 'utf-8');
      const resultDir = await fs.access(path.join(tempDirpath, fixturesSiteCom.dir));
      const resultImg = await fs.access(path
        .join(tempDirpath, fixturesSiteCom.dir, fixturesSiteCom.img.name));
      const resultCSS = await fs.access(path
        .join(tempDirpath, fixturesSiteCom.dir, fixturesSiteCom.css.name));
      const resultLink = await fs.access(path
        .join(tempDirpath, fixturesSiteCom.dir, fixturesSiteCom.link.name));
      const resultScript = await fs.access(path
        .join(tempDirpath, fixturesSiteCom.dir, fixturesSiteCom.script.name));

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
      nock(fixturesSiteCom.base)
        .get(fixturesSiteCom.page.path)
        .reply(200, page)
        .get(fixturesSiteCom.img.path)
        .reply(200, expectedImg)
        .get(fixturesSiteCom.css.path)
        .reply(200, expectedCSS)
        .get(fixturesSiteCom.link.path)
        .reply(200, expectedLink)
        .get(fixturesSiteCom.script.path)
        .reply(200, expectedScript);
    });

    test('should throw error if there is wrong folder', async () => {
      const wrongTempDirPath = path.join(tempDirpath, '/wrong-folder');

      await expect(async () => {
        await pageLoader(fixturesSiteCom.page.url, wrongTempDirPath);
      }).rejects.toThrow(/ENOENT/);
    });

    test('should throw error if there is no access to folder', async () => {
      await fs.chmod(tempDirpath, 0);

      await expect(async () => {
        await pageLoader(fixturesSiteCom.page.url, tempDirpath);
      }).rejects.toThrow(/EACCES/);
    });
  });

  describe('negative cases: network errors', () => {
    beforeEach(async () => {
      nock.cleanAll();
    });

    test('should throw error if timeout', async () => {
      nock(fixturesSiteCom.base)
        .get(fixturesSiteCom.page.path)
        .replyWithError({ code: 'ETIMEDOUT' });

      await expect(async () => {
        await pageLoader(fixturesSiteCom.page.url, tempDirpath);
      }).rejects.toThrow(/ETIMEDOUT/);
    });

    test('should throw error if returns 404', async () => {
      nock(fixturesSiteCom.base)
        .get(fixturesSiteCom.page.path)
        .reply(404);

      await expect(async () => {
        await pageLoader(fixturesSiteCom.page.url, tempDirpath);
      }).rejects.toThrow(/404/);
    });

    test('should throw error if returns 500', async () => {
      nock(fixturesSiteCom.base)
        .get(fixturesSiteCom.page.path)
        .reply(500);

      await expect(async () => {
        await pageLoader(fixturesSiteCom.page.url, tempDirpath);
      }).rejects.toThrow(/500/);
    });
  });
});

describe('localhost fixtures cases', () => {
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
    page = await fs.readFile(getFixturePath(fixturesLocalhost.page.before), 'utf-8');
    expectedPage = await fs.readFile(getFixturePath(fixturesLocalhost.page.after), 'utf-8');
    expectedImg = await fs.readFile(getFixturePath(fixturesLocalhost.img.expected), 'utf-8');
    expectedCSS = await fs.readFile(getFixturePath(fixturesLocalhost.css.expected), 'utf-8');
    expectedLink = await fs.readFile(getFixturePath(fixturesLocalhost.link.expected), 'utf-8');
    expectedScript = await fs.readFile(getFixturePath(fixturesLocalhost.script.expected), 'utf-8');
  });

  describe('positive case', () => {
    test('should work correct', async () => {
      nock(fixturesLocalhost.base)
        .get(fixturesLocalhost.page.path)
        .reply(200, page)
        .get(fixturesLocalhost.img.path)
        .reply(200, expectedImg)
        .get(fixturesLocalhost.css.path)
        .reply(200, expectedCSS)
        .get(fixturesLocalhost.link.path)
        .reply(200, expectedLink)
        .get(fixturesLocalhost.script.path)
        .reply(200, expectedScript);

      await pageLoader(fixturesLocalhost.page.url, tempDirpath);

      const results = await fs.readdir(tempDirpath);
      const resultPage = await fs.readFile(path.join(tempDirpath, results[0]), 'utf-8');
      const resultDir = await fs.access(path.join(tempDirpath, fixturesLocalhost.dir));
      const resultImg = await fs.access(path
        .join(tempDirpath, fixturesLocalhost.dir, fixturesLocalhost.img.name));
      const resultCSS = await fs.access(path
        .join(tempDirpath, fixturesLocalhost.dir, fixturesLocalhost.css.name));
      const resultLink = await fs.access(path
        .join(tempDirpath, fixturesLocalhost.dir, fixturesLocalhost.link.name));
      const resultScript = await fs.access(path
        .join(tempDirpath, fixturesLocalhost.dir, fixturesLocalhost.script.name));

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
      nock(fixturesLocalhost.base)
        .get(fixturesLocalhost.page.path)
        .reply(200, page)
        .get(fixturesLocalhost.img.path)
        .reply(200, expectedImg)
        .get(fixturesLocalhost.css.path)
        .reply(200, expectedCSS)
        .get(fixturesLocalhost.link.path)
        .reply(200, expectedLink)
        .get(fixturesLocalhost.script.path)
        .reply(200, expectedScript);
    });

    test('should throw error if there is wrong folder', async () => {
      const wrongTempDirPath = path.join(tempDirpath, '/wrong-folder');

      await expect(async () => {
        await pageLoader(fixturesLocalhost.page.url, wrongTempDirPath);
      }).rejects.toThrow(/ENOENT/);
    });

    test('should throw error if there is no access to folder', async () => {
      await fs.chmod(tempDirpath, 0);

      await expect(async () => {
        await pageLoader(fixturesLocalhost.page.url, tempDirpath);
      }).rejects.toThrow(/EACCES/);
    });
  });

  describe('negative cases: network errors', () => {
    beforeEach(async () => {
      nock.cleanAll();
    });

    test('should throw error if timeout', async () => {
      nock(fixturesLocalhost.base)
        .get(fixturesLocalhost.page.path)
        .replyWithError({ code: 'ETIMEDOUT' });

      await expect(async () => {
        await pageLoader(fixturesLocalhost.page.url, tempDirpath);
      }).rejects.toThrow(/ETIMEDOUT/);
    });

    test('should throw error if returns 404', async () => {
      nock(fixturesLocalhost.base)
        .get(fixturesLocalhost.page.path)
        .reply(404);

      await expect(async () => {
        await pageLoader(fixturesLocalhost.page.url, tempDirpath);
      }).rejects.toThrow(/404/);
    });

    test('should throw error if returns 500', async () => {
      nock(fixturesLocalhost.base)
        .get(fixturesLocalhost.page.path)
        .reply(500);

      await expect(async () => {
        await pageLoader(fixturesLocalhost.page.url, tempDirpath);
      }).rejects.toThrow(/500/);
    });
  });
});
