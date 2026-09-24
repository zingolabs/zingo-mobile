// The real SDK's CommonJS build requires `@noble/ed25519`, which ships ESM
// only, so loading it under jest throws before any test runs. Nothing in the
// suite wants a live name lookup anyway: the resolver is a network call.
//
// `resolveName` answers "no such name" by default. A test that needs a hit can
// override it:
//
//   import { ZNS } from 'zcashname-sdk';
//   ZNS.prototype.resolveName = jest.fn().mockResolvedValue({ address: 'u1...' });

class ZNS {
  constructor(options = {}) {
    this.network = options.network ?? 'testnet';
  }

  async resolveName() {
    return null;
  }
}

module.exports = { ZNS };
