import { RouteOptionType } from './types/RouteOptionType';

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

export const optimalRouteId = (
  routes: ReadonlyArray<RouteOptionType>,
): string =>
  (routes.find(r => r.tags?.includes(OPTIMAL_ROUTE_TAG)) ?? routes[0])
    ?.routeId ?? '';
