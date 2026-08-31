/**
 * The Nym opt-in that starts price traffic.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
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
import { CurrencyEnum, SelectServerEnum } from '../app/AppState';
import { getZecPrice } from '../app/walletBackend';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import {
  MIXNET_STATUS_KEYS,
  MixnetStatusKey,
  MixnetView,
} from '../app/walletBackend/transforms/mixnetView';

const price = getZecPrice as jest.MockedFunction<typeof getZecPrice>;

const viewFor = (statusKey: MixnetStatusKey): MixnetView => ({
  statusKey,
  socks5Addr: null,
  narration: null,
  sendBlocked: true,
  recovery: 'none',
  reconnecting: false,
});

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

beforeEach(() => {
  price.mockReset();
  priceFetcherStore.resetForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

test('with the opt-in a ZEC-display wallet still fetches every tick', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(
    driverOnlyUi(makeCtx({ currency: CurrencyEnum.noCurrency }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the mount entry

  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 1_000);
  expect(price.mock.calls.length).toBeGreaterThanOrEqual(2); // the cadence, display or not
});

test('a full ring always means a refresh really is due', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // entry success: the ring keys here
  const keyAtSuccess = priceFetcherStore.snapshot().nextFetchAt;
  expect(keyAtSuccess).toBeGreaterThan(0); // the cadence armed and keyed

  // A hop inside the success cooldown lands on the re-arm branch of
  // foregroundReturned: a fresh full timer starts, and the ring's
  // deadline key MUST move with it, or the ring reads full while the
  // re-armed timer still runs.
  await jest.advanceTimersByTimeAsync(2_000);
  fireAppState('background');
  fireAppState('active');
  await jest.advanceTimersByTimeAsync(1_000);
  priceFetcherStore.foregroundReturned();
  const rearmed = priceFetcherStore.snapshot();
  expect(rearmed.nextFetchAt).not.toBe(keyAtSuccess);
  // The rekeyed ring fills toward the tick that will actually fire.
  expect(rearmed.nextFetchAt).toBe(Date.now() + rearmed.nextFetchDelayMs);
});

test('a return parked on a flight still arms the hop rate bound', async () => {
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

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // entry in flight

  // A real return lands inside the flight: it parks.
  fireAppState('background');
  fireAppState('active');
  priceFetcherStore.foregroundReturned();

  // The flight fails; the parked return fires its fetch (also failing).
  land({ price: -1, error: 'refused' });
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(4); // flight retry + parked pair

  // An immediate second hop during the failure window must be bounded
  // by the parked return-fetch, as the foregroundReturned doc promises.
  fireAppState('background');
  fireAppState('active');
  priceFetcherStore.foregroundReturned();
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(4); // rate-bound, no fifth call
});

const FETCH_EXPECTED: Record<string, boolean> = {
  'true|mixnet.status.off': false,
  'true|mixnet.status.bootstrapping': true,
  'true|mixnet.status.ready': true,
  'true|mixnet.status.died': false,
  'true|mixnet.status.unknown': true,
  'false|mixnet.status.off': true,
  'false|mixnet.status.bootstrapping': false,
  'false|mixnet.status.ready': false,
  'false|mixnet.status.died': false,
  'false|mixnet.status.unknown': true,
};

test('the opt-in resolves a fetch for every mixnet status', async () => {
  for (const nym of [true, false]) {
    for (const statusKey of MIXNET_STATUS_KEYS) {
      jest.useFakeTimers();
      price.mockReset();
      price.mockResolvedValue({ price: 42, error: '' });
      priceFetcherStore.resetForTests();
      const setZecPrice = jest.fn();

      const view = render(
        surfaceUi(makeCtx({ nym, mixnetView: viewFor(statusKey) }), setZecPrice),
      );
      await jest.advanceTimersByTimeAsync(0);

      expect(price.mock.calls.length > 0).toBe(FETCH_EXPECTED[`${nym}|${statusKey}`]);
      view.unmount();
      jest.useRealTimers();
    }
  }
});

test('a re-render behind the closed gate emits no traffic', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the mount entry
  const priceDate = Date.now();

  await jest.advanceTimersByTimeAsync(2_000);
  fireAppState('background');
  await jest.advanceTimersByTimeAsync(120_000); // the price goes old away
  fireAppState('active'); // the user sits on the biometric prompt

  // Any context change re-renders the driver while the gate is closed.
  view.rerender(
    surfaceUi(
      makeCtx({ zecPrice: { zecPrice: 42, date: priceDate } }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // nothing behind the gate

  priceFetcherStore.foregroundReturned(); // the gate opened
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
});
