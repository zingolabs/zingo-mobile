import { RouteOptionType } from './types/RouteOptionType';
import { optimalRouteId } from './optimalRoute';

/**
 * Which route stays selected when a refresh replaces the quote.
 *
 * Route ids are minted per quote, so nothing survives a refresh by id. What
 * the user chose was a provider, and that is what is carried across.
 *
 * Where they chose nothing the selection was ours, so it follows the new
 * optimum: holding our own earlier pick left the panel showing a route that
 * had stopped being the best one.
 *
 * A provider they did pick and that stopped quoting is the one case with no
 * answer of ours to give. Selecting another on their behalf would hand the
 * money to a counterparty they never chose, with the panel looking like their
 * own choice, so the selection is dropped and the caller is told which
 * provider went, to say so and to wait for a fresh pick.
 */
export function selectionAcrossRefresh(args: {
  pickedRouteId: string;
  pickedByUser: boolean;
  shownRoutes: ReadonlyArray<RouteOptionType>;
  freshRoutes: ReadonlyArray<RouteOptionType>;
}): { routeId: string; droppedProvider?: RouteOptionType['provider'] } {
  const { pickedRouteId, pickedByUser, shownRoutes, freshRoutes } = args;
  const pickedProvider = pickedByUser
    ? shownRoutes.find(r => r.routeId === pickedRouteId)?.provider
    : undefined;
  if (!pickedProvider) return { routeId: optimalRouteId(freshRoutes) };
  const sameProvider = freshRoutes.find(r => r.provider === pickedProvider);
  if (sameProvider) return { routeId: sameProvider.routeId };
  // An answer with no routes at all is already explained by the empty-quote
  // message, which names the real obstacle. Blaming the picked provider there
  // would point at the one thing that is not the reason.
  if (freshRoutes.length === 0) return { routeId: '' };
  return { routeId: '', droppedProvider: pickedProvider };
}

export default selectionAcrossRefresh;
