// react-native-snackbar.js

export default {
  show: jest.fn().mockImplementation(message => {
    console.log(`Mocked Snackbar show: ${message}`);
  }),
  dismiss: jest.fn().mockImplementation(() => {
    console.log('Mocked Snackbar dismiss');
  }),
};
