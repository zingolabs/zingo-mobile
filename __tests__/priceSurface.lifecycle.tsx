/**
 * Evidence tests for the PR 1343 review findings in the price-surface
 * store lifecycle. Each test encodes the behavior the finding says the
 * surface should have: it fails on the broken code and passes once the
 * finding is fixed.
 *
 * F1: the cold-start entry fetch must not race the deps write.
 * F2: observing the store must never count as price-traffic consent.
 * F3: an iOS interruption (inactive) is a non-event, and the AppState
 *     subscription dies with the last mounted fetcher.
 * F4: a throwing fetch must not pin `loading` and kill the timer.
 * F5: a remounted surface with no price must fetch, not trust a module
 *     clock that outlived the wallet.
 * F6: the ready follow-up never re-arms after a background transition,
 *     survives an in-flight fetch, and disarms on a non-bootstrap state.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import React from 'react';
import { render, renderHook, waitFor } from '@testing-library/react-native';
import PriceFetcher, {
  PriceTrafficDriver,
} from '../components/Components/PriceFetcher';
import {
  PRICE_REFRESH_MAX_MS,
  priceFetcherStore,
  usePriceFetcherStore,
} from '../components/Components/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { SelectServerEnum } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { getZecPrice } from '../app/walletBackend';
import {
  INITIAL_MIXNET_VIEW,
  MixnetView,
} from '../app/walletBackend/transforms/mixnetPresenter';

const price = getZecPrice as jest.MockedFunction<typeof getZecPrice>;

const READY_VIEW: MixnetView = {
  statusKey: 'mixnet.status.ready',
  socks5Addr: '127.0.0.1:1080',
  narration: null,
  sendBlocked: false,
  recovery: 'none',
  reconnecting: false,
};
const UNKNOWN_VIEW: MixnetView = {
  statusKey: 'mixnet.status.unknown',
  socks5Addr: null,
  narration: null,
  sendBlocked: true,
  recovery: 'reenable',
  reconnecting: false,
};
const DIED_VIEW: MixnetView = {
  statusKey: 'mixnet.status.died',
  socks5Addr: null,
  narration: null,
  sendBlocked: true,
  recovery: 'reenable',
  reconnecting: false,
};

type Ctx = typeof defaultAppContextLoaded;
// Every session here holds the Nym selection, the sole price-traffic
// consent, unless a test overrides it away.
const makeCtx = (over?: Partial<Ctx>): Ctx => ({
  ...defaultAppContextLoaded,
  translate: (k: string) => k,
  zecPrice: { zecPrice: 0, date: 0 },
  nym: true,
  info: mockInfo,
  selectServer: SelectServerEnum.auto,
  ...over,
});

// The production composition: the driver owns the lifecycle, the fetcher
// only displays (pre-driver builds let the fetcher own both).
const fetcherUi = (ctx: Ctx, setZecPrice: (p: number, d: number) => void) => (
  <ContextAppLoadedProvider value={{ ...ctx, setZecPrice }}>
    {PriceTrafficDriver ? <PriceTrafficDriver /> : <></>}
    <PriceFetcher />
  </ContextAppLoadedProvider>
);

const foregroundReturned = () => priceFetcherStore.foregroundReturned();

// Emulates the deps a previous USD session left behind, so the entry-fetch
// paths run in both the broken and the fixed store. The shape is a
// superset of both eras' Deps.
const seedDeps = (setZecPrice: (p: number, d: number) => void) => {
  priceFetcherStore.setDeps({
    setZecPrice,
    mixnetStatusKey: 'mixnet.status.off',
    priceDate: 0,
    nymSelected: true,
    marketAvailable: true,
  });
};

const appStateHandlers: Array<(next: string) => void> = [];
const removeSpies: jest.Mock[] = [];

beforeAll(() => {
  const { AppState } = require('react-native');
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    event: string,
    handler: (next: string) => void,
  ) => {
    if (event === 'change') {
      appStateHandlers.push(handler);
    }
    const remove = jest.fn();
    removeSpies.push(remove);
    return { remove };
  }) as any);
});

const fireAppState = (next: string) => {
  [...appStateHandlers].forEach(h => h(next));
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  price.mockReset();

  priceFetcherStore.resetForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

test('F1: a cold start with no price fetches once the surface mounts', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(fetcherUi(makeCtx(), setZecPrice));

  await waitFor(
    () => expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number)),
    {
      timeout: 1500,
    },
  );
});

test('F2: observing the store snapshot never starts price traffic', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  seedDeps(jest.fn());

  // Send observes `loading` for its CTA; it is not a price surface.
  renderHook(() => usePriceFetcherStore());
  await jest.advanceTimersByTimeAsync(61_000);

  expect(price).not.toHaveBeenCalled();
});

test('F3: an ios interruption neither refetches nor disturbs the surface', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1));

  // Control Center, the notification shade, or the app's own Face ID
  // prompt: active -> inactive -> active with no background in between.
  fireAppState('inactive');
  fireAppState('active');
  await flush();
  expect(price).toHaveBeenCalledTimes(1);
});

test('F3: the AppState subscription dies with the last mounted fetcher', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(fetcherUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalled());

  view.unmount();
  expect(removeSpies[removeSpies.length - 1]).toHaveBeenCalled();
});

test('F4: a throwing fetch neither pins loading nor kills the timer', async () => {
  jest.useFakeTimers();
  price
    .mockRejectedValueOnce(new Error('ffi never settled'))
    .mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0); // the entry fetch throws

  // Past the longest draw: the next tick must run.
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 1_000);
  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});

test('F5: a remounted surface with no price fetches instead of waiting a tick', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(fetcherUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);
  view.unmount(); // wallet close: LoadedApp unmounts, zecPrice reseeds to 0

  await jest.advanceTimersByTimeAsync(6_000); // a human-scale wallet switch
  seedDeps(setZecPrice);
  render(fetcherUi(makeCtx(), setZecPrice)); // reopen: no price in context
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
});

test('F6: a background transition drops the follow-up even mid-flight', async () => {
  let refuseEntry: (v: { price: number; error: string }) => void = () => {};
  price
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          refuseEntry = resolve;
        }),
    )
    .mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const ctx = makeCtx({ mixnetView: INITIAL_MIXNET_VIEW }); // bootstrapping
  const view = render(fetcherUi(ctx, setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1));

  fireAppState('background'); // documented: drops the armed follow-up
  refuseEntry({ price: -1, error: 'refused' }); // the flight lands refused
  await flush();
  const afterFlight = price.mock.calls.length; // both attempts of the entry

  view.rerender(fetcherUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await flush();
  // A follow-up fired here would prompt a backgrounded app's transport.
  expect(price).toHaveBeenCalledTimes(afterFlight);
});

test('F6: a follow-up arriving mid-flight fires after the flight, not never', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const ctx = makeCtx({ mixnetView: INITIAL_MIXNET_VIEW }); // bootstrapping
  const view = render(fetcherUi(ctx, setZecPrice));
  await jest.advanceTimersByTimeAsync(0); // entry fails refused: arms

  let settleTick: (v: { price: number; error: string }) => void = () => {};
  price.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        settleTick = resolve;
      }),
  );
  // Advance exactly to the drawn deadline: the timer flight takes off
  // and stays in flight (its 30 s bound has not yet expired).
  const { nextFetchAt } = priceFetcherStore.snapshot();
  await jest.advanceTimersByTimeAsync(nextFetchAt - Date.now() + 1);
  const inFlight = price.mock.calls.length;

  // The Indicator turns ready while the flight is up.
  view.rerender(fetcherUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  settleTick({ price: -1, error: 'refused' });
  await jest.advanceTimersByTimeAsync(0);

  // The armed follow-up must still fire once the flight lands.
  expect(price.mock.calls.length).toBeGreaterThan(inFlight + 1);
});

test('F6: a real transport verdict disarms the follow-up', async () => {
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const ctx = makeCtx({ mixnetView: INITIAL_MIXNET_VIEW }); // bootstrapping
  const view = render(fetcherUi(ctx, setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(2)); // entry, refused twice: arms

  view.rerender(fetcherUi(makeCtx({ mixnetView: DIED_VIEW }), setZecPrice));
  await flush();
  view.rerender(fetcherUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await flush();

  // The arm belonged to a transport 'died' ended for good.
  expect(price).toHaveBeenCalledTimes(2);
});

test('R1: a hung fetch releases the surface and recovers once it settles', async () => {
  jest.useFakeTimers();
  let settleLate: (v: { price: number; error: string }) => void = () => {};
  price
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          settleLate = resolve; // the wedged native call
        }),
    )
    .mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  // Both bounded attempts expire against the single wedged call; the
  // surface must come out of `loading` instead of pinning forever.
  await jest.advanceTimersByTimeAsync(61_000);
  expect(priceFetcherStore.snapshot().loading).toBe(false);

  settleLate({ price: -1, error: 'late' }); // the native side frees up
  await jest.advanceTimersByTimeAsync(0);
  // Past the longest draw: the next tick runs fresh.
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 1_000);
  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});

test('R3: a transport turning ready mid-flight still gets the follow-up', async () => {
  let refuseFirst: (v: { price: number; error: string }) => void = () => {};
  let refuseSecond: (v: { price: number; error: string }) => void = () => {};
  price
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          refuseFirst = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          refuseSecond = resolve;
        }),
    )
    .mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const ctx = makeCtx({ mixnetView: INITIAL_MIXNET_VIEW }); // bootstrapping
  const view = render(fetcherUi(ctx, setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1));

  // The Indicator turns ready while the entry flight is still up.
  view.rerender(fetcherUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  refuseFirst({ price: -1, error: 'refused' });
  await flush();
  refuseSecond({ price: -1, error: 'refused' });
  await flush();
  await flush();

  // The refusal happened during a bootstrap; ready is up: fetch now, not
  // a full tick later.
  expect(price.mock.calls.length).toBeGreaterThan(2);
});

test('R3: a timer refusal during bootstrap arms the follow-up too', async () => {
  jest.useFakeTimers();
  price
    .mockResolvedValueOnce({ price: 42, error: '' }) // the boot fetch lands
    .mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  const freshDate = Date.now();

  priceFetcherStore.setDeps({
    setZecPrice,
    mixnetStatusKey: 'mixnet.status.bootstrapping',
    priceDate: freshDate,
    nymSelected: true,
    marketAvailable: true,
  });

  const ctx = makeCtx({
    mixnetView: INITIAL_MIXNET_VIEW,
    zecPrice: { zecPrice: 42, date: freshDate },
  });
  const view = render(fetcherUi(ctx, setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot fetch, no arm

  // Past the longest draw: the tick is refused during bootstrap.
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 1_000);
  const afterTimer = price.mock.calls.length;
  expect(afterTimer).toBeGreaterThan(1);

  view.rerender(
    fetcherUi(
      makeCtx({
        mixnetView: READY_VIEW,
        zecPrice: { zecPrice: 42, date: freshDate },
      }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(0);

  expect(price.mock.calls.length).toBeGreaterThan(afterTimer);
});

test('R6: a return landing inside a flight still produces the return fetch', async () => {
  let land: (v: { price: number; error: string }) => void = () => {};
  price
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          land = resolve;
        }),
    )
    .mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1));

  fireAppState('background');
  fireAppState('active'); // the return lands while the flight is up
  foregroundReturned();
  land({ price: -1, error: 'refused' });
  await flush();
  await flush();

  // The grilled invariant: every real return fetches.
  expect(price.mock.calls.length).toBeGreaterThanOrEqual(3);
});

test('R7: withdrawing consent mid-flight stops the retry and the write', async () => {
  let land: (v: { price: number; error: string }) => void = () => {};
  price
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          land = resolve;
        }),
    )
    .mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(fetcherUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1));

  view.unmount(); // currency switched away: the consent is withdrawn
  land({ price: 42, error: '' });
  await flush();

  expect(price).toHaveBeenCalledTimes(1); // no second attempt
  expect(setZecPrice).not.toHaveBeenCalled(); // no write into a dead surface
});

test('R8: rapid app hops inside the cooldown do not multiply fetches', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1)); // seconds-old price

  fireAppState('background');
  fireAppState('active');
  foregroundReturned();
  fireAppState('background');
  fireAppState('active');
  foregroundReturned();
  await flush();

  expect(price).toHaveBeenCalledTimes(1);
});

test('R2: without the Nym selection no price traffic exists', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  // USD may even be the seeded default; the currency authorizes nothing.
  render(fetcherUi(makeCtx({ nym: false }), setZecPrice));
  await jest.advanceTimersByTimeAsync(61_000);
  fireAppState('background');
  fireAppState('active');
  await jest.advanceTimersByTimeAsync(61_000);

  expect(price).not.toHaveBeenCalled();
});

test('R9: a transient unknown poll does not drop the armed follow-up', async () => {
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const ctx = makeCtx({ mixnetView: INITIAL_MIXNET_VIEW }); // bootstrapping
  const view = render(fetcherUi(ctx, setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(2)); // refused: arms

  view.rerender(fetcherUi(makeCtx({ mixnetView: UNKNOWN_VIEW }), setZecPrice));
  await flush(); // one failed status poll, not a transport verdict
  view.rerender(fetcherUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await flush();

  expect(price.mock.calls.length).toBeGreaterThan(2); // the follow-up flew
});
