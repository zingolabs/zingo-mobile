const { log } = require('detox');

describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    // jest.useFakeTimers();
    await device.reloadReactNative();
  });
  
  // afterEach(() => {
  //   jest.runOnlyPendingTimers()
  //   jest.useRealTimers()
  // })
  
  it('loads my test wallet', async () => {
    await element(by.id("loadingapp.restorewalletseed")).tap();
    await element(by.id("seed.seedplaceholder")).replaceText('lottery multiply patient simple ivory leisure swift square west despair beauty match crowd margin reject box always title photo remind word diet ecology badge');
    await element(by.id("birthdayinput")).replaceText('1994000');
    await element(by.text("RESTORE WALLET")).tap();
  });
  
  it('syncs a transaction in 100000ms', async () => {
    await waitFor(element(by.id("transactionList.1"))).toBeVisible().withTimeout(100000)
    await element(by.id("transactionList.1")).tap();
  });
});
