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
    // TODO: Undo once this string-based approach gets removed
    files: ['app/uris/**', 'app/walletBackend/**'],
    ignores: ['app/uris/serverUris.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='translate']",
          message:
            'Core modules must not translate. Return an ErrorKey and let the display edge translate it (docs/adr/0002-error-keys-not-prose.md).',
        },
        {
          selector: "CallExpression[callee.property.name='translate']",
          message:
            'Core modules must not translate. Return an ErrorKey and let the display edge translate it (docs/adr/0002-error-keys-not-prose.md).',
        },
        {
          selector: "ImportSpecifier[imported.name='TranslateType']",
          message:
            'Core modules take no translate callback. Return an ErrorKey and let the display edge translate it (docs/adr/0002-error-keys-not-prose.md).',
        },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      parser: require('espree'),
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
];
