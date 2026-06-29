/**
 * High-level swap lifecycle status.
 *
 * Mirrors the top-level `status` field of SwapKit's `/track` response and is
 * the value driven by user-facing screens (badges, colours, terminal vs
 * non-terminal handling).
 *
 * The granular per-stage progress is carried separately by `TrackingStatusEnum`
 * (e.g. inbound → swapping → completed within `status: pending`).
 *
 * `PendingDeposit` and `AwaitingExternalDeposit` are added by us to cover
 * lifecycle states that exist before SwapKit can observe the swap:
 *   - `PendingDeposit`: outbound swap, our ZEC tx has not yet been broadcast
 *   - `AwaitingExternalDeposit`: inbound swap, waiting for the user to send
 *     the source asset from an external wallet (no on-chain evidence yet)
 *
 * `IncompleteDeposit` covers the case where the user sent less than the
 * route's quoted minimum. The provider has registered the deposit but is
 * NOT going to swap it — instead it will either (a) refund the funds and
 * transition the record to `Refunded`, or (b) wait for an additional
 * top-up deposit (rare; provider-dependent). Either way the state is
 * **transitional**, never terminal — the swap WILL move on, the user
 * just hasn't lost the funds permanently. Treat the UX accordingly: show
 * a warning, not a final-failure red.
 */
export enum SwapStatusEnum {
  // Local-only pre-broadcast / pre-evidence states
  PendingDeposit = 'PENDING_DEPOSIT',
  AwaitingExternalDeposit = 'AWAITING_EXTERNAL_DEPOSIT',

  // Maps from SwapKit `/track` `status`
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  ProviderStatusUnknown = 'PROVIDER_STATUS_UNKNOWN',
  IncompleteDeposit = 'INCOMPLETE_DEPOSIT',
  Completed = 'COMPLETED',
  Refunded = 'REFUNDED',
  Failed = 'FAILED',
  Expired = 'EXPIRED',
}

/** Returns true for statuses where no further state change is expected.
 *  `IncompleteDeposit` is deliberately excluded — the provider has the
 *  funds and WILL either refund (→ `Refunded`) or top-up complete
 *  (→ `Completed`). Treating it as terminal here would make the history
 *  row stop polling and leave the user with a half-finished swap that
 *  the poller refuses to advance. */
export function isTerminalStatus(status: SwapStatusEnum): boolean {
  return (
    status === SwapStatusEnum.Completed ||
    status === SwapStatusEnum.Refunded ||
    status === SwapStatusEnum.Failed ||
    status === SwapStatusEnum.Expired
  );
}
