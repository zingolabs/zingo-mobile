const { log, device, by, element, expect } = require('detox');

import { loadTestWallet } from './e2e-utils/loadTestWallet.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('Renders wallet data correctly.', () => {
  it('loads a wallet', loadTestWallet);
  it('parses the TEX address and correctly renders the confirm screen', async () => {
    await waitFor(element(by.id('vt-1')))
      .toExist()
      .withTimeout(20000);
    await element(by.text('SEND')).tap();

    // Address taken from the reference implementation
    await element(by.id('send.addressplaceholder')).replaceText('tex1s2rt77ggv6q989lr49rkgzmh5slsksa9khdgte');

    await expect(element(by.text('Invalid Address!'))).not.toExist();

    await element(by.id('send.amount')).replaceText('0');
    await element(by.id('send.scroll-view')).scrollTo('bottom');
    await waitFor(element(by.id('send.button'))).toBeVisible();
    await element(by.id('send.button')).tap();

    await expect(element(by.id('send.confirm.scroll-view'))).toExist();
    await expect(element(by.id('send.confirm.scroll-view'))).toBeVisible(20);
    await element(by.id('send.confirm.scroll-view')).scrollTo('bottom');
  });
});
