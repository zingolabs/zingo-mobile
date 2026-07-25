/**
 * The typed outcome of fetching the wallet's secret material (ADR 0002:
 * errors are types; the getZecPrice / sendFailureTransform precedent).
 *
 * The transport arms come from [`decodeFfiJson`]; the arms owned here are
 * the domain answers:
 * - `complete`: the payload carried the key material the mode asked for.
 * - `missingKeyMaterial`: well-formed JSON with no seed (or no ufvk in
 *   read-only mode) — the wallet answered, but there is nothing to back
 *   up, and no caller may treat that as a wallet.
 */
import { WalletType } from '../../AppState';
import { decodeFfiJson, FfiErrorCode, FfiResult } from '../ffi';

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
  const decoded = decodeFfiJson(result);
  if (decoded.kind !== 'json') {
    return decoded;
  }
  const parsed = decoded.value as {
    seed_phrase?: unknown;
    ufvk?: unknown;
    birthday?: unknown;
  } | null;
  const key = readOnly ? parsed?.ufvk : parsed?.seed_phrase;
  if (typeof key !== 'string' || key.length === 0) {
    return { kind: 'missingKeyMaterial', payload: decoded.raw };
  }
  // A birthday of 0 (genesis, e.g. regtest wallets) is a real height; only a
  // missing or non-numeric field falls back to it.
  const birthday = typeof parsed?.birthday === 'number' ? parsed.birthday : 0;
  const wallet: WalletType = readOnly
    ? { ufvk: key, birthday }
    : { seed: key, birthday };
  return { kind: 'complete', wallet };
}
