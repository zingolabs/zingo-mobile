const { log, device, by, element, expect } = require('detox');

import { loadRecipientWallet } from './e2e-utils/loadRecipientWallet.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('Renders wallet data correctly.', () => {
  it('loads a wallet', async () => await loadRecipientWallet());
  it('does not parse an incorrect address', async () => {
    await waitFor(element(by.id('vt-1')))
    .toExist()
    .withTimeout(30000);
    await element(by.text('SEND')).tap();

    await element(by.id('send.addressplaceholder')).replaceText('thisisaninvalidaddress');

    await waitFor(element(by.id('send.address.error')))
      .toExist()
      .withTimeout(5000);
  });
});
