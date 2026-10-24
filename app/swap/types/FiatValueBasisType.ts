/**
 * Fiat-value snapshot taken at the time of quoting.
 *
 * Persisted as part of a `SwapRecord` so that the historic USD value displayed
 * in the activity list reflects the swap's value at execution time, not the
 * current market price.
 *
 * Unit prices are taken from SwapKit's `meta.assets[].price` array in the
 * `/v3/quote` response (USD per 1 unit of human-decimal asset). `capturedAt`
 * is a local Unix-ms timestamp.
 */
export type FiatValueBasisType = {
  sellUsdUnitPrice: number;
  receiveUsdUnitPrice: number;
  capturedAt: number;
};
