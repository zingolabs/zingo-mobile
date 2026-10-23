import { SwapKitHttpError } from './errors';
import { RATE_LIMITED_MESSAGE, isRateLimited } from './rateLimited';
import { providerShortLabel } from './providerLabels';
import type { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { swapKey, swapRaw } from './swapText';
import type { SwapTextType } from './swapText';

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
): SwapTextType {
  // Before the provider's name is put on anything: a 429 is the app's quota,
  // and blaming whichever provider the route went through misleads.
  if (isRateLimited(error)) return RATE_LIMITED_MESSAGE;
  const who: string | SwapTextType = provider
    ? providerShortLabel(provider)
    : swapKey('swap.msg-the-provider');
  const raw =
    `${error instanceof SwapKitHttpError ? `${error.message} ${error.body}` : String(error)}`.toLowerCase();

  if (
    raw.includes('estimate_unavailable') ||
    raw.includes('noroutesfound') ||
    raw.includes('no route')
  ) {
    return swapKey('swap.msg-cannot-price', { who });
  }
  // The provider priced the swap a moment ago and now says it has no way
  // out of the asset being sold. It is the same kind of refusal as the one
  // above, but with its own code, and it is about the leg rather than the
  // price, so it gets its own sentence.
  if (raw.includes('xchain_source_route_unavailable')) {
    return swapKey('swap.msg-no-source-route', { who });
  }
  if (raw.includes('insufficientliquidity') || raw.includes('liquidity')) {
    return swapKey('swap.msg-no-liquidity', { who });
  }
  if (
    raw.includes('expired') ||
    raw.includes('quote not found') ||
    raw.includes('route not found')
  ) {
    return swapKey('swap.msg-quote-expired');
  }
  if (raw.includes('ratelimit') || raw.includes('rate limit')) {
    return swapKey('swap.msg-provider-busy', { who });
  }
  return swapKey('swap.msg-could-not-start', { error: swapRaw(`${error}`) });
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
