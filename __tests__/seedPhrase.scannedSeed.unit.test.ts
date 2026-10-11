import { scannedSeedPhrase } from '@app/utils/seedPhrase';

const WORDS = [...Array(23).fill('abandon'), 'art'];
const PHRASE = WORDS.join(' ');

test('Tests that a scanned 24-word phrase with a valid checksum is taken', () => {
  expect(scannedSeedPhrase(PHRASE)).toEqual({
    words: WORDS,
    birthday: undefined,
  });
});

test('Tests that a birthday after the words, as Zingo copies it, comes along', () => {
  expect(scannedSeedPhrase(`${PHRASE}\nBirthday: 2850000`)).toEqual({
    words: WORDS,
    birthday: 2850000,
  });
  expect(scannedSeedPhrase(`${PHRASE} 2850000`)?.birthday).toBe(2850000);
});

test('Tests that other text is not taken for a seed phrase', () => {
  expect(
    scannedSeedPhrase([...Array(24).fill('abandon')].join(' ')),
  ).toBeNull();
  expect(scannedSeedPhrase(WORDS.slice(0, 12).join(' '))).toBeNull();
  expect(scannedSeedPhrase('uview1qqqq')).toBeNull();
  expect(scannedSeedPhrase('zcash:u1abc')).toBeNull();
});
