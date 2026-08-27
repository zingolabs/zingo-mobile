/**
 * Evidence tests for the third review round on PR 1343. Each test encodes
 * the behavior the finding says the surface should have: it fails on the
 * broken code and passes once the finding is fixed.
 *
 * N2: the attach/entry path is rate-limited against remount storms.
 * N3: a withdrawn Nym consent stops the mid-flight retry and the write.
 * N4: a return shortly after a FAILED fetch still fetches.
 * N5: an 'off' or 'died' transport pauses the cadence instead of feeding
 *     it refusals forever, and a recovering status resumes it.
 * N6: price traffic belongs to the wallet session (the driver), not to
 *     whichever currency the screens happen to display.
 * N9: a wedged native call is never multiplied: one orphan, reused.
 * N10: the raw AppState 'active' event fetches nothing; the foreground
 *      gate's opening is what triggers the return fetch.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
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
import { getZecPrice } from '../app/walletBackend';
import {
  INITIAL_MIXNET_VIEW,
  OFF_MIXNET_VIEW,
} from '../app/walletBackend/transforms/mixnetPresenter';

const price = getZecPrice as jest.MockedFunction<typeof getZecPrice>;

type Ctx = typeof defaultAppContextLoaded;
const makeCtx = (over?: Partial<Ctx>): Ctx => ({
  ...defaultAppContextLoaded,
  translate: (k: string) => k,
  zecPrice: { zecPrice: 0, date: 0 },
  nym: true,
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

  (priceFetcherStore.setDeps as any)({
    setZecPrice,
    mixnetStatusKey: 'mixnet.status.unknown',
    priceDate: 0,
    nymSelected: true,
  });
};

const foregroundReturned = () => {

  (priceFetcherStore as any).foregroundReturned?.();
};

const appStateHandlers: Array<(next: string) => void> = [];

beforeAll(() => {
  const { AppState } = require('react-native');
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation(((event: string, handler: (next: string) => void) => {
      if (event === 'change') {
        appStateHandlers.push(handler);
      }
      return { remove: jest.fn() };

    }) as any);
});

const fireAppState = (next: string) => {
  [...appStateHandlers].forEach(h => h(next));
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  price.mockReset();

  (priceFetcherStore as any).resetForTests?.();
});

afterEach(() => {
  jest.useRealTimers();
});

test('N2: an immediate remount inside the cooldown starts no new fetch', async () => {
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(surfaceUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(2)); // entry refused
  view.unmount();

  render(surfaceUi(makeCtx(), setZecPrice)); // a settings toggle remount
  await flush();
  await flush();
  expect(price).toHaveBeenCalledTimes(2);
});

test('N3: a withdrawn consent stops the mid-flight retry', async () => {
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

test('N4: a return shortly after a failed fetch still fetches', async () => {
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

test('N5: an off transport pauses the cadence until the status recovers', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  // Nym consent held, mixnet session-disabled: the backend refuses every
  // price fetch by the route rule, so attempts are pure waste.
  const view = render(
    surfaceUi(makeCtx({ mixnetView: OFF_MIXNET_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(61_000);
  expect(price).not.toHaveBeenCalled();

  view.rerender(
    surfaceUi(makeCtx({ mixnetView: INITIAL_MIXNET_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalled();
});

test('N6: a consented wallet fetches regardless of the displayed currency', async () => {
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

test('N9: a wedged native call is reused, never multiplied', async () => {
  jest.useFakeTimers();
  price.mockImplementation(() => new Promise(() => {})); // wedged forever
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(surfaceUi(makeCtx(), setZecPrice));
  // Two bounded attempts, a timer tick, and two more bounded attempts.
  await jest.advanceTimersByTimeAsync(30_000 + 30_000 + 60_000 + 30_000);

  expect(price).toHaveBeenCalledTimes(1);
});

test('N10: the raw active event fetches nothing; the opened gate does', async () => {
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
