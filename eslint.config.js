const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

module.exports = [
  {
    ignores: ['e2e/**', 'node_modules/**', 'coverage/**', 'rust/**'],
  },
  ...compat.extends('@react-native'),
];
