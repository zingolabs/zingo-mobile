const { log, by, element } = require('detox');

import { loadTestnetWallet } from "./loadTestnetWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('...', () => {
  // i just pulled this seed out of thin air
  it('loads a testnet wallet', loadTestnetWallet);
});
