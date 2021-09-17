import pageLoader from '../src/index.js';

describe('pageLoader', () => {
  test('default option', () => {
    const expectedAnswer = 'arg = https://ru.hexlet.io/courses option = /var/tmp';
    expect(pageLoader('https://ru.hexlet.io/courses', '/var/tmp')).toBe(expectedAnswer);
  });
});
