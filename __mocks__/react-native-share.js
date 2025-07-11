export default {
  open: jest.fn(() => Promise.resolve()),
  shareSingle: jest.fn(() => Promise.resolve()),
  isPackageInstalled: jest.fn(() => Promise.resolve({ isInstalled: true })),
};
