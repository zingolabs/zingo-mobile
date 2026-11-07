module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // A component a test declares inside its closure is not the compiler's
    // to hoist, so tests are left as written.
    [
      'babel-plugin-react-compiler',
      {
        target: '19',
        sources: filename => !/__tests__|__mocks__|\.test\./.test(filename),
      },
    ],
    'dynamic-import-node',
    // Inline ONLY STORYBOOK_ENABLED so the index.js entry toggle resolves
    // at build time. Scoped on purpose: unscoped would bake every build
    // env var into the bundle.
    [
      'transform-inline-environment-variables',
      { include: ['STORYBOOK_ENABLED'] },
    ],
    [
      'module-resolver',
      {
        alias: {
          '@app': './app',
          '@screens': './screens',
          '@ui': './ui',
        },
      },
    ],
    'react-native-worklets/plugin', // must be last
  ],
};
