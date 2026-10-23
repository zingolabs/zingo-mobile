import {
  isValidChainAddress,
  nearAccountNeedsConfirm,
} from '@app/swap/addressValidators';

const accepted = [
  ['an Ethereum-like account', '0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4'],
  ['a subaccount of tg', 'alice.tg'],
  ['a top-level account', 'aurora'],
  [
    'an implicit account',
    '98793cd91a3f870fb126f66285808c7e094afcfc4eda8a970f6648cdf0dbd6de',
  ],
  ['a named account under near', 'zingo_test-1.near'],
  ['64 characters long', 'a'.repeat(59) + '.near'],
];

const rejected = [
  ['it has two separators in a row', 'a--b.near'],
  ['it starts with a separator', '-a.near'],
  ['a separator ends a part', 'a_.near'],
  ['it is 65 characters long', 'a'.repeat(60) + '.near'],
  ['it is one character long', 'a'],
  ['it has an uppercase letter', 'Alice.near'],
  ['it is a deterministic account', '0s' + '8'.repeat(40)],
  ['it is a testnet name', 'alice.testnet'],
];

test.each(accepted)(
  'Tests that NEAR accepts an account ID when it is %s: %s',
  (_kind, address) => {
    expect(isValidChainAddress('NEAR', address)).toBe(true);
  },
);

test.each(rejected)(
  'Tests that NEAR rejects an account ID when %s: %s',
  (_condition, address) => {
    expect(isValidChainAddress('NEAR', address)).toBe(false);
  },
);

const noConfirm = [
  [
    'an implicit account',
    '98793cd91a3f870fb126f66285808c7e094afcfc4eda8a970f6648cdf0dbd6de',
  ],
  ['a named account under near', 'zingo_test-1.near'],
  ['a subaccount of tg', 'alice.tg'],
];

const needsConfirm = [
  ['an Ethereum-like account', '0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4'],
  ['a top-level account', 'aurora'],
  ['a misspelled near suffix', 'alice.naer'],
  ['a lowercase Bitcoin address', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'],
  ['a Zcash TEX address', 'tex1s2rt77ggv6q989lr49rkgzmh5slsksa9khdgte'],
];

const malformed = [
  ['it has two separators in a row', 'a--b.near'],
  ['it is a deterministic account', '0s' + '8'.repeat(40)],
  ['it is a testnet name', 'alice.testnet'],
];

test.each(noConfirm)(
  'Tests that a NEAR account skips the confirm step when it is %s: %s',
  (_kind, address) => {
    expect(nearAccountNeedsConfirm(address)).toBe(false);
  },
);

test.each(needsConfirm)(
  'Tests that a NEAR account needs the confirm step when it is %s: %s',
  (_kind, address) => {
    expect(isValidChainAddress('NEAR', address)).toBe(true);
    expect(nearAccountNeedsConfirm(address)).toBe(true);
  },
);

test.each(malformed)(
  'Tests that the confirm check is false when %s: %s',
  (_condition, address) => {
    expect(nearAccountNeedsConfirm(address)).toBe(false);
  },
);
