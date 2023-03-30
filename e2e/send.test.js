const { log, device, by, element } = require('detox');

import { loadTestWallet } from "./loadTestWallet.js";

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  
  xit('Checkbox send screen -> include UA in memo field', async () => {
    await element(by.text('SEND')).tap();
    
    await element(by.id('send.scan-button')).tap();
    await expect(element(by.id('send.scan.cancel'))).toBeVisible();
    await element(by.id('send.scan.cancel')).tap();
    
    await element(by.id('send.addressplaceholder')).replaceText(
      'u1lx7nlnqqqs7p4hcqz4hyjgnw7h8zskcgr2f8dfhm96np0gnfdzu7jtms7q2pxd7ufy96wxzdsdy65jvp3td7fj2ltcz0jpak86ddyszl9ykn5s86q3xataya5867z3tj2x8cw0ljyrenymr2gcqmjf50gmexqj233yn3kdaxn2yukwcx87emurufakf82wapgnu5h3fvae6aw9uus2r',
    );
    await element(by.id('send.amount')).replaceText('0');
    await element(by.id('send.checkboxUA')).tap();
    await element(by.id('send.button')).tap();

    const memo = element(by.id('send.confirm-memo'));

    await expect(memo).toBeVisible();
    await expect(memo).toHaveText(
      'Reply to: \nu1lx7nlnqqqs7p4hcqz4hyjgnw7h8zskcgr2f8dfhm96np0gnfdzu7jtms7q2pxd7ufy96wxzdsdy65jvp3td7fj2ltcz0jpak86ddyszl9ykn5s86q3xataya5867z3tj2x8cw0ljyrenymr2gcqmjf50gmexqj233yn3kdaxn2yukwcx87emurufakf82wapgnu5h3fvae6aw9uus2r',
    );
  });
});
