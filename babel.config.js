module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // The SES shim runs as a Metro polyfill, before Babel helpers exist, and
  // must reach Hermes untouched. `[\\/]` so the pattern also matches the
  // backslash paths Metro hands Babel on Windows.
  ignore: [/[\\/]ses(-hermes)?\.cjs$/],
  plugins: [
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
