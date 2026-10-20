import { BIP39_ENGLISH } from '../app/utils/bip39English';

describe('BIP39_ENGLISH', () => {
  it('Tests that the list holds the 2048 canonical words in order when loaded. The first four letters of every word are unique, as the standard requires.', () => {
    expect(BIP39_ENGLISH).toHaveLength(2048);
    expect(BIP39_ENGLISH[0]).toBe('abandon');
    expect(BIP39_ENGLISH[2047]).toBe('zoo');
    expect([...BIP39_ENGLISH].sort()).toEqual(BIP39_ENGLISH);
    const prefixes = new Set(BIP39_ENGLISH.map(w => w.slice(0, 4)));
    expect(prefixes.size).toBe(2048);
  });
});
