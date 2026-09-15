jest.mock('@app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import PriceFetcher, { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import {
  PRICE_REFRESH_MS,
  priceFetcherStore,
} from '@ui/widgets/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { CurrencyEnum, SelectServerEnum } from '@app/AppState';
import { getZecPrice } from '@app/walletBackend';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import {
  MIXNET_STATUS_KEYS,
  MixnetStatusKey,
  MixnetView,
} from '@app/walletBackend/transforms/mixnetView';

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
  mixnetView: viewFor('mixnet.status.ready'),
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

test('a ZEC-display wallet still fetches every tick', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(
    driverOnlyUi(makeCtx({ currency: CurrencyEnum.noCurrency }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MS + 1_000);
  expect(price.mock.calls.length).toBeGreaterThanOrEqual(2);
});

test('a full ring always means a refresh really is due', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);
  const keyAtSuccess = priceFetcherStore.snapshot().nextFetchAt;
  expect(keyAtSuccess).toBeGreaterThan(0);

  await jest.advanceTimersByTimeAsync(2_000);
  fireAppState('background');
  fireAppState('active');
  await jest.advanceTimersByTimeAsync(1_000);
  priceFetcherStore.foregroundReturned();
  const rearmed = priceFetcherStore.snapshot();
  expect(rearmed.nextFetchAt).not.toBe(keyAtSuccess);
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
  expect(price).toHaveBeenCalledTimes(1);

  fireAppState('background');
  fireAppState('active');
  priceFetcherStore.foregroundReturned();

  land({ price: -1, error: 'refused' });
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(4);

  fireAppState('background');
  fireAppState('active');
  priceFetcherStore.foregroundReturned();
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(4);
});

const FETCH_EXPECTED: Record<MixnetStatusKey, boolean> = {
  'mixnet.status.off': false,
  'mixnet.status.bootstrapping': false,
  'mixnet.status.ready': true,
  'mixnet.status.died': false,
  'mixnet.status.unknown': false,
};

test('the transport status alone resolves a fetch, the Nym toggle notwithstanding', async () => {
  for (const nym of [true, false]) {
    for (const statusKey of MIXNET_STATUS_KEYS) {
      jest.useFakeTimers();
      price.mockReset();
      price.mockResolvedValue({ price: 42, error: '' });
      priceFetcherStore.resetForTests();
      const setZecPrice = jest.fn();

      const view = render(
        surfaceUi(
          makeCtx({ nym, mixnetView: viewFor(statusKey) }),
          setZecPrice,
        ),
      );
      await jest.advanceTimersByTimeAsync(0);

      expect(price.mock.calls.length > 0).toBe(FETCH_EXPECTED[statusKey]);
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
  expect(price).toHaveBeenCalledTimes(1);
  const priceDate = Date.now();

  await jest.advanceTimersByTimeAsync(2_000);
  fireAppState('background');
  await jest.advanceTimersByTimeAsync(120_000);
  fireAppState('active');

  view.rerender(
    surfaceUi(
      makeCtx({ zecPrice: { zecPrice: 42, date: priceDate } }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);

  priceFetcherStore.foregroundReturned();
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
});
