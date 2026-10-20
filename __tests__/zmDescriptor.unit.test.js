import { descriptor } from '../scripts/zm_descriptor.mjs';

describe('descriptor', () => {
  // Tests that the release form omits the hash when a release tag points at HEAD.
  test('a release tag gives the release form', () => {
    expect(descriptor('zingo-2.0.24-320', '2.0.24', 'f3d1a', false)).toBe(
      'zm_2.0.24-320',
    );
  });

  // Tests that the package version and the hash name a build off any tag.
  test('no tag gives the version and the hash', () => {
    expect(descriptor('', '2.0.24', '8c2cf', false)).toBe('zm_2.0.24_8c2cf');
  });

  // Tests that a modified tree appends the dirty marker to either form.
  test('a modified tree appends dirty', () => {
    expect(descriptor('zingo-beta-2.0.23-335', '2.0.24', '', true)).toBe(
      'zm_beta-2.0.23-335_dirty',
    );
    expect(descriptor('', '2.0.24', '', true)).toBe('zm_2.0.24_dirty');
  });
});
