const fs = require('fs');
const path = require('path');
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

/**
 * The color lock: a color is named by its token in app/theme, never by
 * value. Shared by every block that sets no-restricted-syntax, because a
 * later block replaces the rule instead of adding to it.
 */
const colorLock = [
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
    // A named color where a color is expected: a style property or a
    // JSX attribute that carries a color (the BIP39 list has "black").
    selector:
      ':matches(Property[key.name=/[cC]olor$|^fill$|^stroke$/], JSXAttribute[name.name=/[cC]olor$|^fill$|^stroke$/]) :matches(Literal, JSXExpressionContainer > Literal)[value=/^(red|yellow|green|blue|white|black|coral|gray|grey|orange|pink|purple|cyan|magenta|silver|gold|navy|teal|lime|olive|maroon|brown|tan|crimson|salmon|tomato|ivory|beige|khaki|violet|indigo)$/i]',
    message: 'Use a color token from app/theme, not a named color.',
  },
  {
    selector:
      'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}([^0-9a-zA-Z]|$)|rgba?[(]/]',
    message: 'Use a color token from app/theme, not a color in a string.',
  },
];

/**
 * The press lock: a control reacts to a press through ui/primitives/Pressable
 * and its kind, never through a style written by hand (DESIGN.md, Pressing).
 */
const pressLock = [
  {
    selector: "ConditionalExpression[test.name='pressed']",
    message:
      'Press through ui/primitives/Pressable and its kind, not a pressed style written by hand.',
  },
];

/**
 * The geometry lock (zingo-adrs zingo-mobile/0024): type, radii and icon
 * sizes come from app/theme and the Text variants, never from a number on
 * a screen. A number is a Literal, a negative one, or an arithmetic
 * expression; a token is an Identifier or a MemberExpression.
 */
const NUMBER =
  ':matches(Literal[raw=/^[0-9]/], UnaryExpression[operator="-"], BinaryExpression)';
/** The value of a style property, or a number in either branch of a ternary there (not its test). */
const VALUE = keys =>
  `:matches(Property[key.name=${keys}] > ${NUMBER}, Property[key.name=${keys}] > ConditionalExpression[consequent.raw=/^[0-9]/], Property[key.name=${keys}] > ConditionalExpression[alternate.raw=/^[0-9]/])`;
/** Icon components: ui/primitives/Icons, drawn on the Icon base. */
const ICON =
  '/(Icon|Chevron(Up|Down|Left|Right)|TriangleAlert|RescanArrows|RescanCloud)$/';
const geometryLock = [
  {
    selector: VALUE('/^(fontSize|lineHeight|letterSpacing)$/'),
    message:
      'Use a Text variant (app/theme/typography), not a fontSize, lineHeight or letterSpacing by hand.',
  },
  {
    selector: VALUE(
      '/^border(TopLeft|TopRight|BottomLeft|BottomRight|TopStart|TopEnd|BottomStart|BottomEnd)?Radius$/',
    ),
    message:
      'Use a radius token from app/theme (radiusSm, radiusMd, radiusPill, radiusSheet), not a number.',
  },
  {
    selector: `JSXOpeningElement[name.name=${ICON}] > JSXAttribute[name.name="size"] > JSXExpressionContainer > ${NUMBER}`,
    message:
      'Use an icon size token from app/theme (iconSizeSm, iconSizeMd, iconSize), not a number.',
  },
  {
    selector: `JSXAttribute[name.name=/^(fontSize|letterSpacing)$/] > :matches(Literal, JSXExpressionContainer > ${NUMBER})`,
    message:
      'Use a Text variant (app/theme/typography), not a fontSize or letterSpacing by hand.',
  },
];

/**
 * Files that keep hand-set geometry: the approved exceptions (A: the tab
 * bar), DESIGN.md "Known gaps" and the screens not yet on the system. Each
 * one says so in its first line, `/* geometry-gap: <why> *\/`, and loses
 * that line when it moves onto the system. A marker in the file, not a list
 * here, so PRs that clean different files never touch the same lines.
 */
const GAP_MARKER = /^\/\* geometry-gap: /;
const sourcesUnder = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourcesUnder(file);
    }
    return /\.tsx?$/.test(entry.name) ? [file] : [];
  });
const geometryGaps = ['app/navigation', 'screens', 'ui']
  .flatMap(dir => sourcesUnder(path.join(__dirname, dir)))
  .filter(file => GAP_MARKER.test(fs.readFileSync(file, 'utf8')))
  .map(file => path.relative(__dirname, file).split(path.sep).join('/'));

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
          paths: [
            {
              name: 'react-native',
              importNames: ['TouchableOpacity', 'TouchableHighlight'],
              message:
                'Press through ui/primitives/Pressable and its kind (DESIGN.md, Pressing).',
            },
          ],
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
    // value.
    files: ['app/**', 'screens/**', 'ui/**'],
    ignores: ['app/theme/**', '**/*.stories.tsx'],
    rules: {
      'react-native/no-color-literals': 'error',
      'no-restricted-syntax': ['error', ...colorLock, ...pressLock],
    },
  },
  {
    // The geometry lock, on screens and shared UI; app/theme defines the
    // values and app/ logic has no geometry.
    files: ['screens/**', 'ui/**'],
    ignores: ['**/*.stories.tsx', ...geometryGaps],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...colorLock,
        ...pressLock,
        ...geometryLock,
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
        ...colorLock,
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
