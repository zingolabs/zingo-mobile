const AsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(async () => []),
  // Add any other methods you want to mock
};

export default AsyncStorage;
