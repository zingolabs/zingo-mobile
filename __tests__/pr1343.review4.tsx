/**
 * Evidence tests for the fourth review of PR 1343. Each test
 * encodes the behavior the finding says the surface should have: it
 * fails on the broken code and passes once the finding is fixed.
 *
 * P1: a tick that fires into a refusing window must not wedge the timer.
 * P2: a wedged native call is retired after its TTL, so the store can
 *     issue a fresh request again.
 * P3: the bare 'active' event arms no cadence; the opened gate does.
 * P6: no market, no traffic: offline mode and non-mainnet chains fetch
 *     nothing, consent or not.
 * P7: repeated returns during a failure window are rate-bound.
 * P9: a mid-flight consent withdrawal leaves no dangling timer, and a
 *     re-grant restarts the cadence.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PriceFetcher, {
  PriceTrafficDriver,
} from '../components/Components/PriceFetcher';
import {
  PRICE_REFRESH_MAX_MS,
  priceFetcherStore,
} from '../components/Components/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { ChainNameEnum, SelectServerEnum } from '../app/AppState';
import { getZecPrice } from '../app/walletBackend';
import { MixnetView } from '../app/walletBackend/transforms/mixnetPresenter';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';

const price = getZecPrice as jest.MockedFunction<typeof getZecPrice>;

const READY_VIEW: MixnetView = {
  statusKey: 'mixnet.status.ready',
  socks5Addr: '127.0.0.1:1080',
  narration: null,
  sendBlocked: false,
  recovery: 'none',
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

const driverOnlyUi = (
  ctx: Ctx,
  setZecPrice: (p: number, d: number) => void,
) => (
  <ContextAppLoadedProvider value={{ ...ctx, setZecPrice }}>
    <PriceTrafficDriver />
  </ContextAppLoadedProvider>
);

const appStateHandlers: Array<(next: AppStateStatus) => void> = [];

beforeAll(() => {
  const RN: typeof import('react-native') = require('react-native');
  jest
    .spyOn(RN.AppState, 'addEventListener')
    .mockImplementation((event, handler) => {
      if (event === 'change') {
        appStateHandlers.push(handler);
      }
      return { remove: jest.fn() };
    });
});

const fireAppState = (next: AppStateStatus) => {
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

test('P1: a tick fired into a refusing window never wedges the cadence', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  const freshDate = Date.now();

  const ctx = makeCtx({
    mixnetView: READY_VIEW,
    zecPrice: { zecPrice: 42, date: freshDate },
  });
  const view = render(surfaceUi(ctx, setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot fetch, then the cadence

  // The transport dies; the pending tick fires into the refusing window.
  view.rerender(
    surfaceUi(
      makeCtx({
        mixnetView: DIED_VIEW,
        zecPrice: { zecPrice: 42, date: freshDate },
      }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 1_000);
  expect(price).toHaveBeenCalledTimes(1); // refused, correctly

  // The transport recovers: the cadence must come back.
  view.rerender(
    surfaceUi(
      makeCtx({
        mixnetView: READY_VIEW,
        zecPrice: { zecPrice: 42, date: freshDate },
      }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price.mock.calls.length).toBeGreaterThan(1);
});

test('P2: a wedged native call retires after its TTL and a fresh one runs', async () => {
  jest.useFakeTimers();
  price
    .mockImplementationOnce(() => new Promise(() => {})) // wedged forever
    .mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  // Entry: both bounded attempts ride the one wedged call. The next tick
  // lands after the corpse's TTL and retires it.
  await jest.advanceTimersByTimeAsync(60_000 + PRICE_REFRESH_MAX_MS + 1_000);

  expect(price.mock.calls.length).toBeGreaterThan(1); // a fresh call ran
  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});

test('P3: the bare active event arms no cadence behind the gate', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the mount entry

  fireAppState('background');
  fireAppState('active'); // the user may still sit on the biometric prompt
  await jest.advanceTimersByTimeAsync(61_000);
  expect(price).toHaveBeenCalledTimes(1); // no tick behind the gate

  priceFetcherStore.foregroundReturned(); // the gate opened
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
});

test('P6: no market, no traffic: offline and non-mainnet fetch nothing', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const offline = render(
    driverOnlyUi(
      makeCtx({ selectServer: SelectServerEnum.offline }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(61_000);
  expect(price).not.toHaveBeenCalled();
  offline.unmount();

  render(
    driverOnlyUi(
      makeCtx({
        info: { ...mockInfo, chainName: ChainNameEnum.testChainName },
      }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(61_000);
  expect(price).not.toHaveBeenCalled();
});

test('P7: repeated returns during a failure window are rate-bound', async () => {
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(2)); // failed entry

  fireAppState('background');
  fireAppState('active');
  priceFetcherStore.foregroundReturned(); // the first return fetches
  await waitFor(() => expect(price).toHaveBeenCalledTimes(4));

  fireAppState('background');
  fireAppState('active');
  priceFetcherStore.foregroundReturned(); // an immediate hop: bounded
  await flush();
  await flush();
  expect(price).toHaveBeenCalledTimes(4);
});

test('P9: a mid-flight consent withdrawal leaves no wedge for a re-grant', async () => {
  jest.useFakeTimers();
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

  const view = render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // entry in flight

  view.rerender(surfaceUi(makeCtx({ nym: false }), setZecPrice)); // Nym off
  land({ price: -1, error: 'refused' });
  await jest.advanceTimersByTimeAsync(60_000); // any dangling tick fires

  view.rerender(surfaceUi(makeCtx(), setZecPrice)); // Nym back on
  await jest.advanceTimersByTimeAsync(61_000);
  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});
