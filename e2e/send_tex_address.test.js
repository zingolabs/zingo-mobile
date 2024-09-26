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
    await element(by.id('send.amount')).replaceText('0');
    await element(by.id('send.checkboxua')).tap();
    await element(by.id('send.scroll-view')).scrollTo('bottom');
    await element(by.id('send.memo-field')).replaceText('1\n2\n3\n4\n5\n6\n7\n8');
    await element(by.id('send.scroll-view')).scrollTo('bottom');

    await waitFor(element(by.id('send.button'))).toBeVisible();
    await sleep(2000);
    await element(by.id('send.button')).tap();

    await expect(element(by.id('send.confirm.scroll-view'))).toExist();
    await expect(element(by.id('send.confirm.scroll-view'))).toBeVisible(20);
    await element(by.id('send.confirm.scroll-view')).scrollTo('bottom');

    const memo = element(by.id('send.confirm-memo'));

    await expect(memo).toBeVisible(100);
    await expect(memo).toHaveText(
      '1\n2\n3\n4\n5\n6\n7\n8\nReply to: \nu1lx7nlnqqqs7p4hcqz4hyjgnw7h8zskcgr2f8dfhm96np0gnfdzu7jtms7q2pxd7ufy96wxzdsdy65jvp3td7fj2ltcz0jpak86ddyszl9ykn5s86q3xataya5867z3tj2x8cw0ljyrenymr2gcqmjf50gmexqj233yn3kdaxn2yukwcx87emurufakf82wapgnu5h3fvae6aw9uus2r',
    );
  });
});
