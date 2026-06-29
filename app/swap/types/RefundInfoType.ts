/**
 * Provider-supplied details about a refunded swap.
 *
 * Populated by a provider's executor when `/track` returns a refunded leg or
 * a refund-related event. The fields are intentionally optional and string-
 * typed because each provider exposes a different shape; this is the display
 * surface, not a parser.
 *
 * Where the executor cannot determine a value, the field is left undefined
 * and the UI falls back to a generic message.
 */
export type RefundInfoType = {
  /** Minimum deposit the provider would have accepted (human-decimal). */
  minDepositText?: string;
  /** Fee deducted from the refund amount, if any (human-decimal). */
  refundFeeText?: string;
  /** Amount the user actually deposited (human-decimal). */
  depositedAmountText?: string;
  /** Amount returned to the user (human-decimal). */
  refundedAmountText?: string;
  /** Free-form provider-supplied reason (may be empty). */
  refundReason?: string;
  /** Transaction hash of the refund on the source chain, if known. */
  refundTxHash?: string;
};
