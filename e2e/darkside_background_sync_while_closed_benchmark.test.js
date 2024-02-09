const { log, device, by, element } = require('detox');

import { loadRecipientWallet } from "./e2e-utils/loadRecipientWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Background sync benchmark', () => {
  it('should indicate performance of background sync', async () => {
    await loadRecipientWallet();

    // report pre-background balance
    await waitFor(element(by.id('header.total-balance.big-part'))).toBeVisible().withTimeout(sync_timeout);
    const startBalance = await element(by.id('header.total-balance.big-part')).getAttributes();
    console.log("startBalance:", startBalance.text);

    // send app to background and wait
    await device.sendToHome();
    await sleep(45000);

    // open app and report the post-background balance, relative to the number of transactions synced in the background
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('header.total-balance.big-part'))).toBeVisible().withTimeout(sync_timeout);
    const endBalance = await element(by.id('header.total-balance.big-part')).getAttributes();
    console.log("endBalance:", endBalance.text);
  });
});
