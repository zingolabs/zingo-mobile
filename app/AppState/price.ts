// The price slice — the pure price model carved out of priceFetcherStore. The
// value is a discriminated union, not the old 0/-1/-2 sentinels; the fetch
// status rides apart. Nothing here reads a
// clock or touches I/O, so a unit test drives it directly.
//
// getZecPrice returns a ZecPriceFetch (no timestamp — that is the I/O
// boundary's to stamp). sliceFromFetch stamps `at` and lands the fetch as the
// held slice. priceView projects the slice back to the legacy {zecPrice,date}
// the leaf display components still read, so PriceRow/BalanceRow/Confirm keep
// their props unchanged.

import type ZecPriceType from './types/ZecPriceType';
import { ErrorKeyed } from './types/Result';

export type PriceErrorKey = 'price.gemini' | 'price.rpcmodule';

// The fetch result crossing the walletBackend boundary. Priced carries no
// timestamp; the lane stamps `at` when it lands the value.
export type ZecPriceFetch =
  | { kind: 'priced'; usd: number }
  | { kind: 'unpriced' }
  | ErrorKeyed<PriceErrorKey>;

// The held value slice. `priced` gains the observation time.
export type PriceSlice =
  | { kind: 'unpriced' }
  | { kind: 'priced'; usd: number; at: number }
  | ErrorKeyed<PriceErrorKey>;

export type PriceFetchStatus = 'idle' | 'fetching' | 'cooling';

export const initialPriceSlice: PriceSlice = { kind: 'unpriced' };

// Stamps a priced fetch with its observation time; unpriced and error variants
// pass through unchanged.
export const sliceFromFetch = (
  fetch: ZecPriceFetch,
  at: number,
): PriceSlice =>
  fetch.kind === 'priced' ? { kind: 'priced', usd: fetch.usd, at } : fetch;

// The legacy display shape. A priced slice shows its value; unpriced and error
// project to the blank {0,0} that hides the USD rows, exactly the old zecPrice
// default.
export const priceView = (slice: PriceSlice): ZecPriceType =>
  slice.kind === 'priced'
    ? { zecPrice: slice.usd, date: slice.at }
    : { zecPrice: 0, date: 0 };
