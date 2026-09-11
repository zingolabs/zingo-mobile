jest.mock('@app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PriceFetcher, { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import { priceFetcherStore } from '@ui/widgets/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { SelectServerEnum } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { getZecPrice } from '@app/walletBackend';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';

const READY_VIEW: MixnetView = {
  statusKey: 'mixnet.status.ready',
  socks5Addr: '127.0.0.1:1080',
  narration: null,
  sendBlocked: false,
  recovery: 'none',
  reconnecting: false,
};

const OFF_VIEW: MixnetView = {
  statusKey: 'mixnet.status.off',
  socks5Addr: null,
  narration: null,
  sendBlocked: false,
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

const UNKNOWN_VIEW: MixnetView = {
  statusKey: 'mixnet.status.unknown',
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
  mixnetView: READY_VIEW,
  ...over,
});

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
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(surfaceUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(2));

  view.rerender(driverOnlyUi(makeCtx(), setZecPrice));
  view.rerender(surfaceUi(makeCtx(), setZecPrice));
  await flush();
  await flush();
  expect(price).toHaveBeenCalledTimes(2);
});

test('a transport dying mid-flight stops the retry', async () => {
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

  view.rerender(surfaceUi(makeCtx({ mixnetView: DIED_VIEW }), setZecPrice));
  land({ price: -1, error: 'refused' });
  await flush();

  expect(price).toHaveBeenCalledTimes(1);
});

test('a return shortly after a failed fetch still fetches', async () => {
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(surfaceUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalledTimes(2));

  fireAppState('background');
  fireAppState('active');
  foregroundReturned();
  await flush();

  expect(price.mock.calls.length).toBeGreaterThan(2);
});

test('a died transport pauses the cadence until the status recovers', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  const view = render(
    surfaceUi(makeCtx({ mixnetView: DIED_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(61_000);
  expect(price).not.toHaveBeenCalled();

  view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalled();
});

test('a switched-off transport starts no fetch, the Nym toggle notwithstanding', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  for (const nym of [true, false]) {
    const view = render(
      surfaceUi(makeCtx({ nym, mixnetView: OFF_VIEW }), setZecPrice),
    );
    await flush();
    await flush();
    expect(price).not.toHaveBeenCalled();
    view.unmount();
  }
});

test('an unknowable transport starts no fetch', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx({ mixnetView: UNKNOWN_VIEW }), setZecPrice));
  await flush();
  await flush();
  expect(price).not.toHaveBeenCalled();
});

test('a route that keeps refusing keeps retrying, not dying', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  const entryCalls = price.mock.calls.length;
  expect(entryCalls).toBeGreaterThan(0);

  await jest.advanceTimersByTimeAsync(21 * 60_000);
  expect(price.mock.calls.length).toBeGreaterThan(entryCalls);
  expect(setZecPrice).not.toHaveBeenCalled();
});

test('the wallet fetches regardless of the displayed currency', async () => {
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(driverOnlyUi(makeCtx(), setZecPrice));
  await waitFor(() => expect(price).toHaveBeenCalled(), { timeout: 1500 });
  await waitFor(() =>
    expect(setZecPrice).toHaveBeenCalledWith(42, expect.any(Number)),
  );
});

test('a wedged native call is reused, never multiplied', async () => {
  jest.useFakeTimers();
  price.mockImplementation(() => new Promise(() => {}));
  const setZecPrice = jest.fn();
  seedDeps(setZecPrice);

  render(surfaceUi(makeCtx(), setZecPrice));
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
  expect(price).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(6_000);
  fireAppState('background');
  fireAppState('active');
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);

  foregroundReturned();
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
});
