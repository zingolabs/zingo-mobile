import { loadTestWallet } from "./loadTestWallet.js";

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads my test wallet', loadTestWallet);
  
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
