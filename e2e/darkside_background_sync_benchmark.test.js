const { log, device, by, element } = require('detox');

import { loadRecipientWallet } from "./e2e-utils/loadRecipientWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Background sync benchmark', () => {
  it('should indicate performance of background sync', async () => {
    await loadRecipientWallet();

    // close app and wait
    await device.sendToHome();
    await sleep(20000);

    // open app and report the total balance, relative to the number of transactions synced in the background
    await device.launchApp({ newInstance: false });
    await waitFor(element(by.id('header.total-balance.big-part'))).toBeVisible().withTimeout(sync_timeout);
    const balance = await element(by.id('header.total-balance.big-part')).getAttributes();
    console.log("Balance:", balance.text);
  });
});
