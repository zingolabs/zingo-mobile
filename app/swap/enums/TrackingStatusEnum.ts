/**
 * Granular progress within the swap lifecycle.
 *
 * Mirrors the `trackingStatus` field of SwapKit's `/track` response. Used to
 * drive intermediate UI states (the progress bar / step timeline) inside a
 * `SwapStatusEnum.Pending` or `Processing` swap.
 *
 * Empirical sequence observed on a real NEAR Intents swap (2026-06-21):
 *   inbound (waiting for source-chain confirmations)
 *     → swapping (provider executing the swap)
 *       → completed (destination chain delivered)
 *
 * MAYAChain shows additional intermediate values when streaming swaps split
 * a large order across multiple sub-blocks; those are still surfaced under
 * `Swapping` for our UI.
 */
export enum TrackingStatusEnum {
  Inbound = 'inbound',
  Swapping = 'swapping',
  Completed = 'completed',
  Refunded = 'refunded',
  Failed = 'failed',
  Expired = 'expired',
}
