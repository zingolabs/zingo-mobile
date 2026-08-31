/**
 * Outage recovery and staleness.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import * as fs from 'fs';
import * as path from 'path';
import 'react-native';
import React from 'react';
import { act, render, renderHook } from '@testing-library/react-native';
import PriceFetcher, {
  PriceTrafficDriver,
} from '../components/Components/PriceFetcher';
import {
  PRICE_REFRESH_MAX_MS,
  PRICE_STALE_MS,
  priceFetcherStore,
  usePriceHealth,
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

beforeAll(() => {
  const RN: typeof import('react-native') = require('react-native');
  jest
    .spyOn(RN.AppState, 'addEventListener')
    .mockImplementation(() => ({ remove: jest.fn() }));
});

beforeEach(() => {
  price.mockReset();
  priceFetcherStore.resetForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

test('a lost market takes the cadence down now, and publishes it', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(priceFetcherStore.snapshot().nextFetchAt).toBeGreaterThan(0);

  // Settings picks the offline server: the armed timer must die with
  // the market, and the store must say so, or an idle wallet's ring
  // keeps filling toward a refresh that cannot come.
  const listener = jest.fn();
  const unsubscribe = priceFetcherStore.subscribe(listener);
  view.rerender(
    surfaceUi(
      makeCtx({
        mixnetView: READY_VIEW,
        selectServer: SelectServerEnum.offline,
      }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(priceFetcherStore.snapshot().nextFetchAt).toBe(0);
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});

test('no wedged deadline across an outage, and the recovery entry fires', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot entry, succeeded

  view.rerender(
    surfaceUi(
      makeCtx({
        mixnetView: READY_VIEW,
        selectServer: SelectServerEnum.offline,
      }),
      setZecPrice,
    ),
  );
  // The whole cadence window passes with no market: nothing may fetch,
  // and no dead deadline may sit where the ring reads a full cycle.
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 60_000);
  expect(price).toHaveBeenCalledTimes(1);
  expect(priceFetcherStore.snapshot().nextFetchAt).toBe(0);

  // The market returns with the price a full window old: the recovery
  // is an entry, and entries fetch at once.
  view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
  expect(priceFetcherStore.snapshot().nextFetchAt).toBeGreaterThan(Date.now());
});

test('a flapping transport rides the cadence, one fetch per window', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot entry, succeeded

  // Two outage cycles, each side past the burst cooldown. The consent
  // covers one fetch per five-to-ten-minute window; a reconnect is not
  // an invitation to spend another.
  for (let flap = 0; flap < 2; flap++) {
    view.rerender(surfaceUi(makeCtx({ mixnetView: DIED_VIEW }), setZecPrice));
    await jest.advanceTimersByTimeAsync(6_000);
    view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
    await jest.advanceTimersByTimeAsync(6_000);
  }
  expect(price).toHaveBeenCalledTimes(1);

  // The surface did not go silent: the re-armed cadence still fetches.
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS);
  expect(price.mock.calls.length).toBeGreaterThan(1);
});

test('a rejected native call reads as a refusal, not a vanish', async () => {
  jest.useFakeTimers();
  // A missing native member rejects instead of resolving a sentinel.
  price.mockRejectedValue(new Error('zecPriceInfo is not a function'));
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: UNKNOWN_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  // The refused pair, exactly as a resolved sentinel would run it.
  expect(price).toHaveBeenCalledTimes(2);

  // The refusal under a possible bootstrap armed the follow-up.
  view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(4);
});

test('no stale crossing outlives its consumers', () => {
  jest.useFakeTimers();
  const timersBefore = jest.getTimerCount();
  const fresh = renderHook(() => usePriceStale(Date.now() - 1_000));
  fresh.unmount();
  // An unmounted wallet keeps no ten-minute clock ticking toward a
  // listener set that no longer exists.
  expect(jest.getTimerCount()).toBe(timersBefore);
});

test('two prices each keep their own stale crossing', () => {
  jest.useFakeTimers();
  const older = Date.now() - PRICE_STALE_MS + 5_000; // crosses in five seconds
  const newer = Date.now() - 1_000;

  const first = renderHook(() => usePriceStale(older));
  renderHook(() => usePriceStale(newer)); // must not evict the first
  expect(first.result.current).toBe(false);

  act(() => {
    jest.advanceTimersByTime(6_000);
  });
  // The first consumer re-rendered at its own crossing and dimmed.
  expect(first.result.current).toBe(true);
});

test('the muting rule has one spelling, usePriceHealth', () => {
  const sites = [
    '../components/Components/PriceFetcher.tsx',
    '../components/Components/CurrencyAmount.tsx',
    '../components/Send/Send.tsx',
  ];
  sites.forEach(site => {
    const source = fs.readFileSync(path.join(__dirname, site), 'utf8');
    expect(source).toMatch(/usePriceHealth\(/);
    // No site re-spells the disjunction from the raw stale bit.
    expect(source).not.toMatch(/usePriceStale\(/);
  });

  expect(renderHook(() => usePriceHealth(0)).result.current).toBe('absent');
  expect(renderHook(() => usePriceHealth(undefined)).result.current).toBe(
    'live', // a historical conversion has no health to lose
  );
  expect(renderHook(() => usePriceHealth(Date.now())).result.current).toBe(
    'live',
  );
  expect(
    renderHook(() => usePriceHealth(Date.now() - PRICE_STALE_MS - 60_000))
      .result.current,
  ).toBe('stale');
});
