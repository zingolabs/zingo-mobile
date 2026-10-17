import { isValidChainAddress } from '@app/swap/addressValidators';
import { extractPlainAddress } from '@app/swap/extractPlainAddress';

const segwit = [
  ['BTC', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'],
  ['BTC', 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3'],
  ['LTC', 'ltc1qhdhvrwe6rgqns8fz28tee0hphr5x7ulw5exv4w'],
  ['LTC', 'ltc1ppu2gv0tujus0f6eggrk7eqmaf0567x6zer4fcuhz4z7ztzq9u9yseqxltc'],
];

const otherBech32 = [
  ['ATOM', 'cosmos1' + 'q'.repeat(38)],
  ['ADA', 'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w'],
  ['BCH', 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'],
  ['BCH', 'qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'],
  ['BCH', 'bitcoincash:ppm2qsznhks23z7629mms6s4cwef74vcwvn0h829pq'],
  ['BCH', 'ppm2qsznhks23z7629mms6s4cwef74vcwvn0h829pq'],
];

test.each(otherBech32)(
  'Tests that %s accepts an address when every letter has the same case: %s',
  (chain, address) => {
    expect(isValidChainAddress(chain, address)).toBe(true);
    expect(isValidChainAddress(chain, address.toUpperCase())).toBe(true);
  },
);

test.each(otherBech32)(
  'Tests that %s rejects an address when its letters have mixed case: %s',
  (chain, address) => {
    expect(
      isValidChainAddress(chain, address[0].toUpperCase() + address.slice(1)),
    ).toBe(false);
    expect(
      isValidChainAddress(
        chain,
        address.slice(0, 4) + address.slice(4).toUpperCase(),
      ),
    ).toBe(false);
  },
);

test.each(otherBech32)(
  'Tests that %s rejects an address when a colon appears inside its body: %s',
  (chain, address) => {
    expect(isValidChainAddress(chain, address.toUpperCase() + ':')).toBe(false);
  },
);

test('Tests that Bitcoin Cash accepts a legacy address when its Base58 letters have mixed case', () => {
  expect(isValidChainAddress('BCH', '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu')).toBe(
    true,
  );
});

test('Tests that Cardano accepts a Byron format when its Base58 letters have mixed case', () => {
  expect(isValidChainAddress('ADA', 'Ae2' + 'Ab3'.repeat(14))).toBe(true);
});

test.each(segwit)(
  'Tests that %s accepts a SegWit address when every letter is uppercase: %s',
  (chain, address) => {
    expect(isValidChainAddress(chain, address.toUpperCase())).toBe(true);
  },
);

test.each(segwit)(
  'Tests that %s accepts a SegWit address when every letter is lowercase: %s',
  (chain, address) => {
    expect(isValidChainAddress(chain, address)).toBe(true);
  },
);

test.each(segwit)(
  'Tests that %s rejects a SegWit address when the letters have mixed case: %s',
  (chain, address) => {
    expect(
      isValidChainAddress(chain, address[0].toUpperCase() + address.slice(1)),
    ).toBe(false);
    expect(
      isValidChainAddress(
        chain,
        address.slice(0, 4) + address.slice(4).toUpperCase(),
      ),
    ).toBe(false);
  },
);

test('Tests that a Bitcoin QR address validates when its payment URI contains uppercase letters', () => {
  const address = segwit[0][1].toUpperCase();
  const scanned = extractPlainAddress(`bitcoin:${address}?amount=0.1`);
  expect(scanned).toBe(address);
  expect(isValidChainAddress('BTC', scanned)).toBe(true);
});

test.each([
  ['BTC', '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'],
  ['LTC', 'LT2KVaAy1ppRuxRgrS5RNU3vBsy7RibPeA'],
])(
  'Tests that %s accepts a legacy address when its Base58 letters have mixed case: %s',
  (chain, address) => {
    expect(isValidChainAddress(chain, address)).toBe(true);
  },
);

test('Tests that Bitcoin rejects a Litecoin address when all letters are uppercase', () => {
  expect(isValidChainAddress('BTC', segwit[2][1].toUpperCase())).toBe(false);
});

test('Tests that Litecoin rejects a Bitcoin address when all letters are uppercase', () => {
  expect(isValidChainAddress('LTC', segwit[0][1].toUpperCase())).toBe(false);
});

test.each([segwit[0], segwit[3]])(
  'Tests that %s rejects a SegWit address when a Kelvin sign replaces an ASCII letter: %s',
  (chain, address) => {
    const unicode = address.toUpperCase().replace('K', '\u212a');
    expect(unicode).toContain('\u212a');
    expect(isValidChainAddress(chain, unicode)).toBe(false);
  },
);
