const { log, device, by, element } = require('detox');

import { loadRecipientWallet } from "./e2e-utils/loadRecipientWallet.js";

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadRecipientWallet);
  it('correctly renders the scanner', async () => {
    await element(by.text('SEND')).tap();
    
    await element(by.id('send.scan-button')).tap();
    await expect(element(by.id('scan.cancel'))).toBeVisible();
    await element(by.id('scan.cancel')).tap();
  });
  
  it('adds return address to the memo if that option is selected, and correctly renders confirm screen', async () => {
    
    await element(by.id('send.addressplaceholder')).replaceText(
      'zregtestsapling1fkc26vpg566hgnx33n5uvgye4neuxt4358k68atnx78l5tg2dewdycesmr4m5pn56ffzsa7lyj6',
    );
    await element(by.id('send.amount')).replaceText('0');
    await element(by.id('send.checkboxUA')).tap();
    await element(by.id('send.scroll-view')).scrollTo('bottom');
    await element(by.id('send.memo-field')).replaceText("1\n2\n3\n4\n5\n6\n7\n8");
    await element(by.id('send.scroll-view')).scrollTo('bottom');
    await element(by.id('send.button')).tap();

    await element(by.id('send.confirm.scroll-view')).scrollTo('bottom');
    
    const memo = element(by.id('send.confirm-memo'));

    await expect(memo).toBeVisible(100);
    await expect(memo).toHaveText(
      '1\n2\n3\n4\n5\n6\n7\n8\nReply to: \nzregtestsapling1fkc26vpg566hgnx33n5uvgye4neuxt4358k68atnx78l5tg2dewdycesmr4m5pn56ffzsa7lyj6',
    );
  });
  
});
