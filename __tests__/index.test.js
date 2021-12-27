import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import _ from 'lodash';
import nock from 'nock';
import pageLoader from '../src/index.js';

nock.disableNetConnect();

const getFixturePath = (filename) => path.join(process.cwd(), '__fixtures__', filename);

const fixtures = {
  siteCom: {
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
  },
  localhost: {
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
  },
};

let tempDirpath;
let page;
let expectedPage;
let expectedImg;
let expectedCSS;
let expectedLink;
let expectedScript;

describe('site.com fixtures cases', () => {
  beforeEach(async () => {
    await fs.rmdir(tempDirpath, { recursive: true, force: true }).catch(_.noop);
    tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    page = await fs.readFile(getFixturePath(fixtures.siteCom.page.before), 'utf-8');
    expectedPage = await fs.readFile(getFixturePath(fixtures.siteCom.page.after), 'utf-8');
    expectedImg = await fs.readFile(getFixturePath(fixtures.siteCom.img.expected), 'utf-8');
    expectedCSS = await fs.readFile(getFixturePath(fixtures.siteCom.css.expected), 'utf-8');
    expectedLink = await fs.readFile(getFixturePath(fixtures.siteCom.link.expected), 'utf-8');
    expectedScript = await fs.readFile(getFixturePath(fixtures.siteCom.script.expected), 'utf-8');
  });

  describe('positive case', () => {
    test('should work correct', async () => {
      nock(fixtures.siteCom.base)
        .get(fixtures.siteCom.page.path)
        .reply(200, page)
        .get(fixtures.siteCom.img.path)
        .reply(200, expectedImg)
        .get(fixtures.siteCom.css.path)
        .reply(200, expectedCSS)
        .get(fixtures.siteCom.link.path)
        .reply(200, expectedLink)
        .get(fixtures.siteCom.script.path)
        .reply(200, expectedScript);

      await pageLoader(fixtures.siteCom.page.url, tempDirpath);

      const results = await fs.readdir(tempDirpath);
      const resultPage = await fs.readFile(path.join(tempDirpath, results[0]), 'utf-8');
      const resultDir = await fs.access(path.join(tempDirpath, fixtures.siteCom.dir));
      const resultImg = await fs.access(path
        .join(tempDirpath, fixtures.siteCom.dir, fixtures.siteCom.img.name));
      const resultCSS = await fs.access(path
        .join(tempDirpath, fixtures.siteCom.dir, fixtures.siteCom.css.name));
      const resultLink = await fs.access(path
        .join(tempDirpath, fixtures.siteCom.dir, fixtures.siteCom.link.name));
      const resultScript = await fs.access(path
        .join(tempDirpath, fixtures.siteCom.dir, fixtures.siteCom.script.name));

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
      nock(fixtures.siteCom.base)
        .get(fixtures.siteCom.page.path)
        .reply(200, page)
        .get(fixtures.siteCom.img.path)
        .reply(200, expectedImg)
        .get(fixtures.siteCom.css.path)
        .reply(200, expectedCSS)
        .get(fixtures.siteCom.link.path)
        .reply(200, expectedLink)
        .get(fixtures.siteCom.script.path)
        .reply(200, expectedScript);
    });

    test('should throw error if there is wrong folder', async () => {
      const wrongTempDirPath = path.join(tempDirpath, '/wrong-folder');

      await expect(async () => {
        await pageLoader(fixtures.siteCom.page.url, wrongTempDirPath);
      }).rejects.toThrow(/ENOENT/);
    });

    test('should throw error if there is no access to folder', async () => {
      await fs.chmod(tempDirpath, 0);

      await expect(async () => {
        await pageLoader(fixtures.siteCom.page.url, tempDirpath);
      }).rejects.toThrow(/EACCES/);
    });
  });

  describe('negative cases: network errors', () => {
    beforeEach(async () => {
      nock.cleanAll();
    });

    test('should throw error if timeout', async () => {
      nock(fixtures.siteCom.base)
        .get(fixtures.siteCom.page.path)
        .replyWithError({ code: 'ETIMEDOUT' });

      await expect(async () => {
        await pageLoader(fixtures.siteCom.page.url, tempDirpath);
      }).rejects.toThrow(/ETIMEDOUT/);
    });

    test('should throw error if returns 404', async () => {
      nock(fixtures.siteCom.base)
        .get(fixtures.siteCom.page.path)
        .reply(404);

      await expect(async () => {
        await pageLoader(fixtures.siteCom.page.url, tempDirpath);
      }).rejects.toThrow(/404/);
    });

    test('should throw error if returns 500', async () => {
      nock(fixtures.siteCom.base)
        .get(fixtures.siteCom.page.path)
        .reply(500);

      await expect(async () => {
        await pageLoader(fixtures.siteCom.page.url, tempDirpath);
      }).rejects.toThrow(/500/);
    });
  });
});

describe('localhost fixtures cases', () => {
  beforeEach(async () => {
    await fs.rmdir(tempDirpath, { recursive: true, force: true }).catch(_.noop);
    tempDirpath = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    page = await fs.readFile(getFixturePath(fixtures.localhost.page.before), 'utf-8');
    expectedPage = await fs.readFile(getFixturePath(fixtures.localhost.page.after), 'utf-8');
    expectedImg = await fs.readFile(getFixturePath(fixtures.localhost.img.expected), 'utf-8');
    expectedCSS = await fs.readFile(getFixturePath(fixtures.localhost.css.expected), 'utf-8');
    expectedLink = await fs.readFile(getFixturePath(fixtures.localhost.link.expected), 'utf-8');
    expectedScript = await fs.readFile(getFixturePath(fixtures.localhost.script.expected), 'utf-8');
  });

  describe('positive case', () => {
    test('should work correct', async () => {
      nock(fixtures.localhost.base)
        .get(fixtures.localhost.page.path)
        .reply(200, page)
        .get(fixtures.localhost.img.path)
        .reply(200, expectedImg)
        .get(fixtures.localhost.css.path)
        .reply(200, expectedCSS)
        .get(fixtures.localhost.link.path)
        .reply(200, expectedLink)
        .get(fixtures.localhost.script.path)
        .reply(200, expectedScript);

      await pageLoader(fixtures.localhost.page.url, tempDirpath);

      const results = await fs.readdir(tempDirpath);
      const resultPage = await fs.readFile(path.join(tempDirpath, results[0]), 'utf-8');
      const resultDir = await fs.access(path.join(tempDirpath, fixtures.localhost.dir));
      const resultImg = await fs.access(path
        .join(tempDirpath, fixtures.localhost.dir, fixtures.localhost.img.name));
      const resultCSS = await fs.access(path
        .join(tempDirpath, fixtures.localhost.dir, fixtures.localhost.css.name));
      const resultLink = await fs.access(path
        .join(tempDirpath, fixtures.localhost.dir, fixtures.localhost.link.name));
      const resultScript = await fs.access(path
        .join(tempDirpath, fixtures.localhost.dir, fixtures.localhost.script.name));

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
      nock(fixtures.localhost.base)
        .get(fixtures.localhost.page.path)
        .reply(200, page)
        .get(fixtures.localhost.img.path)
        .reply(200, expectedImg)
        .get(fixtures.localhost.css.path)
        .reply(200, expectedCSS)
        .get(fixtures.localhost.link.path)
        .reply(200, expectedLink)
        .get(fixtures.localhost.script.path)
        .reply(200, expectedScript);
    });

    test('should throw error if there is wrong folder', async () => {
      const wrongTempDirPath = path.join(tempDirpath, '/wrong-folder');

      await expect(async () => {
        await pageLoader(fixtures.localhost.page.url, wrongTempDirPath);
      }).rejects.toThrow(/ENOENT/);
    });

    test('should throw error if there is no access to folder', async () => {
      await fs.chmod(tempDirpath, 0);

      await expect(async () => {
        await pageLoader(fixtures.localhost.page.url, tempDirpath);
      }).rejects.toThrow(/EACCES/);
    });
  });

  describe('negative cases: network errors', () => {
    beforeEach(async () => {
      nock.cleanAll();
    });

    test('should throw error if timeout', async () => {
      nock(fixtures.localhost.base)
        .get(fixtures.localhost.page.path)
        .replyWithError({ code: 'ETIMEDOUT' });

      await expect(async () => {
        await pageLoader(fixtures.localhost.page.url, tempDirpath);
      }).rejects.toThrow(/ETIMEDOUT/);
    });

    test('should throw error if returns 404', async () => {
      nock(fixtures.localhost.base)
        .get(fixtures.localhost.page.path)
        .reply(404);

      await expect(async () => {
        await pageLoader(fixtures.localhost.page.url, tempDirpath);
      }).rejects.toThrow(/404/);
    });

    test('should throw error if returns 500', async () => {
      nock(fixtures.localhost.base)
        .get(fixtures.localhost.page.path)
        .reply(500);

      await expect(async () => {
        await pageLoader(fixtures.localhost.page.url, tempDirpath);
      }).rejects.toThrow(/500/);
    });
  });
});
