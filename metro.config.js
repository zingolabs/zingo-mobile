const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const exclusionList =
  require('metro-config/private/defaults/exclusionList').default;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const config = {
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
    // Cargo creates and deletes temp files under the Rust target directories
    // while a build runs. Without watchman, Metro's fallback watcher follows
    // one, then exits on ENOENT.
    blockList: exclusionList([/\/rust\/(?:[^/]+\/)?target\/.*/]),
  },
};

module.exports = mergeConfig(defaultConfig, config);
