/**
 * The typed outcome of fetching the wallet's secret material (ADR 0002:
 * errors are types; the getZecPrice / sendFailureTransform precedent).
 *
 * `fetchWallet` answered a bare `null` for four genuinely different
 * failures and, worse, answered a truthy `{} as WalletType` when the
 * payload parsed but carried no key material — so a caller's `if (wallet)`
 * could not tell a real backup from an empty object. Each arm here is
 * grounded in a distinct producer:
 * - `complete`: the payload carried the key material this mode asked for.
 * - `ffiRejection`: the typed error channel rejected; `code` names the
 *   ZingolibError variant.
 * - `emptyPayload`: the bridge resolved with nothing at all.
 * - `malformedPayload`: the resolution is not parseable JSON.
 * - `missingKeyMaterial`: well-formed JSON with no seed (or no ufvk in
 *   read-only mode) — the wallet exists but has nothing to back up.
 */
import { WalletType } from '../../AppState';
import { FfiErrorCode, FfiResult } from '../ffi';

export type WalletFetchOutcome =
  | { readonly kind: 'complete'; readonly wallet: WalletType }
  | {
      readonly kind: 'ffiRejection';
      readonly code: FfiErrorCode;
      readonly message: string;
    }
  | { readonly kind: 'emptyPayload' }
  | {
      readonly kind: 'malformedPayload';
      readonly payload: string;
      readonly detail: string;
    }
  | { readonly kind: 'missingKeyMaterial'; readonly payload: string };

/**
 * One handler per [`WalletFetchOutcome`] arm, each receiving its narrowed
 * variant. Exhaustive by construction: a new arm fails compilation at every
 * handler record until the consumer decides what that arm means for it.
 */
export type WalletFetchOutcomeHandlers<R> = {
  [K in WalletFetchOutcome['kind']]: (
    outcome: Extract<WalletFetchOutcome, { kind: K }>,
  ) => R;
};

export function matchWalletFetchOutcome<R>(
  outcome: WalletFetchOutcome,
  handlers: WalletFetchOutcomeHandlers<R>,
): R {
  return (handlers[outcome.kind] as (o: WalletFetchOutcome) => R)(outcome);
}

/**
 * Classifies a settled native result. Pure: the FfiResult is data, so the
 * whole boundary decision is testable without touching the bridge.
 *
 * `readOnly` selects which key material the mode requires — a ufvk for
 * viewing-key wallets, a seed phrase otherwise.
 */
export function interpretWalletFetchResult(
  result: FfiResult<string>,
  readOnly: boolean,
): WalletFetchOutcome {
  if (!result.ok) {
    return {
      kind: 'ffiRejection',
      code: result.error.code,
      message: result.error.message,
    };
  }
  if (!result.value) {
    return { kind: 'emptyPayload' };
  }
  let parsed: { seed_phrase?: unknown; ufvk?: unknown; birthday?: unknown };
  try {
    parsed = JSON.parse(result.value);
  } catch (error) {
    return {
      kind: 'malformedPayload',
      payload: result.value,
      detail: String(error),
    };
  }
  const key = readOnly ? parsed?.ufvk : parsed?.seed_phrase;
  if (typeof key !== 'string' || key.length === 0) {
    return { kind: 'missingKeyMaterial', payload: result.value };
  }
  // A birthday of 0 (genesis, e.g. regtest wallets) is a real height; only a
  // missing or non-numeric field falls back to it.
  const birthday = typeof parsed.birthday === 'number' ? parsed.birthday : 0;
  const wallet: WalletType = readOnly
    ? { ufvk: key, birthday }
    : { seed: key, birthday };
  return { kind: 'complete', wallet };
}
