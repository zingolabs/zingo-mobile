import { SwapKitProviderEnum } from '../enums/SwapKitProviderEnum';
import { QuoteRouteFeeType } from './QuoteResponseType';

/**
 * A single route returned by SwapKit `/v3/quote` for a given (sell, receive,
 * amount, slippage) tuple. The UI's route chooser renders one card per option.
 *
 * Each option corresponds to one entry of the `routes[]` array in the quote
 * response. The fields here are the union of what is consistently present
 * across all providers we currently route through (Maya, NEAR Intents,
 * Flashnet); provider-specific oddities are captured later, when the user
 * commits to a route and we call `/v3/swap`.
 *
 * `routeId` is the opaque per-route identifier `/v3/swap` requires in its
 * request body. The top-level `quoteId` from the quote response is a
 * coarser group id covering all routes and is NOT what the commit endpoint
 * keys on — historically we conflated the two and SwapKit's schema rejects
 * us with `body/routeId Invalid input: expected string`. Treat as opaque
 * and never parse client-side.
 */
export type RouteOptionType = {
  /** Per-route opaque identifier required by `/v3/swap`. */
  routeId: string;
  /** Provider that produced this route. */
  provider: SwapKitProviderEnum;
  /** Expected amount the user will receive, in destination asset display units. */
  expectedReceiveAmount: string;
  /** Minimum guaranteed receive amount at the route's quoted slippage. */
  minReceiveAmount: string;
  /** Every fee SwapKit reports, re-expressed in the destination (buy) asset
   *  via the route's implied rate. Used by the swap-screen summary card on
   *  inbound swaps, where the buy asset is ZEC and ZEC is the user's frame
   *  of reference. May be `"0"` if no fees were returned or none could be
   *  converted (asset is neither sell nor receive). */
  totalFeesInReceiveAsset?: string;
  /** Affiliate + service fees in the destination asset display units.
   *  SwapKit's `affiliate`/`service` correspond to what the UI labels as
   *  "Bridge Fee" (protocol-side rather than network-side). */
  bridgeFeesInReceiveAsset?: string;
  /** Every fee SwapKit reports, re-expressed in the source (sell) asset
   *  via the route's implied rate. Used by the swap-screen summary card on
   *  outbound swaps (sell = ZEC) and by the per-route picker row for the
   *  per-route source-asset fee. */
  totalFeesInSellAsset?: string;
  /** Affiliate + service fees in the source asset display units. */
  bridgeFeesInSellAsset?: string;
  /** Raw `route.fees[]` exactly as SwapKit returned it. Carried through so
   *  the post-commit `SwapRecord` can persist the per-type breakdown that
   *  `SwapDetail` renders in its Fees breakdown sheet (liquidity /
   *  outbound / affiliate / service / inbound). The aggregated
   *  `totalFeesIn(Receive|Sell)Asset` fields above are convenient for the
   *  picker card; this raw array is what powers the breakdown UI. */
  feesRaw?: ReadonlyArray<QuoteRouteFeeType>;
  /** Estimated time-to-completion (human label, e.g. `"~5 min"`). */
  estimatedTimeText?: string;
  /** Unix-ms timestamp after which the quote is considered stale. */
  expiresAtMs?: number;
  /** Raw `meta.warnings` joined for display (provider-defined free-text). */
  warningsText?: string;
  /** SwapKit `meta.tags` array projected verbatim (e.g. `RECOMMENDED`,
   *  `FASTEST`, `CHEAPEST`). The route picker maps `RECOMMENDED` to the
   *  "Optimal" badge in the design. */
  tags?: ReadonlyArray<string>;
};
