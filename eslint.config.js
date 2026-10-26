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
 * The geometry lock (zingo-adrs zingo-mobile/0024): type, radii and icon
 * sizes come from app/theme and the Text variants, never from a number on
 * a screen. A number is a Literal, a negative one, or an arithmetic
 * expression; a token is an Identifier or a MemberExpression.
 */
const NUMBER =
  ':matches(Literal[raw=/^[0-9]/], UnaryExpression[operator="-"], BinaryExpression)';
/** The value of a style property, or either branch of a ternary there. */
const VALUE = keys =>
  `:matches(Property[key.name=${keys}], Property[key.name=${keys}] > ConditionalExpression) > ${NUMBER}`;
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
 * Files the redesign has not reached (DESIGN.md "Known gaps") and the
 * approved exceptions (A: the tab bar). They keep hand-set values until
 * each one moves onto the system; remove a file here when it does.
 */
const geometryGaps = [
  // exception A: the tab bar
  'app/navigation/CustomTabBar.tsx',
  'ui/primitives/Icons/TabIcons.tsx',
  // DESIGN.md "Known gaps": the Header's internals, the Address Book, the
  // server list, ChainSelect, the migration screens
  'screens/AddressBook/AddressBook.tsx',
  'screens/AddressBook/components/AddressRowHead.tsx',
  'screens/AddressBook/components/ContactRow.tsx',
  'screens/MeetIronwood/MeetIronwood.tsx',
  'screens/MigrationSending/MigrationSending.tsx',
  'screens/MigrationStrategy/MigrationStrategy.tsx',
  'screens/MigrationStrategy/components/NymGateSheet.tsx',
  'screens/MigrationTransactions/MigrationTransactions.tsx',
  'screens/Server/ServerRow.tsx',
  'ui/widgets/ChainSelect.tsx',
  'ui/widgets/ChainTypeToggle.tsx',
  'ui/widgets/ContactSheet.tsx',
  'ui/widgets/Header/Header.tsx',
  'ui/widgets/Header/components/PriceRow.tsx',
  'ui/widgets/SearchField.tsx',
  'ui/widgets/SegmentedSwitch.tsx',
  // not yet redesigned: hand-set values until each screen moves onto the
  // system (counts as of 2026-10-25)
  'screens/About/About.tsx',
  'screens/History/components/IronwoodMigrationBanner.tsx',
  'screens/ImportChooser/ImportChooser.tsx',
  'screens/ImportUfvk/ImportUfvk.tsx',
  'screens/Insight/Insight.tsx',
  'screens/Insight/components/ActivityChart.tsx',
  'screens/Insight/components/Donut.tsx',
  'screens/Launching/Launching.tsx',
  'screens/Messages/MessageList.tsx',
  'screens/Messages/components/MessageLine.tsx',
  'screens/MixnetDoctor/MixnetDoctor.tsx',
  'screens/OptionsPanel/OptionsPanel.tsx',
  'screens/Pools/Pools.tsx',
  'screens/SeedBackup/SeedBackup.tsx',
  'screens/SeedBackup/components/ConfirmStep.tsx',
  'screens/SeedBackup/components/DoneStep.tsx',
  'screens/SeedBackup/components/InfoStep.tsx',
  'screens/SeedBackup/components/ScreenshotSheet.tsx',
  'screens/SeedBackup/components/SeedParts.tsx',
  'screens/SeedBackup/components/StepParts.tsx',
  'screens/SeedBackup/components/WordsStep.tsx',
  'screens/Send/components/SendErrorSheet.tsx',
  'screens/Server/CustomServerBox.tsx',
  'screens/Server/Server.tsx',
  'screens/Server/ServerLog.tsx',
  'screens/Settings/Settings.tsx',
  'screens/StartMenu/StartMenu.tsx',
  'screens/Swap/components/TokenLogo.tsx',
  'screens/SwapResult/SwapResult.tsx',
  'screens/SyncReport/SyncReport.tsx',
  'screens/ViewingKey/ViewingKey.tsx',
  'screens/ViewingKey/components/KeyCard.tsx',
  'screens/ViewingKey/components/KeyQr.tsx',
  'screens/WalletError/WalletError.tsx',
  'screens/WalletSeed/WalletSeed.tsx',
  'ui/primitives/AppSheetModal.tsx',
  'ui/primitives/ProgressBar.tsx',
  'ui/primitives/Radio.tsx',
  'ui/widgets/ActionMenuBottomSheet.tsx',
  'ui/widgets/Address/Address.tsx',
  'ui/widgets/BusyButton.tsx',
  'ui/widgets/CardExpand.tsx',
  'ui/widgets/ConfirmBottomSheet.tsx',
  'ui/widgets/CurrencyAmount.tsx',
  'ui/widgets/DeleteWalletSheet.tsx',
  'ui/widgets/Flight/SendFlight.tsx',
  'ui/widgets/Flight/SwapFlight.tsx',
  'ui/widgets/NewAddressTag.tsx',
  'ui/widgets/ProgressState.tsx',
  'ui/widgets/SaveSheet.tsx',
  'ui/widgets/ScanOverlay.tsx',
  'ui/widgets/SeedPhraseInput.tsx',
  'ui/widgets/SeedSheet.tsx',
  'ui/widgets/SelectBottomSheet.tsx',
  'ui/widgets/TextInputAddress.tsx',
  'ui/widgets/ZecAmount.tsx',
];

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
    // value.
    files: ['app/**', 'screens/**', 'ui/**'],
    ignores: ['app/theme/**', '**/*.stories.tsx'],
    rules: {
      'react-native/no-color-literals': 'error',
      'no-restricted-syntax': ['error', ...colorLock],
    },
  },
  {
    // The geometry lock, on screens and shared UI; app/theme defines the
    // values and app/ logic has no geometry.
    files: ['screens/**', 'ui/**'],
    ignores: ['**/*.stories.tsx', ...geometryGaps],
    rules: {
      'no-restricted-syntax': ['error', ...colorLock, ...geometryLock],
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
