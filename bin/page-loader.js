#!/usr/bin/env node
import program from 'commander';
import pageLoader from '../src/index.js';

program
  .version('0.0.1')
  .description('Compares two configuration files and shows a difference.')
  .option('-o, --output [dir]', 'output dir', '/home/user/current-dir')
  .arguments('<url>')
  .action((pagepath, options) => {
    console.log(pageLoader(pagepath, options.output));
  })
  .parse(process.argv);
