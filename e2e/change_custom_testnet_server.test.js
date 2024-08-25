const { log, by, element } = require('detox');

import { loadTestWallet } from "./e2e-utils/loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Change the Server.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  it('Go settings & change to a correct Testnet server URI.', async () => {
    // go to setting modal screen again
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('menu.settings')).tap();

    // waiting for the custom server radio
    await waitFor(element(by.id('settings.custom-server'))).toBeVisible()
          .whileElement(by.id('settings.scroll-view')).scroll(200, 'down');

    // choose the custom server 
    await element(by.id('settings.custom-server')).tap();

    // waiting for the custom server field
    await waitFor(element(by.id('settings.custom-server-field'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id("settings.custom-server-field")).replaceText('https://testnet.lightwalletd.com');

    // save the new testnet server
    await element(by.id('settings.button.save')).tap();

    // waiting for seed server change screen
    await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);

    // three taps to be really sure...
    await element(by.id('seed.button.OK')).tap();
    await element(by.id('seed.button.OK')).tap();
    await element(by.id('seed.button.OK')).tap();

    // restart the App with the new testnet server, without any wallet.
    // create a new wallet in testnet
    await waitFor(element(by.id('loadingapp.createnewwallet'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('loadingapp.createnewwallet')).tap();
    
    // click the button accepting the new testnet seed
    await element(by.id('seed.button.OK')).tap();

    // waiting for a testnet new wallet fully synced
    await waitFor(element(by.id('header.checkIcon'))).toBeVisible().withTimeout(sync_timeout);
  });
});
