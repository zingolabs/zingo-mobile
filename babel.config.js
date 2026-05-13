module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['@babel/plugin-transform-export-namespace-from', 'dynamic-import-node', 'react-native-worklets/plugin'],
};
