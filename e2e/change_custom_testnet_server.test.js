const { log, by, element } = require('detox');

import { loadTestWallet } from "./loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Change the Server.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  
  it('Go settings & change to a correct server URI.', async () => {
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(100000);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.settings')).tap();

    await element(by.id('settings.scrollView')).scroll(500, 'down');

    // waiting for second server radio button
    await waitFor(element(by.id('settings.customServer'))).toBeVisible().withTimeout(20000);

    // choose the custom server 
    await element(by.id('settings.customServer')).tap();

    // waiting for the custom server field
    await waitFor(element(by.id('settings.customServerField'))).toBeVisible().withTimeout(20000);
    await element(by.id("settings.customServerField")).replaceText('https://testnet.lightwalletd.com');

    await element(by.id('settings.button.save')).tap();

    // waiting for 
    await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(50000);

    // three taps to be really sure...
    await element(by.id('seed.button.OK')).tap();
    await element(by.id('seed.button.OK')).tap();
    await element(by.id('seed.button.OK')).tap();

    // create a new wallet in testnet
    

    // waiting for second server radio button
    await waitFor(element(by.id('header.playIcon'))).toBeVisible().withTimeout(50000);

    // the sync process have to run normally with the other server
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();

    // waiting for starting the sync process again
    await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(10000);

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