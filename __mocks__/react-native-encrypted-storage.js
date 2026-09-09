let store = {};

export default {
  setItem: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn(key => Promise.resolve(store[key] ?? null)),
  removeItem: jest.fn(key => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store = {};
    return Promise.resolve();
  }),
};
