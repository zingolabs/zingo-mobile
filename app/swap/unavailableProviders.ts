import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { formatAmountForDisplay } from './formatAmountForDisplay';
import type {
  QuoteProviderErrorType,
  QuoteResponseType,
} from './types/QuoteResponseType';
import type { RouteOptionType } from './types/RouteOptionType';

/** A provider that returned no route, and what it said about why. */
export type UnavailableProviderType = {
  provider: SwapKitProviderEnum;
  reason: string;
};

/**
 * The providers that did not offer a route, so the list can show them instead
 * of leaving their absence to be guessed at.
 *
 * SwapKit reports its refusals in the same response as the routes, and until
 * now they were read only when there were no routes at all. That left the
 * common case unexplained: one provider answers, the other two are missing,
 * and nothing on screen says whether the pair is unsupported or the amount is
 * simply below a minimum. The second is a swap the user can have by typing a
 * larger number, and they had no way to know it.
 *
 * Only the providers this wallet can actually execute are listed. SwapKit
 * refuses on behalf of a dozen it offers, and a list of routes that could
 * never have been taken teaches nothing.
 */
export function unavailableProviders({
  response,
  supported,
  routes,
  unsupportedRoutes,
  sellAssetTicker,
}: {
  response: QuoteResponseType;
  /** The providers with an executor — anything else is not a swap this app can make. */
  supported: readonly SwapKitProviderEnum[];
  /** The routes that did come back, whose providers are not missing. */
  routes: readonly RouteOptionType[];
  /**
   * Routes SwapKit offered through a provider with no executor. These were
   * dropped silently until now, which is the worst way to lose an option: it
   * is indistinguishable from the provider never having answered.
   */
  unsupportedRoutes?: readonly RouteOptionType[];
  sellAssetTicker?: string;
}): UnavailableProviderType[] {
  const quoted = new Set(routes.map(route => route.provider));
  const errors = new Map<string, QuoteProviderErrorType>();
  for (const error of response.providerErrors ?? []) {
    // SwapKit names the provider in the same casing as the enum, but a
    // response that shouts or whispers it should still match its refusal to
    // the provider it belongs to.
    if (error.provider) errors.set(error.provider.toUpperCase(), error);
  }

  const rows = supported
    .filter(provider => !quoted.has(provider))
    .map(provider => ({
      provider,
      reason: describeRefusal(
        errors.get(provider.toUpperCase()),
        sellAssetTicker,
      ),
    }));

  // A route this app cannot take is a different fact from a provider that did
  // not offer one, and the user can do nothing about either — but only one of
  // them is a gap on our side, and saying so is how it stops going unnoticed.
  for (const route of unsupportedRoutes ?? []) {
    if (quoted.has(route.provider)) continue;
    if (rows.some(row => row.provider === route.provider)) continue;
    rows.push({
      provider: route.provider,
      reason: 'This wallet cannot swap through this provider yet.',
    });
  }

  return rows;
}

/**
 * Refusals whose cause is known well enough to say what it means, keyed by the
 * code with its punctuation and casing removed — SwapKit writes them
 * `snake_case` in one place and `camelCase` in another.
 *
 * A refusal not listed here is passed through rather than paraphrased. What
 * makes an entry earnable is knowing what the user should take from it, and
 * for a code nobody has seen that is a guess.
 */
const KNOWN_REFUSALS: Readonly<Record<string, string>> = {
  // Not about this swap at all: the provider is turning requests away for the
  // moment, and the quote refreshes on its own.
  ratelimited:
    'The provider is refusing requests for the moment. The next quote may reach it.',
  // Flashnet's answer whenever it cannot price the pair at that moment. Seen
  // coming and going on the same pair from one quote to the next.
  estimateunavailable:
    'Could not price this swap right now. It may be back on the next quote.',
  insufficientliquidity: 'Not enough liquidity for this swap right now.',
  // The asset is listed but the provider rejects it; nothing the user can change.
  invalidbuyassetaddress: 'Does not support this asset.',
  invalidsellassetaddress: 'Does not support this asset.',
};

/**
 * One provider's refusal, in the user's terms.
 *
 * A missing entry is its own answer: SwapKit considered the pair and returned
 * neither a route nor a complaint, which means this provider does not trade
 * it. Saying so is honest; inventing a cause for it would not be.
 */
function describeRefusal(
  error: QuoteProviderErrorType | undefined,
  sellAssetTicker?: string,
): string {
  const unit = sellAssetTicker ? ` ${sellAssetTicker}` : '';
  if (!error) return 'Does not trade this pair.';

  const code = normaliseCode(error.errorCode) || normaliseCode(error.message);

  if (code === 'sellassetamounttoosmall') {
    const minimum = formatAmountForDisplay(error.minAmount);
    // A minimum of zero is the formatter saying it could not read one, not a
    // provider that accepts nothing.
    return minimum === '0'
      ? "The amount is below this provider's minimum."
      : `Needs at least ${minimum}${unit}.`;
  }

  // NEAR states some minimums in dollars, in prose, under a generic code
  // ("Temporary swap limits: minimum swap amount is $1,000", seen on BSC and
  // Polygon). Read as anything else it becomes "no route", and the user
  // never learns that a larger amount would go through.
  const usdMinimum = error.message?.match(
    /minimum swap amount is \$\s?([\d.,]+)/i,
  )?.[1];
  if (usdMinimum)
    return `Needs at least $${usdMinimum} for this swap right now.`;

  // The code first, then the message: Flashnet sends its reason
  // (`estimate_unavailable`) as the message under a generic `quoteError` code.
  const known =
    KNOWN_REFUSALS[code] ?? KNOWN_REFUSALS[normaliseCode(error.message)];
  if (known) return known;

  // Prose often arrives prefixed with the endpoint that produced it
  // ("1click.chaindefuser.com/v0/quote: …"), which means nothing to the user.
  const message = error.message
    ?.trim()
    .replace(/^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*:\s*/i, '');
  // A message with a space in it is prose the provider wrote, and a specific
  // sentence beats a vague one even when it reads like a developer wrote it.
  // A single run-together token is not prose, it is an identifier: printing
  // `rate_limited` on screen tells the user nothing they can read.
  if (message && message.includes(' ')) return message;
  return 'Not available for this swap right now.';
}

/** A code with its casing and separators removed, so the two spellings SwapKit uses compare equal. */
function normaliseCode(raw: string | undefined): string {
  return (raw ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
