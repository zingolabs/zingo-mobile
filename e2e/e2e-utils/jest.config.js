/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 1000000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  globals: {
    sync_timeout: 1200000,
    __DEV__: true,
  },
  setupFilesAfterEnv: ['<rootDir>/e2e/e2e-utils/setup-jest.js'],
};
