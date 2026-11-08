const path = require('node:path');

// The one React Compiler entry. Metro reads it through babel.config.js, the
// Storybook web build through .storybook-web/main.ts and the CI report
// through scripts/react_compiler_report.mts, so all three compile alike.
module.exports = [
  'babel-plugin-react-compiler',
  {
    target: '19',
    // Setting this replaces the default opt-out set, so the stock
    // directives stay listed alongside the worklet directives that
    // Reanimated uses; the worklets plugin must see un-memoized
    // functions.
    customOptOutDirectives: [
      'use no forget',
      'use no memo',
      'worklet',
      'worklets',
    ],
    sources(filename) {
      if (typeof filename !== 'string') return false;
      const rel = path.relative(__dirname, filename).split(path.sep).join('/');
      if (rel.startsWith('..')) return false;
      if (/(^|\/)__tests__(\/|$)/.test(rel)) return false;
      if (/(^|\/)__mocks__(\/|$)/.test(rel)) return false;
      if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)) return false;
      return ['app', 'screens', 'ui'].some(dir => rel.startsWith(`${dir}/`));
    },
  },
];
