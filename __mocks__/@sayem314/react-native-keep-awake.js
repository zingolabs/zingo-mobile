// @sayem314/react-native-keep-awake.js

export const activateKeepAwake = jest.fn().mockImplementation(() => {
  console.log('Mocked activateKeepAwake');
});

export const deactivateKeepAwake = jest.fn().mockImplementation(() => {
  console.log('Mocked deactivateKeepAwake');
});
