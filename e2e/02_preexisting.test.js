const { log, device, by, element } = require('detox');

describe('Example', () => {
  // i just pulled this seed out of thin air
  it('loads my test wallet', async () => {
    await element(by.id("loadingapp.restorewalletseed")).tap();
    await element(by.id("seed.seedplaceholder")).replaceText(
      'lottery multiply patient simple ivory leisure swift square west despair beauty match crowd margin reject box always title photo remind word diet ecology badge'
    );
    await element(by.id("birthdayinput")).replaceText('1994579');
    await element(by.text("RESTORE WALLET")).tap();
  });
  
  // there is a transaction in this plant at 1994580, 1 block after the "birthday". 
  it('synks 1 block and renders a transaction. this should take less than a minute, but will time out after 16 minutes', async () => {
    await waitFor(element(by.id("transactionList.1"))).toBeVisible().withTimeout(sync_timeout)
    await element(by.id("transactionList.1")).tap();
    // we will test various attributes of this transaction once we testID them
  });
  
  //  
  it('renders correct addresses', async () => {
    // difficult to add testID to the tab, working on it
  });
});
