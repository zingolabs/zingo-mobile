const path = require('node:path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'babel-plugin-react-compiler',
      {
        target: '19',
        // Setting this replaces the default opt-out set, so the stock
        // directives stay listed alongside the worklet directives that
        // Reanimated uses; the worklets plugin must see un-memoized
        // functions. scripts/react_compiler_report.mts reads the options
        // from here, so the CI report observes the same compilation.
        customOptOutDirectives: [
          'use no forget',
          'use no memo',
          'worklet',
          'worklets',
        ],
        sources(filename) {
          if (typeof filename !== 'string') return false;
          const rel = path
            .relative(__dirname, filename)
            .split(path.sep)
            .join('/');
          if (rel.startsWith('..')) return false;
          if (/(^|\/)__tests__(\/|$)/.test(rel)) return false;
          if (/(^|\/)__mocks__(\/|$)/.test(rel)) return false;
          if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)) return false;
          return ['app', 'screens', 'ui'].some(dir =>
            rel.startsWith(`${dir}/`),
          );
        },
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
