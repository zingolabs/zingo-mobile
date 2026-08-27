/**
 * Evidence tests for the sixth review round on PR 1343. Each test
 * encodes the behavior the finding says the surface should have: it
 * fails on the broken code and passes once the finding is fixed.
 *
 * G1: a market-less surface (offline mode, non-mainnet chain) renders
 *     no ring at all, per the store's own verdict.
 * G2: a bound expiry never retries against the same wedged native call.
 * G3: a session detached mid-flight leaves no loading for the next one.
 * G4: a price landing while the app is away is recorded, not re-bought.
 * G5: a refusal under a transient 'unknown' status arms the follow-up.
 * G6: a parked return the landing declines is consumed, never doubled.
 * G7: the boot fetch's loading reaches a fetcher subscribed after it.
 * G9: a ceiling draw's fetch latency does not dim a healthy cadence.
 * G10: the ring fills from coarse wall-clock ticks, not a per-frame
 *      animation.
 * (G8, the Send/Confirm pinning repair, lives in Send.priceCta.unit.)
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import PriceFetcher, {
  PriceTrafficDriver,
} from '../components/Components/PriceFetcher';
import QuoteRefreshRing from '../components/Components/QuoteRefreshRing';
import {
  priceFetcherStore,
  usePriceStale,
} from '../components/Components/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { SelectServerEnum } from '../app/AppState';
import { getZecPrice } from '../app/walletBackend';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { MixnetView } from '../app/walletBackend/transforms/mixnetPresenter';

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
const makeCtx = (over?: Partial<Ctx>): Ctx => ({
  ...defaultAppContextLoaded,
  translate: (k: string) => k,
  zecPrice: { zecPrice: 0, date: 0 },
  nym: true,
  info: mockInfo,
  selectServer: SelectServerEnum.auto,
  ...over,
});

const surfaceUi = (ctx: Ctx, setZecPrice: (p: number, d: number) => void) => (
  <ContextAppLoadedProvider value={{ ...ctx, setZecPrice }}>
    <PriceTrafficDriver />
    <PriceFetcher />
  </ContextAppLoadedProvider>
);

const appStateHandlers: Array<(next: string) => void> = [];

beforeAll(() => {
  const { AppState } = require('react-native');
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    event: string,
    handler: (next: string) => void,
  ) => {
    if (event === 'change') {
      appStateHandlers.push(handler);
    }
    return { remove: jest.fn() };
  }) as any);
});

const fireAppState = (next: string) => {
  [...appStateHandlers].forEach(h => h(next));
};

beforeEach(() => {
  price.mockReset();
  priceFetcherStore.resetForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

test('G1: a market-less surface renders no ring at all', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(
      makeCtx({
        mixnetView: READY_VIEW,
        selectServer: SelectServerEnum.offline,
      }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(1_000);

  // No market means no cadence: a full frozen ring here would promise a
  // refresh that cannot come.
  expect(price).not.toHaveBeenCalled();
  expect(view.queryByTestId('pricefetcher.ring')).toBeNull();
});

test('G2: a bound expiry never retries against the same wedged call', async () => {
  jest.useFakeTimers();
  price.mockImplementation(() => new Promise(() => {})); // wedged forever
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot fetch, wedged

  // One bound later the flight is over: no second 30 s spent awaiting
  // the identical dead promise.
  await jest.advanceTimersByTimeAsync(31_000);
  expect(priceFetcherStore.snapshot().loading).toBe(false);
  expect(price).toHaveBeenCalledTimes(1);
});

test('G3: a session detached mid-flight leaves no loading behind', async () => {
  jest.useFakeTimers();
  price
    .mockImplementationOnce(() => new Promise(() => {})) // wedged flight
    .mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot fetch, in flight

  view.unmount(); // wallet closed mid-flight

  render(surfaceUi(makeCtx(), setZecPrice)); // the next wallet session
  await jest.advanceTimersByTimeAsync(0);
  // The new session's guaranteed boot fetch, not a 5-10 minute wait
  // behind the dead session's loading flag.
  expect(price).toHaveBeenCalledTimes(2);
  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});

test('G4: a price landing while the app is away is recorded', async () => {
  jest.useFakeTimers();
  let land: (v: { price: number; error: string }) => void = () => {};
  price.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        land = resolve;
      }),
  );
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot fetch, in flight

  fireAppState('background'); // a two-second hop away
  land({ price: 42, error: '' });
  await jest.advanceTimersByTimeAsync(0);

  // The traffic was already spent; discarding the value would only buy
  // a second identical fetch after the gate opens.
  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});

test("G5: a refusal under a transient 'unknown' arms the follow-up", async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: UNKNOWN_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  const refusedUnderUnknown = price.mock.calls.length;
  expect(refusedUnderUnknown).toBeGreaterThan(0);

  // 'unknown' is one failed status poll, not a verdict, on the arm path
  // exactly as on the drop path: ready must fire the follow-up now, not
  // a full tick later.
  view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price.mock.calls.length).toBeGreaterThan(refusedUnderUnknown);
});

test('G6: a parked return the landing declines is consumed, not doubled', async () => {
  jest.useFakeTimers();
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

  const view = render(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot fetch, in flight

  priceFetcherStore.foregroundReturned(); // a return parks on the flight
  view.rerender(surfaceUi(makeCtx({ mixnetView: DIED_VIEW }), setZecPrice));
  land({ price: -1, error: 'refused' });
  await jest.advanceTimersByTimeAsync(0); // the landing declines the park

  await jest.advanceTimersByTimeAsync(6_000); // past the burst cooldown
  view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);

  // The recovery entry (a refused pair) and nothing more: the ancient
  // park must not ride its finally into a cooldown-free double.
  expect(price).toHaveBeenCalledTimes(3);
});

test('G7: the boot fetch shows the first-fetch spinner', async () => {
  jest.useFakeTimers();
  price.mockImplementation(() => new Promise(() => {})); // in flight
  const setZecPrice = jest.fn();

  const view = render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);

  // The driver's attach effect starts the fetch before this fetcher's
  // subscribe effect runs; the missed emit must be re-read, or the one
  // path the spinner exists for never shows it.
  const { ActivityIndicator } = require('react-native');
  expect(view.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
});

test('G9: a ceiling draw plus fetch latency does not dim', () => {
  const withinHeadroom = Date.now() - (10 * 60_000 + 10_000);
  const { result: healthy } = renderHook(() => usePriceStale(withinHeadroom));
  expect(healthy.current).toBe(false);

  const pastHeadroom = Date.now() - (10 * 60_000 + 31_000);
  const { result: slipped } = renderHook(() => usePriceStale(pastHeadroom));
  expect(slipped.current).toBe(true);
});

test('G10: the ring fills from coarse ticks, not a per-frame animation', async () => {
  jest.useFakeTimers();
  const { Animated } = require('react-native');
  const timingSpy = jest.spyOn(Animated, 'timing');

  render(
    <QuoteRefreshRing
      size={22}
      color="#ffffff"
      trackColor="rgba(255,255,255,0.12)"
      durationMs={60_000}
      resetKey={1}
      accessibilityLabel="ring"
      testID="round6.ring"
    />,
  );
  await jest.advanceTimersByTimeAsync(30_000);

  // Mid-fill: the coarse tick interval pends, and no Animated frame
  // pipeline was ever started.
  expect(timingSpy).not.toHaveBeenCalled();
  const midFill = jest.getTimerCount();
  expect(midFill).toBeGreaterThan(0);

  // Past the full duration the fill is complete and the interval has
  // cleared itself instead of ticking forever.
  await jest.advanceTimersByTimeAsync(31_000);
  expect(timingSpy).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBeLessThan(midFill);
  timingSpy.mockRestore();
});
