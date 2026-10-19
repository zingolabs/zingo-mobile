const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'zingolib/**',
      'scripts/release/**',
    ],
  },
  ...compat.extends('@react-native'),
  {
    // Imports that leave the current folder go through the @app, @screens
    // and @ui aliases. assets/ and .storybook/ have no alias and stay
    // relative. Icons are own components, never FontAwesome.
    files: ['app/**', 'screens/**', 'ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@fortawesome/*'],
              message:
                'Draw icons on ui/primitives/Icons/Icon, not with FontAwesome.',
            },
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
    // The color lock: a color is named by its token in app/theme, never by
    // value. Files that still hold loose colors are listed in
    // eslint.colorLock.js and leave the list as each screen migrates.
    files: ['app/**', 'screens/**', 'ui/**'],
    ignores: ['app/theme/**', '**/*.stories.tsx'],
    rules: {
      'react-native/no-color-literals': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message: 'Use a color token from app/theme, not a hex value.',
        },
        {
          selector: 'Literal[value=/^rgba?[(]/]',
          message: 'Use a color token from app/theme, not an rgb value.',
        },
        {
          selector:
            'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}([^0-9a-zA-Z]|$)|rgba?[(]/]',
          message: 'Use a color token from app/theme, not a color in a string.',
        },
      ],
    },
  },
  {
    files: require('./eslint.colorLock'),
    rules: {
      'react-native/no-color-literals': 'off',
      'no-restricted-syntax': 'off',
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
            'Core modules must not translate. Return an ErrorKey and let the display edge translate it (zingo-adrs zingo-mobile/0009).',
        },
        {
          selector: "CallExpression[callee.property.name='translate']",
          message:
            'Core modules must not translate. Return an ErrorKey and let the display edge translate it (zingo-adrs zingo-mobile/0009).',
        },
        {
          selector: "ImportSpecifier[imported.name='TranslateType']",
          message:
            'Core modules take no translate callback. Return an ErrorKey and let the display edge translate it (zingo-adrs zingo-mobile/0009).',
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
