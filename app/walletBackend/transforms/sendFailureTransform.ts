import { ErrorKeyed, errorKeyed } from '@app/AppState/types/Result';
import type { FfiError } from '@app/walletBackend/ffi';
import type { SendRefusalKey } from './sendPermit';

/**
 * Why a confirmed send failed, enumerated over the real error families the
 * send path produces, as a compile-time-enforced classification.
 *
 * The legacy classifier (`interceptCustomError`) returned
 * `string | undefined`, and `undefined` collapsed three genuinely different
 * states — a fail-closed mixnet refusal, an internal bridge failure, and an
 * actual server fault — into one "presume server, switch and retry" bucket.
 * This enumeration keeps every real family distinct, and
 * [`retryOnAnotherServer`] makes the routing decision explicit and
 * exhaustive instead of hanging it off a string's truthiness.
 *
 * The families, each grounded in an error the path really produces:
 * - `duplicateNullifier`: the node's reject code 18 family — the wallet
 *   tried to double-spend a nullifier, usually a stale-state symptom.
 * - `dust`: the node's reject code 64 — an output below the dust floor.
 * - `mixnetRefusal`: the wallet's own fail-closed Mixnet Mode verdict (the
 *   proxy bootstrapping or died); never a server problem.
 * - `internalRpcFailure`: the native bridge produced no payload
 *   ("Internal RPC Error: propose" / "confirm") — the channel itself failed.
 * - `serverSuspect`: everything else, the historical presumption the
 *   switch-server-and-retry machinery acts on.
 */
export type SendFailureClass =
  | { readonly kind: 'duplicateNullifier'; readonly error: string }
  | { readonly kind: 'dust'; readonly error: string }
  | { readonly kind: 'mixnetRefusal'; readonly error: string }
  | { readonly kind: 'internalRpcFailure'; readonly error: string }
  | { readonly kind: 'serverSuspect'; readonly error: string };

const DUPLICATE_NULLIFIER_MARKERS = [
  '18: bad-txns-sapling-duplicate-nullifier',
  '18: bad-txns-sprout-duplicate-nullifier',
  '18: bad-txns-orchard-duplicate-nullifier',
] as const;

/** Both fail-closed refusal texts carry this phrase, and builds before the `Mixnet` variant wrapped them under other variants. */
const MIXNET_REFUSAL_MARKER = 'Nym mixnet';

/** The TransactionService's fabricated no-payload errors carry this phrase. */
const INTERNAL_RPC_MARKER = 'Internal RPC Error';

/** Classifies a send rejection by its variant and its message; every rejection lands in exactly one arm. */
export function classifySendFailure({
  code,
  message: error,
}: FfiError): SendFailureClass {
  if (DUPLICATE_NULLIFIER_MARKERS.some(marker => error.includes(marker))) {
    return { kind: 'duplicateNullifier', error };
  }
  if (error.includes('64: dust')) {
    return { kind: 'dust', error };
  }
  if (code === 'Mixnet' || error.includes(MIXNET_REFUSAL_MARKER)) {
    return { kind: 'mixnetRefusal', error };
  }
  if (error.includes(INTERNAL_RPC_MARKER)) {
    return { kind: 'internalRpcFailure', error };
  }
  return { kind: 'serverSuspect', error };
}

/**
 * Whether switching to another server and retrying can plausibly help.
 * Exhaustive over the enumeration, so adding a family forces this decision.
 *
 * `internalRpcFailure` keeps its historical `true`: the legacy classifier
 * retried it (as part of the `undefined` bucket), and revising that routing
 * is a behavior change outside this refactor's scope — the enumeration makes
 * the state visible so revising it later is one switch arm.
 */
export function retryOnAnotherServer(failure: SendFailureClass): boolean {
  switch (failure.kind) {
    case 'serverSuspect':
    case 'internalRpcFailure':
      return true;
    case 'duplicateNullifier':
    case 'dust':
    case 'mixnetRefusal':
      return false;
  }
}

/**
 * What the failed screen shows for a classified failure.
 */
export type SendFailureText =
  | ErrorKeyed<
      'send.duplicate-nullifier-error' | 'send.dust-error' | SendRefusalKey
    >
  | { readonly kind: 'verbatim'; readonly text: string };

/**
 * Map a classified failure to its display directive — the one place
 * presentation meets classification.
 */
export function sendFailureText(failure: SendFailureClass): SendFailureText {
  switch (failure.kind) {
    case 'duplicateNullifier':
      return errorKeyed('send.duplicate-nullifier-error');
    case 'dust':
      return errorKeyed('send.dust-error');
    case 'mixnetRefusal':
    case 'internalRpcFailure':
    case 'serverSuspect':
      return { kind: 'verbatim', text: failure.error };
  }
}
