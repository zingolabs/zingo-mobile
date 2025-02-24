const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: [
      ...(process.env.RN_SRC_EXT ? process.env.RN_SRC_EXT.split(',') : []),
      ...defaultConfig.resolver.sourceExts,
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
