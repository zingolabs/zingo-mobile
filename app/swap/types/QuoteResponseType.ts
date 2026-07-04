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
  /** Anything else SwapKit returns we have not modelled. */
  meta?: Record<string, unknown>;
};
