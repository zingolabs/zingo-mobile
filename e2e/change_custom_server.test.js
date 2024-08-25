const { log, by, element } = require('detox');

import { loadTestWallet } from "./e2e-utils/loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Change the Server.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  it('Go settings & change to a correct Mainnet server URI.', async () => {
    // go to setting modal screen
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('menu.settings')).tap();

    // scrolling until find the custom server field
    await element(by.id('settings.scroll-view')).scroll(500, 'down');

    // waiting for custom server radio button
    await waitFor(element(by.id('settings.custom-server'))).toBeVisible().withTimeout(sync_timeout);

    // choose the custom server 
    await element(by.id('settings.custom-server')).tap();

    // waiting for the custom server field
    await waitFor(element(by.id('settings.custom-server-field'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id("settings.custom-server-field")).replaceText('https://lwd1.zcash-infra.com:9067');

    // save the new server
    await element(by.id('settings.button.save')).tap();

    // waiting for starting to sync
    await waitFor(element(by.id('header.playIcon'))).toBeVisible().withTimeout(sync_timeout);

    // the sync process have to run normally with the new server
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();

    // waiting for starting the sync process again
    await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(sync_timeout);

    // getting blocks now synced from the screen
    const blockssyncednow_1 = element(by.id('syncreport.syncednow'));
    const blockssyncednow_attributes_1 = await blockssyncednow_1.getAttributes();
    const blockssyncednowNum_1 = Number(blockssyncednow_attributes_1.text.split(' ')[0]);

    log.info('blocks 1:', blockssyncednowNum_1);

    // wait a little bit
    await sleep(10000);

    // getting blocks now synced from the screen
    const blockssyncednow_2 = element(by.id('syncreport.syncednow'));
    const blockssyncednow_attributes_2 = await blockssyncednow_2.getAttributes();
    const blockssyncednowNum_2 = Number(blockssyncednow_attributes_2.text.split(' ')[0]);

    log.info('blocks 2:', blockssyncednowNum_2);

    // the 2 blocks have to be greater then the 1 blocks
    if (!(blockssyncednowNum_2 > blockssyncednowNum_1)) {
      fail('The sync process is not progressing.');
    }
  });
});
