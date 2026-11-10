import { RouteOptionType } from './types/RouteOptionType';
import { isThorchainFamily } from './thorchainFamily';

/**
 * The route to select when nobody has chosen one.
 *
 * SwapKit tags a route `RECOMMENDED`, and that is the one the picker badges
 * as "Optimal" — so the tag, and not the position in the list, is what "the
 * best" has to mean here. The answers arrive in SwapKit's own order, which no
 * rule of ours sorts, so the first is only a last resort for a quote that
 * tags nothing at all.
 */
export const OPTIMAL_ROUTE_TAG = 'RECOMMENDED';

/**
 * How much less, as a fraction of the best price, a route paid to an address
 * alone may deliver and still be selected over one that needs a memo.
 */
export const ADDRESS_ONLY_MARGIN = 0.01;

/**
 * Paid with a token, which cannot carry a memo, a route that needs none is
 * selected instead of a Maya or THORChain optimum when its price is within
 * `ADDRESS_ONLY_MARGIN` of the best. The memo routes stay listed and stay
 * "Best"; only the default changes.
 */
export const optimalRouteId = (
  routes: ReadonlyArray<RouteOptionType>,
): string => {
  const optimal =
    routes.find(r => r.tags?.includes(OPTIMAL_ROUTE_TAG)) ?? routes[0];
  if (
    !optimal ||
    !optimal.paidWithToken ||
    !isThorchainFamily(optimal.provider)
  ) {
    return optimal?.routeId ?? '';
  }
  const amount = (r: RouteOptionType) => parseFloat(r.expectedReceiveAmount);
  const floor = Math.max(...routes.map(amount)) * (1 - ADDRESS_ONLY_MARGIN);
  const close = routes
    .filter(r => !isThorchainFamily(r.provider) && amount(r) >= floor)
    .sort((a, b) => amount(b) - amount(a))[0];
  return (close ?? optimal).routeId;
};
