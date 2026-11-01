/**
 * Wire-level shape of SwapKit `/v3/quote` response.
 *
 * Only the fields we actively consume are typed. The full response is much
 * larger and contains forward-compatible provider-specific blobs; rather than
 * over-model what we do not read, we keep an `unknown`-typed catch-all so the
 * raw payload can still be inspected by debug screens or future executors.
 *
 * The response contains an array of `routes` (one per provider that could
 * fulfil the swap). The route chooser projects each entry to `RouteOptionType`
 * before showing it to the user.
 *
 * Field naming mirrors SwapKit (lowerCamelCase). Do not rename without a server
 * change.
 */
export type QuoteRouteAssetType = {
  /** SwapKit `<chain>.<symbol>[-<contract>]` identifier. */
  asset: string;
  /** USD price per 1 display unit at quote time. */
  price?: number;
};

export type QuoteRouteFeeType = {
  type?: string;
  amount?: string;
  asset?: string;
  chain?: string;
};

export type QuoteRouteType = {
  /**
   * Per-route identifier. Distinct from the top-level `quoteId`; only the
   * latter is what `/v3/swap` expects.
   */
  routeId?: string;
  /** Provider identifier(s) as returned by SwapKit (e.g. `"MAYACHAIN_STREAMING"`). */
  providers: string[];
  /** Expected receive amount in destination-asset display units. */
  expectedBuyAmount: string;
  /** Minimum guaranteed receive amount at the route's quoted slippage. */
  expectedBuyAmountMaxSlippage?: string;
  /**
   * All-in cost of the route against market value, in basis points, usually
   * negative. Not a slippage tolerance despite the name: see `costVsMarket`.
   */
  totalSlippageBps?: number;
  /** Total fees as reported by the provider. */
  fees?: QuoteRouteFeeType[];
  /** ETA label, e.g. `"~5 min"`. */
  estimatedTime?: { total?: number; inbound?: number; outbound?: number };
  /** Provider warnings, free-form strings. */
  warnings?: string[];
  /** Unix-seconds expiry, as a string (SwapKit's wire format). */
  expiration?: string;
  /** Anything else SwapKit returns we have not modelled. */
  meta?: Record<string, unknown>;
};

/**
 * Why one provider declined to quote.
 *
 * SwapKit answers 200 with an empty `routes[]` and fills this instead, so a
 * refusal is not an HTTP error and never reaches the error path. It is the
 * only place the reason exists: without it "no route" is indistinguishable
 * from a dead market, when the usual cause is simply an amount below the
 * provider minimum — which `minAmount` states exactly.
 */
export type QuoteProviderErrorType = {
  provider?: string;
  /** e.g. `"sellAssetAmountTooSmall"`. */
  errorCode?: string;
  message?: string;
  /** Smallest sell amount this provider accepts, in sell-asset units. */
  minAmount?: string;
};

export type QuoteResponseType = {
  /**
   * Opaque identifier for the whole quote (covers all `routes[]`). Echoed
   * back to `/v3/swap` when the user commits to a specific route.
   */
  quoteId?: string;
  /** Per-asset price snapshot from SwapKit. */
  assets?: QuoteRouteAssetType[];
  /** Available routes. */
  routes: QuoteRouteType[];
  /** Per-provider refusals, present when `routes[]` comes back empty. */
  providerErrors?: QuoteProviderErrorType[];
  /** Anything else SwapKit returns we have not modelled. */
  meta?: Record<string, unknown>;
};
