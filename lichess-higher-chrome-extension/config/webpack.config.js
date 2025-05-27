'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) =>
  merge(common, {
    entry: {
      contentScript: PATHS.src + '/contentScript.js',
      pageScript: PATHS.src + '/pageScript.js',
      initWeb3: PATHS.src + '/initWeb3.js'
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
  });

module.exports = config;
