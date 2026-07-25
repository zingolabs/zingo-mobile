/**
 * Pure derivation of the Receive screen's current-address state.
 *
 * The screen stores a `number | null` index per address list, where null
 * means the addresses effect has not run. The effect encodes an *empty*
 * list as index 0, so `storedIndex !== null` alone never proves an address
 * exists — the read sites that treated it that way could index into an
 * empty array. This function is total: every (list, index) pair maps to
 * exactly one named state, and a stale index (the effect rewrites indexes
 * only after a refreshed list lands) clamps into range instead of reading
 * out of bounds.
 */
export type AddressSelection<A> =
  | { kind: 'notLoaded' }
  | { kind: 'empty' }
  | { kind: 'selected'; address: A; index: number };

export function deriveAddressSelection<A>(
  list: A[],
  storedIndex: number | null,
): AddressSelection<A> {
  if (storedIndex === null) {
    return { kind: 'notLoaded' };
  }
  if (list.length === 0) {
    return { kind: 'empty' };
  }
  const index = Math.min(Math.max(storedIndex, 0), list.length - 1);
  return { kind: 'selected', address: list[index], index };
}
