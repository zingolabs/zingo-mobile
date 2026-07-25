/**
 * The typed verdict of an address-ownership check (ADR 0002: errors are
 * types; the getZecPrice precedent).
 *
 * The screen used to store `is_wallet_address` directly off `JSON.parse`
 * behind a `!== null` gate, so a payload missing the field stored
 * `undefined`, passed the gate, and rendered the definitive "this address
 * does not belong to you". A verification screen reporting a confident
 * false negative is the worst form this class of bug can take, so a
 * failed check gets its own arms and never reaches a verdict row:
 * - `unattempted`: the user has not run a check yet (initial state).
 * - `mine` / `notMine`: the backend answered with an actual boolean.
 * - `ffiRejection`: the typed error channel rejected.
 * - `malformed`: the payload is empty, unparseable, or carries no boolean
 *   `is_wallet_address` — the check produced no verdict at all.
 */
import { FfiErrorCode, FfiResult } from '../../../app/walletBackend/ffi';

export type CheckAddressVerdict =
  | { readonly kind: 'unattempted' }
  | { readonly kind: 'mine' }
  | { readonly kind: 'notMine' }
  | {
      readonly kind: 'ffiRejection';
      readonly code: FfiErrorCode;
      readonly message: string;
    }
  | { readonly kind: 'malformed'; readonly reason: string };

/**
 * Classifies a settled native result. Pure: the FfiResult is data, so the
 * whole boundary decision is testable without touching the bridge.
 *
 * Never returns `unattempted` — that arm belongs to the screen's initial
 * state, so the whole lifecycle lives in one type.
 */
export function interpretCheckAddressResult(
  result: FfiResult<string>,
): CheckAddressVerdict {
  if (!result.ok) {
    return {
      kind: 'ffiRejection',
      code: result.error.code,
      message: result.error.message,
    };
  }
  if (!result.value) {
    return { kind: 'malformed', reason: 'empty payload' };
  }
  let parsed: { is_wallet_address?: unknown };
  try {
    parsed = JSON.parse(result.value);
  } catch (error) {
    return { kind: 'malformed', reason: String(error) };
  }
  if (typeof parsed?.is_wallet_address !== 'boolean') {
    return { kind: 'malformed', reason: 'missing is_wallet_address' };
  }
  return parsed.is_wallet_address ? { kind: 'mine' } : { kind: 'notMine' };
}
