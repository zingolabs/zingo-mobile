import type { QuoteInput } from './SwapService';
import type { RouteOptionType } from './types/RouteOptionType';

/**
 * The routes on screen that a refresh did not bring back, but that still
 * stand.
 *
 * A route is a price the provider committed to until its expiry: Flashnet's
 * are good for about twelve minutes. Flashnet also answers
 * `estimate_unavailable` on and off from one quote to the next, so a refresh
 * without it said nothing about the route the user had just picked, and
 * replacing that route with the other provider's (or with "no route") took
 * away a price that was still on offer.
 *
 * So a shown route carries over into the refreshed list while:
 *   - the refresh asked the same question (a changed amount, asset, address or
 *     slippage deserves its own answer, whatever it is);
 *   - the provider did not answer this time (a fresh route replaces the old
 *     one from the same provider);
 *   - it has at least MIN_REMAINING_VALIDITY_MS of its own validity left, time
 *     to review and commit; a route without an expiry carries over only while
 *     the last fresh answer is younger than STALE_QUOTE_GRACE_MS.
 */
export const MIN_REMAINING_VALIDITY_MS = 60_000;
export const STALE_QUOTE_GRACE_MS = 60_000;

/** How soon a refresh that brought nothing new is tried again, instead of the full cycle. */
export const FAILED_REFRESH_RETRY_MS = 5_000;

/** The question a quote answers, as a comparable string. */
export function quoteQuestionKey(input: QuoteInput): string {
  return JSON.stringify([
    input.sellAsset.swapKitId,
    input.receiveAsset.swapKitId,
    input.sellAmountHumanDecimal,
    input.sourceAddress,
    input.destinationAddress,
    input.slippageBps,
  ]);
}

export function carryOverRoutes(args: {
  /** The question the refresh asked. */
  questionKey: string;
  /** The question the routes on screen answered, if any. */
  shownQuestionKey: string | null;
  shownRoutes: readonly RouteOptionType[];
  /** What the refresh brought back. */
  freshRoutes: readonly RouteOptionType[];
  /** When a quote last brought fresh routes for the shown question. */
  lastFreshAtMs: number | null;
  nowMs: number;
}): RouteOptionType[] {
  const {
    questionKey,
    shownQuestionKey,
    shownRoutes,
    freshRoutes,
    lastFreshAtMs,
    nowMs,
  } = args;
  if (!shownRoutes.length || shownQuestionKey !== questionKey) return [];
  const answered = new Set(freshRoutes.map(route => route.provider));
  return shownRoutes.filter(route => {
    if (answered.has(route.provider)) return false;
    if (route.expiresAtMs)
      return route.expiresAtMs - nowMs >= MIN_REMAINING_VALIDITY_MS;
    return (
      lastFreshAtMs !== null && nowMs - lastFreshAtMs < STALE_QUOTE_GRACE_MS
    );
  });
}
