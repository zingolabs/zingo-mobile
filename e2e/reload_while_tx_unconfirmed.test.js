const { log, device, by, element } = require('detox');

import { loadRecipientWallet } from "./loadRecipientWallet.js";

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadRecipientWallet);

  // it('adds return address to the memo if that option is selected, and correctly renders confirm screen', async () => {
  //   await element(by.id('send.addressplaceholder')).replaceText(
  //     'zregtestsapling1fkc26vpg566hgnx33n5uvgye4neuxt4358k68atnx78l5tg2dewdycesmr4m5pn56ffzsa7lyj6',
  //   );
  //   await element(by.id('send.amount')).replaceText('20000');
  //   await element(by.id('send.scrollView')).scrollTo('bottom');
  //   await element(by.id('send.button')).tap();

  // });  
});
