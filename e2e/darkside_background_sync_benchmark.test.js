const { log, device, by, element } = require('detox');

import { loadDarksideWallet } from "./e2e-utils/loadRecipientWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check_timeout = 5000;

describe('Background sync benchmark', () => {
  it('should indicate performance of background sync', async () => {
    await loadRecipientWallet();

    // close app and wait
    await device.sendToHome();
    await sleep(10000);

    // open app and check if sync is complete
    await device.launchApp({ newInstance: false });
    try {
      await waitFor(element(by.id('header.sync-facheck'))).toBeVisible().withTimeout(check_timeout);
      console.log('Background sync complete');
    } catch (error) {
      console.log('Background sync incomplete');
    }
  });
});
