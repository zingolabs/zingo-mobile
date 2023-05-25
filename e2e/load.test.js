const { log, device, by, element } = require('detox');

import { loadTestWallet } from "./loadTestWallet.js";

describe('Renders wallet data correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
});
