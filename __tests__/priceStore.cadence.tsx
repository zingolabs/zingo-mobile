/**
 * The ratified price cadence.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import { PriceTrafficDriver } from '../components/Components/PriceFetcher';
import {
  PRICE_REFRESH_MAX_MS,
  PRICE_REFRESH_MIN_MS,
  priceFetcherStore,
} from '../components/Components/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { SelectServerEnum } from '../app/AppState';
import { getZecPrice } from '../app/walletBackend';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';

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

  // The context already holds a seconds-old price: the boot still fetches.
  render(
    driverUi(
      makeCtx({ zecPrice: { zecPrice: 42, date: Date.now() - 10_000 } }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);
});

test('turning Nym on mid-session fetches at once', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(driverUi(makeCtx({ nym: false }), setZecPrice));
  await jest.advanceTimersByTimeAsync(10_000);
  expect(price).not.toHaveBeenCalled();

  view.rerender(driverUi(makeCtx({ nym: true }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);
});

test('every gate-open return from the background fetches', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(driverUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot fetch

  await jest.advanceTimersByTimeAsync(30_000); // past the burst cooldown
  fireAppState('background');
  fireAppState('active');
  priceFetcherStore.foregroundReturned();
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2); // the return fetch
});

test('the next fetch follows the last at the drawn uniform delay', async () => {
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(0.5); // draw = 7.5 minutes
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(driverUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1); // the boot fetch

  const drawn =
    PRICE_REFRESH_MIN_MS + 0.5 * (PRICE_REFRESH_MAX_MS - PRICE_REFRESH_MIN_MS);
  await jest.advanceTimersByTimeAsync(drawn - 1_000);
  expect(price).toHaveBeenCalledTimes(1); // nothing before the draw

  await jest.advanceTimersByTimeAsync(2_000);
  expect(price).toHaveBeenCalledTimes(2); // the tick at the draw
});

test('each drawn delay stays inside the five-to-ten-minute window', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  render(driverUi(makeCtx(), setZecPrice));
  for (let tick = 0; tick < 5; tick++) {
    await jest.advanceTimersByTimeAsync(0);
    const { nextFetchAt, nextFetchDelayMs } = priceFetcherStore.snapshot();
    expect(nextFetchDelayMs).toBeGreaterThanOrEqual(PRICE_REFRESH_MIN_MS);
    expect(nextFetchDelayMs).toBeLessThanOrEqual(PRICE_REFRESH_MAX_MS);
    const before = price.mock.calls.length;
    await jest.advanceTimersByTimeAsync(nextFetchAt - Date.now() - 1_000);
    expect(price.mock.calls.length).toBe(before); // nothing before the draw
    await jest.advanceTimersByTimeAsync(2_000);
    expect(price.mock.calls.length).toBe(before + 1); // the tick, on time
  }
});
