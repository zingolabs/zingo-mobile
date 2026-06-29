import { SwapStatusEnum, isTerminalStatus } from '../enums/SwapStatusEnum';
import { SwapRecordType } from '../types/SwapRecordType';
import { TrackResponseType } from '../types/TrackResponseType';
import { mapSwapStatus, mapTrackingStatus } from './statusMapping';

/**
 * Default `/track` -> `SwapRecord` mutation shared by all provider executors.
 *
 * Most providers expose the same surface in SwapKit's normalised `/track`
 * response (top-level `status`, granular `trackingStatus`, `legs[]`). When an
 * executor has no provider-specific behaviour to add, it delegates here. When
 * it does, it can call this first to get the common mutations and then layer
 * provider-specific updates on top of the returned record.
 *
 * Behaviour:
 *   - Maps `status` and `trackingStatus` via the shared enum tables.
 *   - Picks inbound/outbound tx hashes from `legs[]`, preferring a match by
 *     `leg.chain` against the record's sell/receive chainIds. Falls back to a
 *     first-leg / last-leg heuristic when no leg carries a chain hint.
 *   - Stamps `firstObservedAtMs` on the first non-pre-broadcast observation
 *     and `terminalAtMs` on the transition into a terminal status.
 *   - Captures `failureReason` only when the new status is `Failed`.
 */
export function applyDefaultTrackUpdate(
  record: SwapRecordType,
  response: TrackResponseType,
): SwapRecordType {
  const nowMs = Date.now();
  // mapSwapStatus returns undefined for unrecognised inputs — preserve
  // the current record.status in that case rather than collapsing to a
  // generic "Unknown". See `mapSwapStatus` for the rationale.
  const nextStatus = mapSwapStatus(response.status) ?? record.status;
  const nextTrackingStatus = mapTrackingStatus(response.trackingStatus);

  // Prefer a fresh leg hash from the response. If absent, keep the
  // existing record value ONLY when it itself passes the realness check
  // — that scrubs placeholders (empty / all-zero) that older ticks of
  // this same poller may have persisted before `pickLegHash` started
  // filtering them. Real hashes already on the record are not at risk
  // because they always pass the filter.
  const observedDepositTxHash =
    pickLegHash(response, 'inbound', record.sellAsset.chainId) ??
    (isRealLegHash(record.observedDepositTxHash)
      ? record.observedDepositTxHash
      : undefined);
  const destinationTxHash =
    pickLegHash(response, 'outbound', record.receiveAsset.chainId) ??
    (isRealLegHash(record.destinationTxHash)
      ? record.destinationTxHash
      : undefined);
  // Provider's actually-realised payout in the destination asset, when
  // SwapKit has surfaced it. We accept whatever value is present (in
  // flight values are also valid — they reflect the running stream for
  // streaming swaps) and keep the most recent.
  const actualReceiveAmount =
    typeof response.toAmount === 'string' && response.toAmount.length > 0
      ? response.toAmount
      : record.actualReceiveAmount;

  // Some providers (Flashnet, others to come) ship a deep-link URL into
  // their own dashboard — strictly richer than the SwapKit explorer
  // because it surfaces provider-specific state. Look for it both at
  // the top-level `meta.providerExplorerUrl` and inside any leg's
  // `meta.providerExplorerUrl`, accepting the first non-empty value.
  // Persisted on the record so the Trackers sheet still has the link
  // available after the swap reaches a terminal state and we stop
  // polling.
  const providerExplorerUrl =
    pickProviderExplorerUrl(response) ?? record.providerExplorerUrl;

  const reachedTerminalNow =
    !isTerminalStatus(record.status) && isTerminalStatus(nextStatus);

  return {
    ...record,
    status: nextStatus,
    trackingStatus: nextTrackingStatus,
    observedDepositTxHash,
    destinationTxHash,
    actualReceiveAmount,
    providerExplorerUrl,
    failureReason:
      nextStatus === SwapStatusEnum.Failed
        ? (response.failureReason ?? record.failureReason)
        : record.failureReason,
    firstObservedAtMs: record.firstObservedAtMs ?? nowMs,
    terminalAtMs: reachedTerminalNow ? nowMs : record.terminalAtMs,
    updatedAtMs: nowMs,
  };
}

/**
 * Look for a provider-supplied explorer URL in the `/track` response.
 * SwapKit emits it under `meta.providerExplorerUrl` (top-level) for some
 * providers and inside `legs[i].meta.providerExplorerUrl` for others
 * (e.g. Flashnet ships it on the swap-leg meta). Return the first
 * non-empty string found, or `undefined` when none is present.
 */
function pickProviderExplorerUrl(
  response: TrackResponseType,
): string | undefined {
  const topLevel = (response.meta as { providerExplorerUrl?: unknown })
    ?.providerExplorerUrl;
  if (typeof topLevel === 'string' && topLevel.length > 0) return topLevel;
  if (response.legs) {
    for (const leg of response.legs) {
      const legUrl = (leg.meta as { providerExplorerUrl?: unknown })
        ?.providerExplorerUrl;
      if (typeof legUrl === 'string' && legUrl.length > 0) return legUrl;
    }
  }
  return undefined;
}

/**
 * Best-effort extraction of the source-chain (inbound) or destination-chain
 * (outbound) tx hash from a `/track` legs array.
 *
 * Strategy:
 *   1. If any leg carries a `chain` field that matches `targetChainId`
 *      (case-insensitive), use that leg's hash. This is the semantically
 *      correct path when SwapKit normalises `chain` consistently.
 *   2. Otherwise fall back to the positional heuristic — first leg for
 *      inbound, last leg for outbound — which has held empirically across the
 *      providers we have observed.
 *
 * Returns `undefined` when no legs are present.
 */
export function pickLegHash(
  response: TrackResponseType,
  role: 'inbound' | 'outbound',
  targetChainId: string,
): string | undefined {
  if (!response.legs || response.legs.length === 0) return undefined;

  // SwapKit emits the leg-level chain identifier as `chainId` and the tx
  // hash as `hash` (NOT `chain` / `txHash` — an earlier version of this
  // code used the wrong names and silently dropped every leg hash for
  // every provider). The check below treats empty strings AND the
  // all-zero placeholder (`0x0000…0000`, 66 chars) as "not yet landed"
  // so we never persist a sentinel that would show up as a dead
  // block-explorer link in the Trackers sheet.
  const target = targetChainId.toLowerCase();
  const matched = response.legs.find(
    leg => leg.chainId !== undefined && leg.chainId.toLowerCase() === target,
  );
  if (isRealLegHash(matched?.hash)) return matched!.hash;

  const fallback =
    role === 'inbound'
      ? response.legs[0]
      : response.legs[response.legs.length - 1];
  if (isRealLegHash(fallback?.hash)) return fallback!.hash;
  return undefined;
}

/**
 * Whether a leg hash represents a real on-chain transaction rather than
 * SwapKit's "not yet landed" placeholder. Exported so the SwapDetail
 * Trackers sheet can apply the same filter when rendering rows from a
 * record persisted before this guard existed.
 */
export function isRealLegHash(hash: string | undefined): hash is string {
  if (!hash || hash.length === 0) return false;
  // SwapKit's placeholder for "leg not yet landed" is the zero-byte hash
  // serialised as either bare zeros or `0x`-prefixed zeros. Reject both.
  const stripped = hash.startsWith('0x') ? hash.slice(2) : hash;
  return !/^0+$/.test(stripped);
}
