jest.mock('@app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import { render, renderHook, waitFor } from '@testing-library/react-native';
import PriceFetcher, { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import {
  PRICE_REFRESH_MS,
  priceFetcherStore,
  usePriceFetcherStore,
} from '@ui/widgets/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { SelectServerEnum } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { getZecPrice } from '@app/walletBackend';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';

const price = getZecPrice as jest.MockedFunction<typeof getZecPrice>;

const READY_VIEW: MixnetView = {
  statusKey: 'mixnet.status.ready',
  socks5Addr: '127.0.0.1:1080',
  narration: null,
  sendBlocked: false,
  recovery: 'none',
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
  mixnetView: READY_VIEW,
  ...over,
});

const fetcherUi = (ctx: Ctx, setZecPrice: (p: number, d: number) => void) => (
  <ContextAppLoadedProvider value={{ ...ctx, setZecPrice }}>
    <PriceTrafficDriver />
    <PriceFetcher />
  </ContextAppLoadedProvider>
);

const foregroundReturned = () => priceFetcherStore.foregroundReturned();

const seedDeps = (setZecPrice: (p: number, d: number) => void) => {
  priceFetcherStore.setDeps({
    setZecPrice,
    mixnetStatusKey: 'mixnet.status.off',
    priceFetchable: true,
  });
};

const appStateHandlers: Array<(next: AppStateStatus) => void> = [];
const removeSpies: jest.Mock[] = [];

beforeAll(() => {
  const RN: typeof import('react-native') = require('react-native');
  jest
    .spyOn(RN.AppState, 'addEventListener')
    .mockImplementation((event, handler) => {
      if (event === 'change') {
        appStateHandlers.push(handler);
      }
      const remove = jest.fn();
      removeSpies.push(remove);
      return { remove };
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

test('a cold start with no price fetches once the surface mounts', async () => {
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

test('observing the store snapshot never starts price traffic', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  seedDeps(jest.fn());

  renderHook(() => usePriceFetcherStore());
  await jest.advanceTimersByTimeAsync(61_000);

  expect(price).not.toHaveBeenCalled();
});

test('an ios interruption neither refetches nor disturbs the surface', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1));

  fireAppState('inactive');
  fireAppState('active');
  await flush();
  expect(price).toHaveBeenCalledTimes(1);
});

test('the AppState subscription dies with the last mounted fetcher', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(fetcherUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalled());

  view.unmount();
  expect(removeSpies[removeSpies.length - 1]).toHaveBeenCalled();
});

test('a throwing fetch neither pins loading nor kills the timer', async () => {
  jest.useFakeTimers();
  price
    .mockRejectedValueOnce(new Error('ffi never settled'))
    .mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);

  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MS + 1_000);
  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});

test('a remounted surface with no price fetches instead of waiting a tick', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(fetcherUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);
  view.unmount();

  await jest.advanceTimersByTimeAsync(6_000);
  seedDeps(setZecPrice);
  render(fetcherUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
});

test('a hung fetch releases the surface and recovers once it settles', async () => {
  jest.useFakeTimers();
  let settleLate: (v: { price: number; error: string }) => void = () => {};
  price
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          settleLate = resolve;
        }),
    )
    .mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(61_000);
  expect(priceFetcherStore.snapshot().loading).toBe(false);

  settleLate({ price: -1, error: 'late' });
  await jest.advanceTimersByTimeAsync(0);
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MS + 1_000);
  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});

test('a return landing inside a flight still produces the return fetch', async () => {
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
  fireAppState('active');
  foregroundReturned();
  land({ price: -1, error: 'refused' });
  await flush();
  await flush();

  expect(price.mock.calls.length).toBeGreaterThanOrEqual(3);
});

test('a detach mid-flight stops the retry and the write', async () => {
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

  view.unmount();
  land({ price: 42, error: '' });
  await flush();

  expect(price).toHaveBeenCalledTimes(1);
  expect(setZecPrice).not.toHaveBeenCalled();
});

test('rapid app hops inside the cooldown do not multiply fetches', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(1));

  fireAppState('background');
  fireAppState('active');
  foregroundReturned();
  fireAppState('background');
  fireAppState('active');
  foregroundReturned();
  await flush();

  expect(price).toHaveBeenCalledTimes(1);
});

test('the Nym toggle off leaves the price surface on the ready mixnet', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(fetcherUi(makeCtx({ nym: false }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);

  expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number));
});
