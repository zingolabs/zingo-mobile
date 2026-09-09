// Web stub for react-native-fs
const RNFS = {
  RNFSFileTypeRegular: 0,
  RNFSFileTypeDirectory: 1,
  DocumentDirectoryPath: '/storybook',
  CachesDirectoryPath: '/storybook/cache',
  exists: async () => false,
  readFile: async () => '[]',
  writeFile: async () => {},
  mkdir: async () => {},
  unlink: async () => {},
};

export const {
  DocumentDirectoryPath,
  CachesDirectoryPath,
  exists,
  readFile,
  writeFile,
  mkdir,
  unlink,
} = RNFS;

export default RNFS;
