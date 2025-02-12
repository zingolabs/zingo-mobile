const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const { resolver: defaultResolver } = getDefaultConfig.getDefaultValues();

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

/**
 * See https://react-native-vision-camera.com/docs/guides/mocking for more information.
 */
const config = {
  resolver: {
    ...defaultResolver,
    sourceExts: [process.env.RN_SRC_EXT && process.env.RN_SRC_EXT.split(','), ...defaultResolver.sourceExts],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
