/**
 * What may start price traffic.
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
import { priceFetcherStore } from '../components/Components/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { SelectServerEnum } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { getZecPrice } from '../app/walletBackend';
import {
  INITIAL_MIXNET_VIEW,
  OFF_MIXNET_VIEW,
  MixnetView,
} from '../app/walletBackend/transforms/mixnetPresenter';

const DIED_VIEW: MixnetView = {
  statusKey: 'mixnet.status.died',
  socks5Addr: null,
  narration: null,
  sendBlocked: true,
  recovery: 'reenable',
  reconnecting: false,
};

const price = getZecPrice as jest.MockedFunction<typeof getZecPrice>;

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

// Renders the production composition: the driver owns the lifecycle, the
// fetcher only displays. Pre-fix the driver does not exist and the
// fetcher owns both, so the old code paths still run.
const surfaceUi = (ctx: Ctx, setZecPrice: (p: number, d: number) => void) => (
  <ContextAppLoadedProvider value={{ ...ctx, setZecPrice }}>
    {PriceTrafficDriver ? <PriceTrafficDriver /> : <></>}
    <PriceFetcher />
  </ContextAppLoadedProvider>
);

const driverOnlyUi = (
  ctx: Ctx,
  setZecPrice: (p: number, d: number) => void,
) => (
  <ContextAppLoadedProvider value={{ ...ctx, setZecPrice }}>
    {PriceTrafficDriver ? <PriceTrafficDriver /> : <></>}
  </ContextAppLoadedProvider>
);

const seedDeps = (setZecPrice: (p: number, d: number) => void) => {
  priceFetcherStore.setDeps({
    setZecPrice,
    mixnetStatusKey: 'mixnet.status.unknown',
    nymSelected: true,
    priceFetchable: true,
  });
};

const foregroundReturned = () => priceFetcherStore.foregroundReturned();

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

test('remounting display fetchers starts no new fetch', async () => {
  // The driver owns the session; screens mount and unmount fetchers
  // freely (a settings toggle, a navigation) and none of that is a
  // boot. Only a driver detach ends the session, and the next attach
  // fetches by the cadence spec.
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(surfaceUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(2)); // entry refused

  view.rerender(driverOnlyUi(makeCtx(), setZecPrice)); // the screen closes
  view.rerender(surfaceUi(makeCtx(), setZecPrice)); // and reopens
  await flush();
  await flush();
  expect(price).toHaveBeenCalledTimes(2);
});

test('a withdrawn opt-in stops the mid-flight retry', async () => {
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

  const view = render(surfaceUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1));

  view.rerender(surfaceUi(makeCtx({ nym: false }), setZecPrice)); // Nym off
  land({ price: -1, error: 'refused' });
  await flush();

  expect(price).toHaveBeenCalledTimes(1); // no retry after the withdrawal
});

test('a return shortly after a failed fetch still fetches', async () => {
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(surfaceUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(2)); // failed entry

  fireAppState('background');
  fireAppState('active');
  foregroundReturned();
  await flush();

  // Only a fresh price excuses a return from fetching; a failure never.
  expect(price.mock.calls.length).toBeGreaterThan(2);
});

test('a died transport pauses the cadence until the status recovers', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  // Nym consent held, mixnet died: the backend refuses every price fetch
  // by the route rule, so attempts are pure waste.
  const view = render(
    surfaceUi(makeCtx({ mixnetView: DIED_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(61_000);
  expect(price).not.toHaveBeenCalled();

  view.rerender(
    surfaceUi(makeCtx({ mixnetView: INITIAL_MIXNET_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalled();
});

test('a switch-off fetches the price over clearnet', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(
    surfaceUi(
      makeCtx({ nym: false, mixnetView: OFF_MIXNET_VIEW }),
      setZecPrice,
    ),
  );
  await waitFor(() =>
    expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number)),
  );
});

test('opting in with the transport still off emits no clearnet fetch', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(
    surfaceUi(makeCtx({ nym: true, mixnetView: OFF_MIXNET_VIEW }), setZecPrice),
  );
  await flush();
  await flush();
  expect(price).not.toHaveBeenCalled();
});

test('an opted-in wallet fetches regardless of the displayed currency', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  // No PriceFetcher mounted anywhere: the wallet shows ZEC. The driver
  // alone carries the session's price traffic.
  render(driverOnlyUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalled(), { timeout: 1500 });
  await waitFor(() =>
    expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number)),
  );
});

test('a wedged native call is reused, never multiplied', async () => {
  jest.useFakeTimers();
  price.mockImplementation(() => new Promise(() => {})); // wedged forever
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(surfaceUi(makeCtx(), setZecPrice));
  // Two bounded attempts, a timer tick, and two more bounded attempts.
  await jest.advanceTimersByTimeAsync(30_000 + 30_000 + 60_000 + 30_000);

  expect(price).toHaveBeenCalledTimes(1);
});

test('the raw active event fetches nothing; the opened gate does', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the mount entry

  await jest.advanceTimersByTimeAsync(6_000); // past any cooldown
  fireAppState('background');
  fireAppState('active');
  await jest.advanceTimersByTimeAsync(0);
  // A locked wallet must not emit price traffic on the bare return.
  expect(price).toHaveBeenCalledTimes(1);

  foregroundReturned(); // LoadedApp's gate opened
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
});
