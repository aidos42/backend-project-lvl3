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

test('expect to return the path to the downloaded file', async () => {
  const file = 'ru-hexlet-io-courses.html';
  const filepath = path.join(tempDirpath, file);

  const expectedAnswer = filepath;
  const recieved = await pageLoader('https://ru.hexlet.io/courses', tempDirpath);

  expect(recieved).toBe(expectedAnswer);
});

test('expect that the beginning of the file is as expected', async () => {
  const file = 'ru-hexlet-io-courses.html';
  const filepath = path.join(tempDirpath, file);

  const expectedAnswer = await readFixture('ru-hexlet-io-courses.html');

  await pageLoader('https://ru.hexlet.io/courses', tempDirpath);

  const recieved = await fs.readFile(filepath, 'utf-8');

  expect(recieved.slice(0, 126)).toBe(expectedAnswer.slice(0, 126));
});
