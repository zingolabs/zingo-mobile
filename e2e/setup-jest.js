import { device } from 'detox';

// eslint-disable-next-line no-undef
beforeAll(async () => {
  await device.launchApp();
});

// eslint-disable-next-line no-undef
beforeEach(async () => {
  await device.reloadReactNative();
});
