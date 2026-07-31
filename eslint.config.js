const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

module.exports = [
  {
    ignores: [
      'e2e/**',
      'node_modules/**',
      'coverage/**',
      'rust/**',
      'scripts/release/**',
    ],
  },
  ...compat.extends('@react-native'),
  {
    files: ['**/*.mjs'],
    languageOptions: {
      parser: require('espree'),
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
];
