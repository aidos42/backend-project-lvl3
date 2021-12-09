#!/usr/bin/env node
import program from 'commander';
import pageLoader from '../src/index.js';

program
  .version('0.0.1')
  .description('Page loader utility.')
  .option('-o, --output [dir]', 'output dir')
  .arguments('<url>')
  .action((pagepath, options) => {
    pageLoader(pagepath, options.output)
      .then((response) => console.log(response))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  })
  .parse(process.argv);
