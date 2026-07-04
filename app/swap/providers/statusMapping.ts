import { SwapStatusEnum } from '../enums/SwapStatusEnum';
import { TrackingStatusEnum } from '../enums/TrackingStatusEnum';

/**
 * Shared helpers that map raw `/track` status strings to our enums.
 *
 * SwapKit normalises the top-level `status` field (uppercase, snake-case-ish)
 * and the granular `trackingStatus` (lowercase phase name) across providers.
 * Most providers feed the same vocabulary, so a shared table covers them.
 * Provider executors can branch further on `legs[]` or `providerDetails` when
 * they need finer-grained progress, but the headline mapping below is the
 * default starting point.
 *
 * Unrecognised values return `undefined` so the caller can preserve the
 * record's existing status instead of demoting it to a vague "Unknown".
 * The only case that maps explicitly to `ProviderStatusUnknown` is when
 * SwapKit itself emits `"unknown"` — that is provider-confirmed ignorance,
 * worth surfacing as distinct from "in-flight, waiting for next probe".
 */

export function mapSwapStatus(
  raw: string | undefined,
): SwapStatusEnum | undefined {
  if (!raw) return undefined;
  switch (raw.toUpperCase()) {
    case 'PENDING':
      return SwapStatusEnum.Pending;
    // SwapKit's docs enumerate `swapping` as the active mid-flight state
    // for cross-chain swaps; the underlying tracker uses it whenever the
    // provider is actively moving funds (Maya stream cycles, NEAR
    // intent settlement, …). Mapping it to `Processing` is the right
    // semantic equivalent — without this entry the poller used to fall
    // through to `ProviderStatusUnknown` and demote completed-but-still-
    // streaming records to "Unknown" while they were actually advancing.
    case 'PROCESSING':
    case 'IN_PROGRESS':
    case 'SWAPPING':
    case 'STREAMING':
      return SwapStatusEnum.Processing;
    case 'COMPLETED':
    case 'SUCCESS':
      return SwapStatusEnum.Completed;
    case 'REFUNDED':
      return SwapStatusEnum.Refunded;
    case 'FAILED':
    case 'ERROR':
      return SwapStatusEnum.Failed;
    case 'EXPIRED':
      return SwapStatusEnum.Expired;
    case 'INCOMPLETE_DEPOSIT':
    case 'INCOMPLETE':
      return SwapStatusEnum.IncompleteDeposit;
    case 'UNKNOWN':
      // SwapKit-confirmed ignorance: keep the dedicated enum so the
      // SwapDetail screen renders "Provider status unknown" rather than
      // pretending we know better.
      return SwapStatusEnum.ProviderStatusUnknown;
    case 'NOT_STARTED':
    default:
      // Preserve whatever pre-existing status the record already has.
      // This covers the (legitimate) "not started" pre-payment phase
      // and the (defensive) "SwapKit added a new status we have not
      // mapped yet" case. The caller falls back to `record.status`.
      return undefined;
  }
}

export function mapTrackingStatus(
  raw: string | undefined,
): TrackingStatusEnum | undefined {
  if (!raw) return undefined;
  switch (raw.toLowerCase()) {
    case 'inbound':
      return TrackingStatusEnum.Inbound;
    case 'swapping':
      return TrackingStatusEnum.Swapping;
    case 'completed':
      return TrackingStatusEnum.Completed;
    case 'refunded':
      return TrackingStatusEnum.Refunded;
    case 'failed':
      return TrackingStatusEnum.Failed;
    case 'expired':
      return TrackingStatusEnum.Expired;
    default:
      return undefined;
  }
}
