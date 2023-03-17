const { log, device, by, element } = require('detox');

import { loadTestWallet } from "./loadTestWallet.js";

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  
  // there is a transaction in this plant at 1994580, 1 block after the "birthday". 
  it('synks 1 block and renders a transaction. this should take less than a minute, but will time out after 16 minutes', async () => {
    await waitFor(element(by.id("transactionList.1"))).toBeVisible().withTimeout(sync_timeout)
    await element(by.id("transactionList.1")).tap();
    // we will test various attributes of this transaction once we testID them
  });
  
  //  
  it('has a receive tab', async () => {
    // we need to test these properties
    await element(by.text('RECEIVE')).tap();
  });
  

  it('Checkbox send screen -> include UA in memo field', async () => {
    await element(by.text('SEND')).tap();
    await element(by.id('send.addressplaceholder')).replaceText(
      'u1lx7nlnqqqs7p4hcqz4hyjgnw7h8zskcgr2f8dfhm96np0gnfdzu7jtms7q2pxd7ufy96wxzdsdy65jvp3td7fj2ltcz0jpak86ddyszl9ykn5s86q3xataya5867z3tj2x8cw0ljyrenymr2gcqmjf50gmexqj233yn3kdaxn2yukwcx87emurufakf82wapgnu5h3fvae6aw9uus2r',
    );
    await element(by.id('send.amount')).replaceText('0');
    await element(by.id('send.checkboxUA')).tap();
    await element(by.id('send.memo-field')).replaceText('it flew by\naryty\nblim');
    await element(by.id('send.button')).tap();

    const memo = element(by.id('send.confirm-memo'));

    log.info('Text:', memo.text);

    await expect(memo).toExist();
    await expect(memo).toBeVisible();
    await expect(memo).toHaveText(
      'Reply to: \nu1lx7nlnqqqs7p4hcqz4hyjgnw7h8zskcgr2f8dfhm96np0gnfdzu7jtms7q2pxd7ufy96wxzdsdy65jvp3td7fj2ltcz0jpak86ddyszl9ykn5s86q3xataya5867z3tj2x8cw0ljyrenymr2gcqmjf50gmexqj233yn3kdaxn2yukwcx87emurufakf82wapgnu5h3fvae6aw9uus2r',
    );
  });
});
