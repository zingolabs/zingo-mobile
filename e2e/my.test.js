// const { log } = require('detox');

describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should have a visible button', async () => {
    // log.error(device.appLaunchArgs.get())
    await expect(element(by.traits(['button'])).atIndex(1)).toBeVisible();
  });
  
  // my failing test
  // it('should actually be invisible button', async () => {
  //   // log.error(device.appLaunchArgs.get())
  //   await expect(element(by.traits(['button'])).atIndex(1)).not.toBeVisible();
  // });

  // it('should show hello screen after tap', async () => {
  //   await element(by.id('hello_button')).tap();
  //   await expect(element(by.text('Hello!!!'))).toBeVisible();
  // });

  // it('should show world screen after tap', async () => {
  //   await element(by.id('world_button')).tap();
  //   await expect(element(by.text('World!!!'))).toBeVisible();
  // });
});
