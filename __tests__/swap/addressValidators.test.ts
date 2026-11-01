import {
  canonicalChainAddress,
  isValidChainAddress,
  nearAccountNeedsConfirm,
} from '@app/swap/addressValidators';
// Keyed by SwapKit's chain codes, so a contact's chain meets the catalog's.
describe("isValidChainAddress — SwapKit's chain codes", () => {
  const EVM = '0x1111111111111111111111111111111111111111';

  it('validates Tron under TRON and Gnosis under GNO', () => {
    expect(
      isValidChainAddress('TRON', 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'),
    ).toBe(true);
    expect(isValidChainAddress('TRON', 'not-a-tron-address')).toBe(false);
    expect(isValidChainAddress('GNO', EVM)).toBe(true);
  });

  it('validates the EVM chains that route ZEC and had no validator', () => {
    for (const chain of ['MONAD', 'HYPEREVM', 'ARC', 'HOOD', 'ADI', 'HYPE']) {
      expect(isValidChainAddress(chain, EVM)).toBe(true);
      expect(isValidChainAddress(chain, 'bc1qexample')).toBe(false);
    }
  });

  it('validates Starknet and Aleo, which have their own formats', () => {
    expect(isValidChainAddress('STRK', '0x' + 'a'.repeat(64))).toBe(true);
    expect(isValidChainAddress('STRK', EVM)).toBe(false);
    expect(isValidChainAddress('ALEO', 'aleo1' + 'q'.repeat(58))).toBe(true);
    expect(isValidChainAddress('ALEO', 'aleo1short')).toBe(false);
  });

  // Recognised only to be named when refused.
  it('recognises THORChain, Maya and Monero addresses', () => {
    expect(isValidChainAddress('THOR', 'thor1' + 'q'.repeat(38))).toBe(true);
    expect(isValidChainAddress('MAYA', 'maya1' + 'q'.repeat(38))).toBe(true);
    expect(isValidChainAddress('XMR', '4' + '8'.repeat(94))).toBe(true);
    expect(isValidChainAddress('XMR', '4short')).toBe(false);
  });
});

// BIP 173 and CashAddr allow an address in all uppercase, the form QR codes
// carry. SwapKit and the providers take the lowercase one.
describe('uppercase bech32 and CashAddr addresses', () => {
  const BTC = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
  const LTC = 'ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kgmn4n9';
  const CASES: ReadonlyArray<[string, string]> = [
    ['BTC', BTC],
    ['LTC', LTC],
    ['BCH', 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'],
    ['ATOM', 'cosmos1' + 'q'.repeat(38)],
    ['ADA', 'addr1' + 'q'.repeat(58)],
    ['ALEO', 'aleo1' + 'q'.repeat(58)],
    ['THOR', 'thor1' + 'q'.repeat(38)],
    ['MAYA', 'maya1' + 'q'.repeat(38)],
  ];

  it.each(CASES)(
    'validates a %s address in uppercase and lowercases it',
    (chain, address) => {
      const upper = address.toUpperCase();
      expect(isValidChainAddress(chain, upper)).toBe(true);
      expect(canonicalChainAddress(chain, ` ${upper} `)).toBe(address);
      expect(canonicalChainAddress(chain, address)).toBe(address);
    },
  );

  it('refuses mixed case', () => {
    const mixed = 'bc1QW508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
    expect(isValidChainAddress('BTC', mixed)).toBe(false);
    expect(canonicalChainAddress('BTC', mixed)).toBe(mixed);
  });

  it("only lowercases for the address's own chain", () => {
    expect(isValidChainAddress('LTC', BTC.toUpperCase())).toBe(false);
    expect(canonicalChainAddress('ETH', BTC.toUpperCase())).toBe(
      BTC.toUpperCase(),
    );
  });

  // Base58 and base32 are case-sensitive: lowercasing would change the address.
  it('leaves case-sensitive formats as they are', () => {
    const legacy = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const stellar = 'G' + 'A'.repeat(55);
    expect(canonicalChainAddress('BTC', legacy)).toBe(legacy);
    expect(canonicalChainAddress('XLM', stellar)).toBe(stellar);
    expect(isValidChainAddress('XLM', stellar)).toBe(true);
  });
});

// NEAR account IDs, in the docs.near.org format. Mainnet accounts checked with
// `view_account`: `aurora`, `tg` and the `0x85f1…` one exist.
describe('NEAR account IDs', () => {
  const IMPLICIT = 'a'.repeat(64);

  it.each([
    'zingo.near',
    'alice.tg',
    'aurora',
    'tg',
    '0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4',
    IMPLICIT,
    'a_b-c.near',
  ])('accepts %s', address => {
    expect(isValidChainAddress('NEAR', address)).toBe(true);
  });

  it.each([
    'a',
    'a--b.near',
    '-a.near',
    'a_.near',
    'a'.repeat(65),
    'alice.testnet',
    '0s' + 'a'.repeat(40),
    'Alice.near',
  ])('refuses %s', address => {
    expect(isValidChainAddress('NEAR', address)).toBe(false);
  });

  it('asks nothing for a form that can only be NEAR', () => {
    for (const address of [IMPLICIT, 'zingo.near', 'alice.tg']) {
      expect(nearAccountNeedsConfirm(address)).toBe(false);
    }
  });

  // Valid NEAR names that could be another chain's address, or a typo.
  it('asks for a name that could be something else', () => {
    for (const address of [
      'aurora',
      '0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4',
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      'alice.naer',
    ]) {
      expect(nearAccountNeedsConfirm(address)).toBe(true);
    }
  });

  it('asks nothing for what is not a NEAR account at all', () => {
    expect(nearAccountNeedsConfirm('Alice.near')).toBe(false);
  });
});
