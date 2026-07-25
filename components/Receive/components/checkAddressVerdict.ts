/**
 * The typed verdict of an address-ownership check (ADR 0002: errors are
 * types; the getZecPrice precedent).
 *
 * A verification screen must never present a failed check as a verdict —
 * a confident "this address does not belong to you" produced by a broken
 * reply is the worst answer this screen can give — so the failures carry
 * their own arms:
 * - `unattempted`: no check has run yet (the screen's initial state).
 * - `mine` / `notMine`: the backend answered with an actual boolean.
 * - `ffiRejection`: the typed error channel rejected.
 * - `malformed`: the payload is empty, unparseable, or carries no boolean
 *   `is_wallet_address` — the check produced no verdict at all.
 */
import {
  decodeFfiJson,
  FfiErrorCode,
  FfiResult,
} from '../../../app/walletBackend/ffi';

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
  const decoded = decodeFfiJson(result);
  switch (decoded.kind) {
    case 'ffiRejection':
      return decoded;
    case 'emptyPayload':
      return { kind: 'malformed', reason: 'empty payload' };
    case 'malformedPayload':
      return { kind: 'malformed', reason: decoded.detail };
    case 'json': {
      const parsed = decoded.value as { is_wallet_address?: unknown } | null;
      if (typeof parsed?.is_wallet_address !== 'boolean') {
        return { kind: 'malformed', reason: 'missing is_wallet_address' };
      }
      return parsed.is_wallet_address ? { kind: 'mine' } : { kind: 'notMine' };
    }
  }
}
