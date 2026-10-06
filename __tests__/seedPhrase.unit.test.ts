import {
  checksumValid,
  isViewingKey,
  resolveWord,
  seedStatus,
  suggestWords,
  tokenize,
} from '../app/utils/seedPhrase';

describe('suggestWords', () => {
  it('Tests that at most three list words starting with the prefix come back, in list order, when the prefix has matches. An exact word is the first entry.', () => {
    expect(suggestWords('act')).toEqual(['act', 'action', 'actor']);
    expect(suggestWords('zo')).toEqual(['zone', 'zoo']);
    expect(suggestWords('ACT', 1)).toEqual(['act']);
  });

  it('Tests that nothing comes back when the prefix is empty or matches no word.', () => {
    expect(suggestWords('')).toEqual([]);
    expect(suggestWords('xq')).toEqual([]);
  });
});

describe('resolveWord', () => {
  it('Tests that an exact word wins over a longer completion when both exist, and the first completion is used otherwise.', () => {
    expect(resolveWord('act')).toBe('act');
    expect(resolveWord('acti')).toBe('action');
    expect(resolveWord('zzz')).toBeNull();
  });
});

describe('seedStatus', () => {
  const seed =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

  it('Tests that a phrase of 24 list words is complete when every word is in the list, and that a word outside the list counts as invalid.', () => {
    expect(seedStatus(seed)).toEqual({
      kind: 'seed',
      words: tokenize(seed),
      invalid: 0,
      badChecksum: false,
      complete: true,
    });
    const status = seedStatus(seed.replace('art', 'arte'));
    expect(status).toMatchObject({ kind: 'seed', invalid: 1, complete: false });
  });

  it('Tests that 24 list words whose last word breaks the BIP-39 checksum are not complete and are flagged, when every word is in the list.', () => {
    const wrongLast = seed.replace(/art$/, 'abandon');
    expect(seedStatus(wrongLast)).toMatchObject({
      kind: 'seed',
      invalid: 0,
      badChecksum: true,
      complete: false,
    });
    expect(seedStatus(seed.replace('art', 'arte'))).toMatchObject({
      badChecksum: false,
    });
  });

  it('Tests that a uview prefix is classified as a viewing key whatever its case, and blank input is empty.', () => {
    expect(isViewingKey('UVIEW1abc')).toBe(true);
    expect(seedStatus(' uviewtest1abc ')).toEqual({
      kind: 'ufvk',
      key: 'uviewtest1abc',
    });
    expect(seedStatus('  ')).toEqual({ kind: 'empty' });
  });

  it('Tests that commas and line breaks split words the same as spaces when a phrase is pasted.', () => {
    expect(tokenize('Abandon, ability\nable  about')).toEqual([
      'abandon',
      'ability',
      'able',
      'about',
    ]);
  });
});

describe('checksumValid', () => {
  it('Tests that the BIP-39 reference phrases pass and a changed word fails, for 12 and 24 words.', () => {
    const twelve =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const twentyFour =
      'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote';
    expect(checksumValid(tokenize(twelve))).toBe(true);
    expect(checksumValid(tokenize(twentyFour))).toBe(true);
    expect(checksumValid(tokenize(twelve.replace(/about$/, 'above')))).toBe(
      false,
    );
    expect(checksumValid(tokenize(twentyFour.replace(/vote$/, 'zoo')))).toBe(
      false,
    );
  });

  it('Tests that a phrase of the wrong length or with a word outside the list is not valid.', () => {
    expect(checksumValid(tokenize('abandon about'))).toBe(false);
    expect(checksumValid(tokenize('abandon '.repeat(23) + 'xyz'))).toBe(false);
  });
});
