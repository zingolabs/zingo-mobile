const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const sonarjs = require('eslint-plugin-sonarjs');
// eslint-plugin-functional ships as ESM; unwrap the default export.
const functional = require('eslint-plugin-functional').default;

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
  sonarjs.configs.recommended,
  {
    // Rules from the sonarjs recommended set that fire on pre-existing
    // code (zingo-mobile#1166 adoption debt). Everything else in the set
    // enforces on new code from day one. Re-enable these as the code they
    // flag is refactored; never add to this list.
    rules: {
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-dead-store': 'off',
      'sonarjs/no-duplicated-branches': 'off',
      'sonarjs/no-ignored-exceptions': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/no-primitive-wrappers': 'off',
      'sonarjs/no-redundant-assignments': 'off',
      'sonarjs/no-redundant-boolean': 'off',
      'sonarjs/no-redundant-jump': 'off',
      'sonarjs/parameterized-tests': 'off',
      'sonarjs/prefer-specific-assertions': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/public-static-readonly': 'off',
      'sonarjs/super-linear-regex': 'off',
      'sonarjs/todo-tag': 'off',
      // The sonarjs recommended config re-enables these react rules, which
      // the @react-native config leaves off; restore the prior state.
      'react/no-did-mount-set-state': 'off',
      'react/no-did-update-set-state': 'off',
    },
  },
  {
    // Tests legitimately use http:// fixtures and exact float assertions.
    files: ['__tests__/**'],
    rules: {
      'sonarjs/no-clear-text-protocols': 'off',
      'sonarjs/no-floating-point-equality': 'off',
    },
  },
  {
    // Functional-shape guardrails for the wallet backend, the module the
    // typed-error migration (zingo-mobile#1151) is reshaping. Measured at
    // adoption: the heavier rules (no-let, no-this-expressions,
    // immutable-data, no-loop-statements, no-classes) fire 320+ times on
    // pre-existing code, and the rejection-related rules would forbid the
    // migration's goal state, so this starts with what the module already
    // satisfies. Grow this set as the module is refactored.
    files: ['app/walletBackend/**/*.ts'],
    plugins: { functional },
    rules: {
      'functional/no-class-inheritance': 'error',
    },
  },
];
