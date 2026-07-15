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
      // Build outputs (gradle test reports carry generated .js)
      'android/**/build/**',
      'ios/build/**',
    ],
  },
  ...compat.extends('@react-native'),
];
