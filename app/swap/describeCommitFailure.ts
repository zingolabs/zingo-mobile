import { SwapKitHttpError } from './errors';
import { RATE_LIMITED_MESSAGE, isRateLimited } from './rateLimited';
import { providerShortLabel } from './providerLabels';
import type { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';

/**
 * Why starting a swap failed, in the user's terms.
 *
 * Committing asks the provider to stand by the route it quoted, and a
 * provider can refuse at that moment for reasons that say nothing about the
 * wallet: Flashnet answers `estimate_unavailable` on and off for the same
 * pair, and a rate limit or a route that has just expired read the same way.
 * Shown raw ("SwapKitHttpError: SwapKit swap HTTP 400: estimate_unavailable /
 * quoteError") it reads as a broken wallet and says nothing about what to do,
 * which is: take a fresh quote, or take another provider's route.
 */
export function describeCommitFailure(
  error: unknown,
  provider?: SwapKitProviderEnum,
): string {
  // Before the provider's name is put on anything: a 429 is the app's quota,
  // and blaming whichever provider the route went through misleads.
  if (isRateLimited(error)) return RATE_LIMITED_MESSAGE;
  const who = provider ? providerShortLabel(provider) : 'The provider';
  const raw =
    `${error instanceof SwapKitHttpError ? `${error.message} ${error.body}` : String(error)}`.toLowerCase();

  if (
    raw.includes('estimate_unavailable') ||
    raw.includes('noroutesfound') ||
    raw.includes('no route')
  ) {
    return `${who} could not price this swap just now. Refresh the quote and try again, or take another route.`;
  }
  // The provider priced the swap a moment ago and now says it has no way
  // out of the asset being sold. It is the same kind of refusal as the one
  // above, but with its own code, and it is about the leg rather than the
  // price, so it gets its own sentence.
  if (raw.includes('xchain_source_route_unavailable')) {
    return `${who} has no route out of the asset you are selling just now. Take another route, or try again later.`;
  }
  if (raw.includes('insufficientliquidity') || raw.includes('liquidity')) {
    return `${who} does not have the liquidity for this swap right now. Try a smaller amount, or another route.`;
  }
  if (
    raw.includes('expired') ||
    raw.includes('quote not found') ||
    raw.includes('route not found')
  ) {
    return 'That quote is no longer good. Refresh it and start the swap again.';
  }
  if (raw.includes('ratelimit') || raw.includes('rate limit')) {
    return `${who} is refusing requests for the moment. Try again in a minute.`;
  }
  return `Could not start the swap: ${error}`;
}

/**
 * Whether a failed commit condemns the route it was for.
 *
 * A refusal with an HTTP status came from SwapKit or the provider behind it,
 * and it is about this route id: asking again with the same id gets the same
 * answer. Flashnet has spent whole days quoting ZEC routes and answering
 * `xchain_source_route_unavailable` to every commit, at every amount and for
 * every asset bought, so a user who pressed the button once could press it
 * for ever.
 *
 * A 429 is the exception: SwapKit turning this app's API key away for having
 * used its quota, which every user shares. It says nothing about the route,
 * and setting the provider aside for it would leave the user without one of
 * the routes that is there to take once the minute is out.
 *
 * Anything else — a timeout, the machine losing its network — says nothing
 * about the route either, and the same press a moment later can go through.
 */
export function commitRefusalCondemnsRoute(error: unknown): boolean {
  return error instanceof SwapKitHttpError && !isRateLimited(error);
}
