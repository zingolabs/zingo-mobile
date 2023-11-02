// react-native-fs.js

export const readFile = jest.fn().mockImplementation(() => {
  return Promise.resolve('Mocked read content');
});

export const writeFile = jest.fn().mockImplementation((path, content) => {
  return Promise.resolve(`Successfully wrote: ${content}`);
});
