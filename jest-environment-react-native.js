'use strict';

// Override react-native's preset testEnvironment so jest-environment-node
// resolves from the project root (30.x + jest-mock 30.x) instead of
// react-native/node_modules (29.7.0 which lacks clearMocksOnScope).
const { TestEnvironment: NodeEnv } = require('jest-environment-node');

module.exports = class ReactNativeEnv extends NodeEnv {
  customExportConditions = ['require', 'react-native'];
};
