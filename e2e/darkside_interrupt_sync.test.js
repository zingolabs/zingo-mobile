const { log, device, by, element } = require('detox');

import { loadDarksideWallet } from "./e2e-utils/loadDarksideWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Interrupt sync', () => {
  it('should maintain correct balance when sync is interrupted', async () => {
    await loadDarksideWallet();

    // go to sync report
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();

    // close app and reopen then go to sync report mupltiple times
    await device.sendToHome();
    await sleep(1000);
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();
    await sleep(10000);
    await device.sendToHome();
    await sleep(1000);
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();
    await sleep(10000);
    await device.sendToHome();
    await sleep(1000);
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();
    await sleep(10000);
    await device.sendToHome();
    await sleep(1000);
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();
    await sleep(10000);
    await device.sendToHome();
    await sleep(1000);
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();
    await sleep(10000);
    await device.sendToHome();
    await sleep(1000);
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();
    await sleep(10000);

    // close sync report screen
    await waitFor(element(by.id('syncreport.button.close'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('syncreport.button.close')).tap();

    // wait for the fully sync green icon
    await waitFor(element(by.id('header.sync-facheck'))).toBeVisible().withTimeout(sync_timeout);

    // verify pool balances
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.fund-pools')).tap();
    await expect(element(by.id('orchard-total-balance.big-part'))).toHaveText(' 0.0851');
    await expect(element(by.id('orchard-total-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('orchard-spendable-balance.big-part'))).toHaveText(' 0.0851');
    await expect(element(by.id('orchard-spendable-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('sapling-total-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('sapling-total-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('sapling-spendable-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('sapling-spendable-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('transparent-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('transparent-total-balance.small-part'))).not.toBeVisible();
    await element(by.id('fund-pools.button.close')).tap();

    await sleep(180000);
  });
});
