import { isValidChainAddress } from '@app/swap/addressValidators';
import { extractPlainAddress } from '@app/swap/extractPlainAddress';

const segwit = [
  ['BTC', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'],
  ['BTC', 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3'],
  ['LTC', 'ltc1qhdhvrwe6rgqns8fz28tee0hphr5x7ulw5exv4w'],
  ['LTC', 'ltc1ppu2gv0tujus0f6eggrk7eqmaf0567x6zer4fcuhz4z7ztzq9u9yseqxltc'],
];

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
