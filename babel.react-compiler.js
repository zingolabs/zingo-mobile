const path = require('node:path');

// The one React Compiler entry. Metro reads it through babel.config.js, the
// Storybook web build through .storybook-web/main.ts and the CI report
// through scripts/react_compiler_report.mts, so all three compile alike.
module.exports = [
  'babel-plugin-react-compiler',
  {
    target: '19',
    // The stock opt-out directives ('use no memo', 'use no forget') apply.
    // The compiler reads them on the body of the component or hook it
    // compiles. A 'worklet' directive on an inner arrow is out of its view,
    // and the worklets plugin, last in the chain, transforms that arrow.
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
