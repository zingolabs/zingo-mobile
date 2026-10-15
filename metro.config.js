const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const withStorybook = require('@storybook/react-native/metro/withStorybook');
const { lockdownSerializer } = require('@lavamoat/react-native-lockdown');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const config = {
  // Hardened JavaScript (SES). The shim loads as the first polyfill and
  // repairs the intrinsics; after InitializeCore and before the entry file
  // `hardenIntrinsics()` freezes Object, Array, Promise, JSON... so no
  // dependency can patch them later. Hermes has no Compartments, so this is
  // lockdown only, not per-package isolation. Shims that must patch an
  // intrinsic go into getPolyfills, before the freeze.
  serializer: lockdownSerializer(
    { hermesRuntime: true },
    { getPolyfills: defaultConfig.serializer.getPolyfills },
  ),
  transformer: {
    babelTransformerPath: require.resolve('./svgXmlTransformer.js'),
    // Defer module evaluation until first use. Reduces cold-boot time
    // because the JS bundle stops running every top-level `require()`
    // up-front; modules are loaded the first time their exports are
    // actually accessed (then cached normally).
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
};

module.exports = withStorybook(mergeConfig(defaultConfig, config), {
  enabled: process.env.STORYBOOK_ENABLED === 'true',
  configPath: require('path').resolve(__dirname, './.storybook'),
  // When disabled, stub every storybook/@storybook import to an empty
  // module so production bundles carry no Storybook runtime.
  onDisabledRemoveStorybook: true,
});
