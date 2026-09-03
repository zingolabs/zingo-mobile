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
    // Imports that leave the current folder go through the @app, @screens
    // and @ui aliases. assets/ and .storybook/ have no alias and stay
    // relative.
    files: ['app/**', 'screens/**', 'ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(\\.\\./)+(?!\\.\\./|assets/|\\.storybook/)',
              message:
                'Import through @app/, @screens/ or @ui/ instead of a parent-relative path.',
            },
          ],
        },
      ],
    },
  },
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
    // The visual-diff report runs in a browser, not in React Native.
    files: ['visual/report/**/*.js'],
    languageOptions: {
      globals: {
        IntersectionObserver: 'readonly',
        addEventListener: 'readonly',
        location: 'readonly',
        matchMedia: 'readonly',
      },
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
