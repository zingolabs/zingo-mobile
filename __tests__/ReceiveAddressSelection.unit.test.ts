/**
 * @format
 */

import { deriveAddressSelection } from '../components/Receive/addressSelection';

type Addr = { address: string };
const addrs = (...names: string[]): Addr[] =>
  names.map(address => ({ address }));

describe('deriveAddressSelection', () => {
  test('before the addresses effect has run there is no selection', () => {
    expect(deriveAddressSelection(addrs(), null)).toEqual({
      kind: 'notLoaded',
    });
    expect(deriveAddressSelection(addrs('u1aaa'), null)).toEqual({
      kind: 'notLoaded',
    });
  });

  // EVIDENCE of misinterpretation at Receive.tsx:377-381, 618-623, 651-656:
  // the populating effect (Receive.tsx:276-277) encodes an *empty* filtered
  // list as index 0, and the six read sites treat `index !== null` as proof
  // an address exists — so `tAddr[0].address` throws on an empty list. The
  // correct pattern (null check plus length check) already exists at
  // Receive.tsx:392,404; this function is its total, reusable form.
  test('an empty list stored as index 0 is empty, not a selected address', () => {
    expect(deriveAddressSelection(addrs(), 0)).toEqual({ kind: 'empty' });
  });

  test('a valid index selects that address', () => {
    expect(deriveAddressSelection(addrs('u1aaa', 'u1bbb', 'u1ccc'), 2)).toEqual(
      {
        kind: 'selected',
        address: { address: 'u1ccc' },
        index: 2,
      },
    );
  });

  // A stale index can outlive an addresses refresh (the effect rewrites
  // indexes only after the new list lands). Clamping keeps the selection
  // total instead of reproducing the out-of-range read.
  test('a stale index beyond the list clamps to the last address', () => {
    expect(deriveAddressSelection(addrs('u1aaa'), 5)).toEqual({
      kind: 'selected',
      address: { address: 'u1aaa' },
      index: 0,
    });
  });

  test('a negative index clamps to the first address', () => {
    expect(deriveAddressSelection(addrs('u1aaa', 'u1bbb'), -1)).toEqual({
      kind: 'selected',
      address: { address: 'u1aaa' },
      index: 0,
    });
  });
});
