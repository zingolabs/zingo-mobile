import type { FiatValueBasisType } from './types/FiatValueBasisType';
import type { QuoteResponseType } from './types/QuoteResponseType';

/**
 * The USD unit prices for a quote's two assets, snapshotted at quote time.
 *
 * Persisted on the record so the history shows what the swap was worth when it
 * ran, not what those assets are worth today. Today's price on a months-old
 * swap says nothing about the swap.
 *
 * SwapKit publishes these per route, under `route.meta.assets[]`, rather than
 * at the top of the response (verified against `api.swapkit.dev/v3/quote`,
 * 2026-06-28). The top level is still read as a fallback in case that ever
 * flattens, and prices are collected across every route because a single route
 * can carry a partial list.
 *
 * A missing price becomes 0 rather than an error: the record must persist
 * either way, and the surfaces that show a fiat figure hide it at 0 instead of
 * printing a a value they cannot stand behind.
 */
export function extractFiatValueBasis(args: {
  response: QuoteResponseType;
  sellAssetId: string;
  receiveAssetId: string;
  capturedAt: number;
}): FiatValueBasisType {
  const { response, sellAssetId, receiveAssetId, capturedAt } = args;

  const topLevel = Array.isArray((response as { assets?: unknown }).assets)
    ? ((response as { assets: Array<{ asset?: string; price?: number }> })
        .assets ?? [])
    : [];
  const routeLevel = (response.routes ?? []).flatMap(route => {
    const assets = (route.meta as { assets?: unknown } | undefined)?.assets;
    return Array.isArray(assets)
      ? (assets as Array<{ asset?: string; price?: number }>)
      : [];
  });

  const priced = [...routeLevel, ...topLevel];
  const priceOf = (id: string): number =>
    priced.find(entry => entry.asset === id)?.price ?? 0;

  return {
    sellUsdUnitPrice: priceOf(sellAssetId),
    receiveUsdUnitPrice: priceOf(receiveAssetId),
    capturedAt,
  };
}
