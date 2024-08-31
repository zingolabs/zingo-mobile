const { log, by, element } = require('detox');

import { loadTestWallet } from "./e2e-utils/loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Change the Server.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  it('Go settings & change to a correct Testnet server URI.', async () => {
    await sleep(4000);

    // go to setting modal screen again
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('menu.settings')).tap();

    // waiting for custom server radio button
    await waitFor(element(by.id('settings.scroll-view'))).toBeVisible().withTimeout(sync_timeout);
    await waitFor(element(by.id('settings.securitytitle'))).toBeVisible()
          .whileElement(by.id('settings.scroll-view')).scroll(200, 'down');

    // choose the custom server
    await waitFor(element(by.id('settings.custom-server'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('settings.custom-server')).tap();

    // waiting for the custom server field
    await waitFor(element(by.id('settings.custom-server-field'))).toBeVisible()
          .whileElement(by.id('settings.scroll-view')).scroll(100, 'down');
    await element(by.id("settings.custom-server-field")).replaceText('http://10.0.2.2:20000');

    // waiting for the toggle, tap on regtest
    await waitFor(element(by.id('settings.custom-server-chain.regtest'))).toBeVisible()
          .whileElement(by.id('settings.scroll-view')).scroll(100, 'down');
    await element(by.id('settings.custom-server-chain.regtest')).tap();

    // save the new testnet server
    await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('settings.button.save')).tap();

    // waiting for seed server change screen
    await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('seed.button.OK')).tap();
    await waitFor(element(by.text('CONFIRM'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.text('CONFIRM')).tap();

    // restart the App with the new regtest server, without any wallet.
    // create a new wallet in regtest
    await waitFor(element(by.id('loadingapp.createnewwallet'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('loadingapp.createnewwallet')).tap();
    
    // click the button accepting the new regtest seed
    await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('seed.button.OK')).tap();

    // waiting for a regtest new wallet fully synced
    await waitFor(element(by.id('header.checkicon'))).toBeVisible().withTimeout(sync_timeout);
  });
});
