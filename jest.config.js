process.env.TZ = 'UTC';

module.exports = {
  preset: 'react-native',
  testEnvironment: '<rootDir>/jest-environment-react-native.js',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePathIgnorePatterns: ['e2e'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|webp)$':
      '<rootDir>/node_modules/react-native/jest/assetFileTransformer.js',
  },
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  coverageReporters: ['lcov', 'text'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
};
