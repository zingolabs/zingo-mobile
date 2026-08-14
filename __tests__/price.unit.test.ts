/**
 * The price slice — the pure model pins and the PriceLane teardown-leak pins.
 *
 *  - the mapper pins: priceView projects the slice to the legacy display shape,
 *    sliceFromFetch stamps a priced fetch with its observation time. The
 *    getZecPrice → union pins live in walletBackend.walletUtils.unit.test.ts.
 *  - the teardown-leak pins: a fetch resolving after teardown drops its write
 *    (the after-unmount setZecPrice fault), and teardown clears the tracked
 *    handle so no auto-refresh outlives the reset. `started` lives in the store,
 *    not a surviving singleton, so a fresh instance never inherits it.
 */

// The lane defaults its fetch to the native-backed getZecPrice; these pins
// inject their own, so a bare RPCModule stub keeps the import graph loadable.
jest.mock('../app/RPCModule', () => ({ __esModule: true, default: {} }));

import { createStore } from 'jotai';

import {
  type ZecPriceFetch,
  initialPriceSlice,
  priceView,
  sliceFromFetch,
} from '../app/AppState/price';
import {
  PRICE_AUTO_REFRESH_MS,
  PriceLane,
  priceAtom,
  priceStatusAtom,
} from '../app/AppState/priceAtoms';

async function flush(times = 50): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('the price mapper is a pure projection', () => {
  it('priceView shows a priced value and blanks everything else', () => {
    expect(priceView({ kind: 'priced', usd: 33.33, at: 7 })).toEqual({
      zecPrice: 33.33,
      date: 7,
    });
    expect(priceView({ kind: 'unpriced' })).toEqual({ zecPrice: 0, date: 0 });
    expect(
      priceView({ kind: 'error', errorKey: 'price.gemini' }),
    ).toEqual({ zecPrice: 0, date: 0 });
  });

  it('sliceFromFetch stamps a priced fetch and passes the rest through', () => {
    expect(sliceFromFetch({ kind: 'priced', usd: 1 }, 42)).toEqual({
      kind: 'priced',
      usd: 1,
      at: 42,
    });
    expect(sliceFromFetch({ kind: 'unpriced' }, 42)).toEqual({
      kind: 'unpriced',
    });
    const err: ZecPriceFetch = { kind: 'error', errorKey: 'price.rpcmodule' };
    expect(sliceFromFetch(err, 42)).toEqual(err);
  });
});

describe('PriceLane closes the teardown leaks', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('drops a fetch that resolves after teardown (the after-reset write)', async () => {
    const store = createStore();
    let resolveFetch: (f: ZecPriceFetch) => void = () => {};
    const fetchPrice = jest.fn(
      () =>
        new Promise<ZecPriceFetch>(resolve => {
          resolveFetch = resolve;
        }),
    );
    const lane = new PriceLane(store, { onError: jest.fn(), fetchPrice });

    lane.fetch();
    await flush(); // run() reaches its awaited fetch

    lane.teardown(); // the reset: the epoch bumps
    resolveFetch({ kind: 'priced', usd: 5 });
    await flush();
    jest.advanceTimersByTime(1000); // clear the min-visible floor
    await flush();

    expect(store.get(priceAtom)).toEqual(initialPriceSlice);
  });

  it('clears the tracked handle on teardown so no auto-refresh outlives it', () => {
    const store = createStore();
    store.set(priceAtom, { kind: 'priced', usd: 1, at: 0 }); // started
    const fetchPrice = jest.fn(
      async (): Promise<ZecPriceFetch> => ({ kind: 'priced', usd: 2 }),
    );
    const lane = new PriceLane(store, { onError: jest.fn(), fetchPrice });

    lane.subscribe(); // schedules the 60s auto
    lane.teardown();
    jest.advanceTimersByTime(PRICE_AUTO_REFRESH_MS * 3);

    expect(fetchPrice).not.toHaveBeenCalled();
  });

  it('runs the auto-refresh while subscribed and started', async () => {
    const store = createStore();
    store.set(priceAtom, { kind: 'priced', usd: 1, at: 0 });
    const fetchPrice = jest.fn(
      async (): Promise<ZecPriceFetch> => ({ kind: 'priced', usd: 2 }),
    );
    const lane = new PriceLane(store, { onError: jest.fn(), fetchPrice });

    lane.subscribe();
    jest.advanceTimersByTime(PRICE_AUTO_REFRESH_MS);
    await flush();

    expect(fetchPrice).toHaveBeenCalledTimes(1);
  });

  it('keeps started in the store, so a fresh instance never inherits it', () => {
    const priced = createStore();
    priced.set(priceAtom, { kind: 'priced', usd: 9, at: 0 });
    const onError = jest.fn();
    // A new instance's store starts unpriced; its lane reads that store, not a
    // module singleton, so the prior instance's started/cooldown do not carry.
    const fresh = createStore();
    // eslint-disable-next-line no-new
    new PriceLane(fresh, { onError, fetchPrice: jest.fn() });
    expect(fresh.get(priceAtom)).toEqual(initialPriceSlice);
    expect(fresh.get(priceStatusAtom)).toBe('idle');
  });
});
