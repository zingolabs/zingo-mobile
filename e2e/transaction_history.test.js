const { log, device, by, element } = require('detox');

import { loadTestWallet } from "./e2e-utils/loadTestWallet.js";

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  
  // there is a ValueTransfer in this plant at 1994580, 1 block after the "birthday". 
  it('synks 1 block and renders a ValueTransfer. this should take less than a minute, but will time out after 16 minutes', async () => {
    await waitFor(element(by.id("ValueTransferList.1"))).toBeVisible().withTimeout(sync_timeout)
    await element(by.id("ValueTransferList.1")).tap();
    // we will test various attributes of this ValueTransfer once we testID them
  });
});
