jest.mock('@app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import {
  PRICE_REFRESH_MS,
  priceFetcherStore,
} from '@ui/widgets/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { SelectServerEnum } from '@app/AppState';
import { getZecPrice } from '@app/walletBackend';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';

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

const driverUi = (ctx: Ctx, setZecPrice: (p: number, d: number) => void) => (
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
  jest.restoreAllMocks();
});

test('a boot fetches at once, price age notwithstanding', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(
    driverUi(
      makeCtx({ zecPrice: { zecPrice: 42, date: Date.now() - 10_000 } }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);
});

test('the transport turning ready mid-session fetches at once', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(
    driverUi(makeCtx({ mixnetView: DIED_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(10_000);
  expect(price).not.toHaveBeenCalled();

  view.rerender(driverUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);
});

test('every gate-open return from the background fetches', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(driverUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(30_000);
  fireAppState('background');
  fireAppState('active');
  priceFetcherStore.foregroundReturned();
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
});

test('the next fetch follows the last one minute later', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(driverUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MS - 1_000);
  expect(price).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(2_000);
  expect(price).toHaveBeenCalledTimes(2);
});

test('every tick fires one minute after the last', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(driverUi(makeCtx(), setZecPrice));
  for (let tick = 0; tick < 5; tick++) {
    await jest.advanceTimersByTimeAsync(0);
    const { nextFetchAt, nextFetchDelayMs } = priceFetcherStore.snapshot();
    expect(nextFetchDelayMs).toBe(PRICE_REFRESH_MS);
    const before = price.mock.calls.length;
    await jest.advanceTimersByTimeAsync(nextFetchAt - Date.now() - 1_000);
    expect(price.mock.calls.length).toBe(before);
    await jest.advanceTimersByTimeAsync(2_000);
    expect(price.mock.calls.length).toBe(before + 1);
  }
});
