const { log, by, element } = require('detox');

import { loadTestWallet } from "./e2e-utils/loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Change the Server from the list.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  it('Go settings & change to an existent server in the list.', async () => {
    //await sleep(4000);

    // go to setting modal screen
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('menu.settings')).tap();

    // waiting for second server radio button
    await waitFor(element(by.id('settings.scroll-view'))).toBeVisible().withTimeout(sync_timeout);
    await waitFor(element(by.id('settings.list-server'))).toBeVisible()
          .whileElement(by.id('settings.scroll-view')).scroll(200, 'down');

    // choose another server from the list
    await waitFor(element(by.id('settings.list-server'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('settings.list-server')).tap();

    // select https://lwd2.zcash-infra.com:9067
    await waitFor(element(by.text('Hong Kong https://lwd2.zcash-infra.com:9067'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.text('Hong Kong https://lwd2.zcash-infra.com:9067')).tap();

    // save the new server
    await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('settings.button.save')).tap();

    // waiting for second server radio button
    await waitFor(element(by.id('header.playicon'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.playicon')).tap();

    // waiting for starting the sync process again
    await waitFor(element(by.id('syncreport.syncednow'))).toBeVisible().withTimeout(sync_timeout);

    // getting blocks now synced from the screen
    const blockssyncednow_1 = element(by.id('syncreport.syncednow'));
    const blockssyncednow_attributes_1 = await blockssyncednow_1.getAttributes();
    const blockssyncednowNum_1 = Number(blockssyncednow_attributes_1.text.split(' ')[0]);

    log.info('blocks 1:', blockssyncednowNum_1);

    // wait a little bit
    await sleep(25000);

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
