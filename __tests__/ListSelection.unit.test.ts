/**
 * @format
 */

import { deriveListSelection } from '../app/utils/listSelection';

type Addr = { address: string };
const addrs = (...names: string[]): Addr[] =>
  names.map(address => ({ address }));

describe('deriveListSelection', () => {
  test('a null index designates nothing', () => {
    expect(deriveListSelection(addrs(), null)).toEqual({
      kind: 'noSelection',
    });
    expect(deriveListSelection(addrs('u1aaa'), null)).toEqual({
      kind: 'noSelection',
    });
  });

  // EVIDENCE of misinterpretation at Receive.tsx (doCopy and the NAT/EA
  // sheets): the populating effect encodes an *empty* filtered list as
  // index 0, and the read sites treated `index !== null` as proof an
  // address exists — so `tAddr[0].address` threw on an empty list. The
  // correct pattern (null check plus length check) already existed in
  // `currentAddress`; this function is its total, shared form.
  test('an empty list stored as index 0 is empty, not a selected item', () => {
    expect(deriveListSelection(addrs(), 0)).toEqual({ kind: 'empty' });
  });

  test('a valid index selects that item', () => {
    expect(deriveListSelection(addrs('u1aaa', 'u1bbb', 'u1ccc'), 2)).toEqual({
      kind: 'selected',
      item: { address: 'u1ccc' },
      index: 2,
    });
  });

  // AddressBook stores -1 for "Add-new mode, no real item" alongside null
  // for "sheet closed" — two sentinels for the same non-state. A negative
  // index must never designate an item.
  test('a negative sentinel designates nothing', () => {
    expect(deriveListSelection(addrs('u1aaa', 'u1bbb'), -1)).toEqual({
      kind: 'noSelection',
    });
  });

  // A stale index can outlive a list refresh. Deliberately NOT clamped:
  // presenting a different item than the user chose (an edit sheet opening
  // on the wrong contact) is worse than designating none.
  test('a stale index beyond the list designates nothing', () => {
    expect(deriveListSelection(addrs('u1aaa'), 5)).toEqual({
      kind: 'noSelection',
    });
  });
});
