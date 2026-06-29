/**
 * Wire-level shape of SwapKit `/v3/swap` response.
 *
 * Like `QuoteResponseType`, we only model the fields each provider executor
 * actually consumes when extracting deposit instructions. The interesting
 * payload lives in `tx` (memo + vault address for Maya/THORChain), `transient`
 * (NEAR-style channel ids, SwapKit-internal swap id), and `inboundAddress`.
 *
 * Empirical shapes per provider were captured during 2026-06-21/22 mainnet
 * testing. See `app/swap/providers/<Provider>Executor.ts` for the per-provider
 * parsing.
 */
export type SwapTxType = {
  /** Inbound vault / deposit address. */
  to?: string;
  /** Memo bytes / string. For ZEC outbound this becomes the OP_RETURN payload. */
  memo?: string;
  /** Provider-supplied PSBT or pre-signed payload. Ignored by zingolib (Path B). */
  data?: string;
  /** Amount the user must deposit (display units, string-encoded). */
  value?: string;
  /** Source-chain identifier as accepted by SwapKit (`"zcash"` for ZEC). */
  chainId?: string;
};

export type SwapTransientType = {
  /** SwapKit-internal swap identifier (e.g. NEAR-style `swapKitDepositChannelId`). */
  swapId?: string;
  /** Provider-specific channel id (Chainflip, NEAR). */
  depositChannelId?: string;
  /** Nested provider details we pluck per-executor. */
  providerDetails?: Record<string, unknown>;
};

export type SwapResponseType = {
  /** Echo of the quote id we requested. */
  quoteId?: string;
  /** Inbound vault address (also present on `tx.to`). */
  inboundAddress?: string;
  /** Transaction-construction payload. */
  tx?: SwapTxType;
  /** SwapKit-internal transient state. */
  transient?: SwapTransientType;
  /** Streaming meta (Maya). */
  meta?: { streamingInterval?: number; maxStreamingQuantity?: number } & Record<
    string,
    unknown
  >;
  /** Anything else SwapKit returns we have not modelled. */
  [extra: string]: unknown;
};
