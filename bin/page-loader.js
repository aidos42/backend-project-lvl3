#!/usr/bin/env node
import program from 'commander';
import pageLoader from '../src/index.js';

program
  .version('0.0.1')
  .description('Page loader utility.')
  .option('-o, --output [dir]', 'output dir', '/home/user/current-dir')
  .arguments('<url>')
  .action((pagepath, options) => {
    pageLoader(pagepath, options.output).then((response) => console.log(response));
  })
  .parse(process.argv);
