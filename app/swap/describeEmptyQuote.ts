import type { QuoteResponseType } from './types/QuoteResponseType';
import type { UnavailableProviderType } from './unavailableProviders';
import { providerShortLabel } from './providerLabels';
import { swapKey } from './swapText';
import type { SwapTextType } from './swapText';

/**
 * Why a quote came back with no routes, in the user's terms.
 *
 * SwapKit answers 200 with an empty `routes[]` and a `providerErrors[]`
 * explaining each refusal, so this never travels the error path and the reason
 * would otherwise be dropped on the floor. The common case by far is an amount
 * under the provider minimums, and the response states the minimum outright —
 * telling the user "no route is available" when the truth is "add a bit more"
 * sends them looking for a fault that is not there.
 *
 * The largest minimum is the one quoted: a smaller one belongs to a provider
 * that would still refuse, so it would be an amount that does not fix
 * anything. When the providers disagree on why, or say nothing useful, this
 * falls back to the generic sentence rather than inventing a cause.
 *
 * Otherwise the sentence is followed by each provider's own reason, one line
 * each, from `unavailable`. A bare "no route" had users changing amounts
 * that were never the problem, or giving up on a pair one network away from
 * working: NEAR's temporary $1,000 minimum on BSC and a Flashnet that cannot
 * price the pair this minute read identically to it.
 */
export function describeEmptyQuote(
  response: QuoteResponseType,
  sellAssetTicker: string | undefined,
  unavailable: readonly UnavailableProviderType[] = [],
): SwapTextType {
  // The catalog ships entries without a ticker, so the caller cannot promise
  // one. Naming no unit beats naming the wrong one.
  const unit = sellAssetTicker ? ` ${sellAssetTicker}` : '';
  const generic = swapKey('swap.msg-no-route');
  const withReasons: SwapTextType =
    unavailable.length > 0
      ? {
          kind: 'lines',
          lines: [
            generic,
            ...unavailable.map(row =>
              swapKey('swap.msg-provider-line', {
                provider: providerShortLabel(row.provider),
                reason: row.reason,
              }),
            ),
          ],
        }
      : generic;
  const errors = response.providerErrors ?? [];
  if (errors.length === 0) return withReasons;

  const tooSmall = errors.filter(
    e => e.errorCode === 'sellAssetAmountTooSmall',
  );
  if (tooSmall.length !== errors.length) return withReasons;

  const minimums = tooSmall
    .map(e => Number(e.minAmount))
    .filter(n => Number.isFinite(n) && n > 0)
    .sort((a, b) => b - a);

  if (minimums.length === 0) {
    return swapKey('swap.msg-below-every-minimum');
  }
  // Trailing zeros dropped so 0.01068069 does not read as 0.010680690000.
  const largest = minimums[0].toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return swapKey('swap.msg-too-small', { amount: `${largest}${unit}` });
}
