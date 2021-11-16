import os from 'os';
import path, { dirname } from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import _ from 'lodash';
import pageLoader from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const readFixture = (filename) => fs.readFile(getFixturePath(filename), 'utf-8');

const dirpath = path.join(os.tmpdir(), 'page-loader-');
let tempDirpath;

beforeEach(async () => {
  await fs.rmdir(tempDirpath, { recursive: true, force: true }).catch(_.noop);
  tempDirpath = await fs.mkdtemp(dirpath);
});

describe('success', () => {
  test('expect to return the path to the downloaded file', async () => {
    const file = 'aidos42-github-io-sample-page-index.html';
    const filepath = path.join(tempDirpath, file);

    const expectedAnswer = filepath;
    const recieved = await pageLoader('https://aidos42.github.io/sample-page/index', tempDirpath);

    expect(recieved).toBe(expectedAnswer);
  });

  test('expect that the file is equal to expected', async () => {
    const file = 'aidos42-github-io-sample-page-index.html';
    const filepath = path.join(tempDirpath, file);

    const expectedAnswer = await readFixture('aidos42-github-io-sample-page-index.html');

    await pageLoader('https://aidos42.github.io/sample-page/index', tempDirpath);

    const recieved = await fs.readFile(filepath, 'utf-8');

    expect(recieved).toBe(expectedAnswer);
  });

  test('expect to find assets in files directory', async () => {
    const dir = 'aidos42-github-io-sample-page-index_files';
    const currentDirpath = path.join(tempDirpath, dir);

    await pageLoader('https://aidos42.github.io/sample-page/index', tempDirpath);

    const recieved = await (await fs.readdir(currentDirpath)).sort();

    const expectedAnswer = ['aidos42-github-io-sample-page-img-sample1.jpg',
      'aidos42-github-io-sample-page-img-sample2.jpg',
      'aidos42-github-io-sample-page-img-Sample3.jpg',
      'aidos42-github-io-sample-page-img-sample4.jpg',
      'aidos42-github-io-sample-page-img-samPLe5.jpg',
      'aidos42-github-io-sample-page-img-sample6.jpg',
      'aidos42-github-io-sample-page-img-samplE7.jpg',
      'aidos42-github-io-sample-page-img-Sample8.jpg',
      'aidos42-github-io-sample-page-img-SAMPLE9.jpg',
      'aidos42-github-io-sample-page-img-sample10.jpg',
      'aidos42-github-io-sample-page-img-sample11.jpg',
      'aidos42-github-io-sample-page-img-sample12.jpg',
      'aidos42-github-io-sample-page-img-sample13.jpg',
      'aidos42-github-io-sample-page-style.css',
      'aidos42-github-io-sample-page-js-utils.js'].sort();

    expect(recieved).toEqual(expectedAnswer);
  });
});

describe('errors', () => {
  test('dir doesn\'t exist', async () => {
    const falseDirpath = '/obviouslyNotExistingDir';

    await expect(pageLoader('https://aidos42.github.io/sample-page/index', falseDirpath)).rejects.toThrow('ENOENT');
  });

  test('no permission to access folder', async () => {
    await fs.chmod(tempDirpath, 0);

    await expect(pageLoader('https://aidos42.github.io/sample-page/index', tempDirpath)).rejects.toThrow('EACCES');
  });
});
