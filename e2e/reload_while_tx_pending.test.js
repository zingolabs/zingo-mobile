// fixes https://github.com/zingolabs/zingolib/issues/613

const { log, device, by, element } = require('detox');

import { loadRecipientWallet } from "./e2e-utils/loadRecipientWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Maintains correct information while tx pending', () => {
  it('loads the wallet', loadRecipientWallet);
  it('should send from orchard to sapling pool', async () => {
    // wait for fully synced.
    //await sleep(4000);
    
    await element(by.text('SEND')).tap();
    await element(by.id('send.addressplaceholder')).replaceText(
      'zregtestsapling1fkc26vpg566hgnx33n5uvgye4neuxt4358k68atnx78l5tg2dewdycesmr4m5pn56ffzsa7lyj6',
    );
    await element(by.id('send.amount')).replaceText('0.0002');
    await element(by.id('send.scroll-view')).scrollTo('bottom');
    await element(by.id('send.button')).tap();
    await element(by.text('CONFIRM')).tap();

    // verify pool balances
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.fundpools')).tap();
    await expect(element(by.id('orchard-total-balance.big-part'))).toHaveText(' 0.0097');
    await expect(element(by.id('orchard-total-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('orchard-spendable-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('orchard-spendable-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('sapling-total-balance.big-part'))).toHaveText(' 0.0002');
    await expect(element(by.id('sapling-total-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('sapling-spendable-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('sapling-spendable-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('transparent-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('transparent-total-balance.small-part'))).not.toBeVisible();
    await element(by.id('fundpools.button.close')).tap();
  });
  it('should show correct pool balances after going to background', async () => {
    await device.sendToHome();
    await sleep(1000);
    await device.launchApp({ newInstance: false });
    
    // verify pool balances
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.fundpools')).tap();
    await expect(element(by.id('orchard-total-balance.big-part'))).toHaveText(' 0.0097');
    await expect(element(by.id('orchard-total-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('orchard-spendable-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('orchard-spendable-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('sapling-total-balance.big-part'))).toHaveText(' 0.0002');
    await expect(element(by.id('sapling-total-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('sapling-spendable-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('sapling-spendable-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('transparent-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('transparent-total-balance.small-part'))).not.toBeVisible();
  });
  it('should show correct pool balances after restarting', async () => {
    await device.sendToHome();
    await sleep(1000);
    await device.launchApp({ newInstance: true });
    
    // verify pool balances
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.fundpools')).tap();
    await expect(element(by.id('orchard-total-balance.big-part'))).toHaveText(' 0.0097');
    await expect(element(by.id('orchard-total-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('orchard-spendable-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('orchard-spendable-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('sapling-total-balance.big-part'))).toHaveText(' 0.0002');
    await expect(element(by.id('sapling-total-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('sapling-spendable-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('sapling-spendable-balance.small-part'))).not.toBeVisible();
    await expect(element(by.id('transparent-balance.big-part'))).toHaveText(' 0.0000');
    await expect(element(by.id('transparent-total-balance.small-part'))).not.toBeVisible();
  });
});
