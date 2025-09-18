const { log, device, by, element, expect } = require('detox');

import { loadRecipientWallet } from './e2e-utils/loadRecipientWallet.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', async () => await loadRecipientWallet());
  it('adds return address to the memo if that option is selected, and correctly renders confirm screen', async () => {
    await element(by.text('SEND')).tap();

    await element(by.id('send.addressplaceholder')).replaceText(
      'uregtest1az7w9w3tdegf0srnsgqyqfhyfrpx2h6u4pkc2yq3ja552vzhwkjqgy4fu6a6kcu9280ppajamj2gcq9lx9x0zxdrsns94ml3e443a7t2dm50382mhtkleydrq74q5xlh6sel5u0qlrvflf20qgljzszd2ht9jmerwwahct9rtuc3nqdk',
    );
    await waitFor(element(by.id('send.address.check')))
      .toExist()
      .withTimeout(5000);

    await expect(element(by.id('send.memo-field'))).toBeVisible();
    await element(by.id('send.memo-field')).replaceText('1\n2\n3\n4\n5\n6\n7\n8');
    await element(by.id('send.scroll-view')).scrollTo('bottom');

    await waitFor(element(by.id('send.button')))
      .toBeVisible()
      .withTimeout(sync_timeout);
    await element(by.id('send.button')).tap();

    await expect(element(by.id('send.confirm.scroll-view'))).toExist();
    await expect(element(by.id('send.confirm.scroll-view'))).toBeVisible(20);
    await element(by.id('send.confirm.scroll-view')).scrollTo('bottom');

    const memo = element(by.id('send.confirm-memo'));

    await expect(memo).toBeVisible(100);
    await expect(memo).toHaveText('1\n2\n3\n4\n5\n6\n7\n8');
  });
});
