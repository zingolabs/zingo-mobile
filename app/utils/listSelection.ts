/**
 * Pure derivation of "which item of this list is designated, if any".
 *
 * Screens store a designated index as `number | null` next to the list it
 * points into (Receive's address lists, the address book's detail item),
 * and two facts make the raw pair treacherous: some writers encode an
 * *empty* list as index 0, and some encode "no item" as -1. A non-null
 * index therefore never proves an item exists. This function is total:
 * every (list, storedIndex) pair maps to exactly one named state.
 *
 * - `noSelection`: nothing is designated — the index is null, a negative
 *   sentinel, or points past the end of the current list. A stale index is
 *   deliberately NOT clamped: guessing a different item than the user
 *   chose (an edit sheet opening on the wrong contact) is worse than
 *   designating none.
 * - `empty`: an index is stored but the list has no items to designate.
 * - `selected`: `item` really is `list[index]`.
 */
export type ListSelection<A> =
  | { readonly kind: 'noSelection' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'selected'; readonly item: A; readonly index: number };

export function deriveListSelection<A>(
  list: A[],
  storedIndex: number | null,
): ListSelection<A> {
  if (storedIndex === null || storedIndex < 0) {
    return { kind: 'noSelection' };
  }
  if (list.length === 0) {
    return { kind: 'empty' };
  }
  if (storedIndex >= list.length) {
    return { kind: 'noSelection' };
  }
  return { kind: 'selected', item: list[storedIndex], index: storedIndex };
}
