import {
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
      complete: true,
    });
    const status = seedStatus(seed.replace('art', 'arte'));
    expect(status).toMatchObject({ kind: 'seed', invalid: 1, complete: false });
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
