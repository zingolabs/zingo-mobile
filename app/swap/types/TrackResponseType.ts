/**
 * Wire-level shape of SwapKit `/track` response (note: `/track`, not `/v3/track`).
 *
 * `/track` is the canonical lifecycle endpoint. The poller calls it on every
 * tick (subject to dedupe + cadence rules in `SwapPoller`) and uses the
 * response to advance the corresponding `SwapRecord`.
 *
 * The response is provider-aware: SwapKit transparently routes the tracking
 * query to the underlying provider, then normalises the headline status fields
 * (`status`, `trackingStatus`) while leaving provider-specific details in
 * `legs[]` and `providerDetails`.
 *
 * Empirical (2026-06-29) shape of a leg, verified against Maya outbound,
 * NEAR Intents inbound, and Flashnet inbound mainnet swaps:
 * ```
 * {
 *   status: "completed" | "pending" | "not_started" | "swapping" | ...,
 *   trackingStatus: same vocabulary,
 *   chainId: "bitcoin" | "1" | "zcash" | "spark" | ...,
 *   hash: "<source or destination tx hash>",
 *   block: <int or -1>,
 *   type: "swap" | "native_send" | ...,
 *   fromAsset / fromAmount / fromAddress,
 *   toAsset   / toAmount   / toAddress,
 *   finalisedAt: <unix-seconds or -1>,
 *   meta: { provider, providerExplorerUrl?, ... },
 *   payload: { ... },
 * }
 * ```
 */
export type TrackLegType = {
  /** Provider-specific leg status string. */
  status?: string;
  /** Granular tracking status string (same vocabulary as top-level). */
  trackingStatus?: string;
  /** Chain identifier the leg occurs on. SwapKit emits `chainId` (NOT
   *  `chain` — earlier versions of this type used the wrong field name
   *  which broke `pickLegHash` silently for every provider). */
  chainId?: string;
  /** Tx hash on the relevant chain. SwapKit emits the field as `hash`
   *  (NOT `txHash`). Empty string when the leg has not landed yet. */
  hash?: string;
  /** Block height (when present), `-1` while unconfirmed. */
  block?: number;
  /** Leg semantic kind (`swap`, `native_send`, …). */
  type?: string;
  /** Source-side asset / amount / address for this specific leg. */
  fromAsset?: string;
  fromAmount?: string;
  fromAddress?: string;
  /** Destination-side asset / amount / address for this specific leg. */
  toAsset?: string;
  toAmount?: string;
  toAddress?: string;
  /** Unix seconds when this leg finalised (`-1` while in flight). */
  finalisedAt?: number;
  /** Per-leg provider/explorer metadata (e.g. `providerExplorerUrl`). */
  meta?: Record<string, unknown>;
  /** Anything else the provider injects (memos, calldata, …). */
  payload?: Record<string, unknown>;
};

export type TrackResponseType = {
  /** Top-level status, mapped to `SwapStatusEnum` in `SwapService`. */
  status?: string;
  /** Granular progress, mapped to `TrackingStatusEnum`. */
  trackingStatus?: string;
  /** Per-leg progress (one inbound, one swap, one outbound). */
  legs?: TrackLegType[];
  /** Asset shorthand for the source side (e.g. `"ETH.ETH"`). */
  fromAsset?: string;
  /** Source-side amount the provider observed, in display units string. */
  fromAmount?: string;
  /** Asset shorthand for the destination side (e.g. `"ZEC.ZEC"`). */
  toAsset?: string;
  /** Destination-side amount actually paid out, in display units string.
   *  Populated once the outbound leg lands; used to backfill
   *  `SwapRecord.actualReceiveAmount` so the History row can render the
   *  realised value rather than the quote-time estimate. */
  toAmount?: string;
  /** Provider-specific blob the executor narrows. */
  providerDetails?: Record<string, unknown>;
  /**
   * Top-level provider metadata. SwapKit ships a few useful fields here
   * including `providerExplorerUrl` (e.g. Flashnet's Orchestra
   * explorer), `provider` (canonical name string), and image URLs.
   */
  meta?: Record<string, unknown>;
  /** Refund-related fields, populated for refunded swaps. */
  refundDetails?: Record<string, unknown>;
  /** Free-form failure reason from the provider, when status is FAILED. */
  failureReason?: string;
  /** Anything else SwapKit returns we have not modelled. */
  [extra: string]: unknown;
};
