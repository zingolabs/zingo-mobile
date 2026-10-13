jest.mock('@app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import * as fs from 'fs';
import * as path from 'path';
import 'react-native';
import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import PriceFetcher, { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import {
  PRICE_REFRESH_MAX_MS,
  priceFetcherStore,
  usePriceHealth,
} from '@ui/widgets/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { ChainNameEnum, SelectServerEnum, offlineServer } from '@app/AppState';
import { getZecPrice } from '@app/walletBackend';
import { mockZecQuote } from '../__mocks__/dataMocks/mockZecPriceOutcome';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { MixnetTransportView } from '@app/walletBackend/transforms/mixnetView';

const price = getZecPrice as jest.MockedFunction<typeof getZecPrice>;

const READY_VIEW: MixnetTransportView = {
  kind: 'transport',
  statusKey: 'mixnet.status.ready',
  socks5Addr: '127.0.0.1:1080',
  narration: null,
  sendBlocked: false,
  recovery: 'none',
  reconnecting: false,
  noNetwork: false,
};
const DIED_VIEW: MixnetTransportView = {
  kind: 'transport',
  statusKey: 'mixnet.status.died',
  socks5Addr: null,
  narration: null,
  sendBlocked: true,
  recovery: 'reenable',
  reconnecting: false,
  noNetwork: false,
};

type Ctx = typeof defaultAppContextLoaded;
const makeCtx = (over?: Partial<Ctx>): Ctx => ({
  ...defaultAppContextLoaded,
  translate: (k: string) => k,
  zecPrice: { zecPrice: 0, date: 0 },
  info: mockInfo,
  selectServer: SelectServerEnum.auto,
  mixnetView: READY_VIEW,
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
  price.mockResolvedValue(mockZecQuote);
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(priceFetcherStore.snapshot().nextFetchAt).toBeGreaterThan(0);

  const listener = jest.fn();
  const unsubscribe = priceFetcherStore.subscribe(listener);
  view.rerender(
    surfaceUi(
      makeCtx({
        mixnetView: READY_VIEW,
        server: offlineServer(ChainNameEnum.noneChainName),
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
  price.mockResolvedValue(mockZecQuote);
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);

  view.rerender(
    surfaceUi(
      makeCtx({
        mixnetView: READY_VIEW,
        server: offlineServer(ChainNameEnum.noneChainName),
      }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 60_000);
  expect(price).toHaveBeenCalledTimes(1);
  expect(priceFetcherStore.snapshot().nextFetchAt).toBe(0);

  view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);
  expect(priceFetcherStore.snapshot().nextFetchAt).toBeGreaterThan(Date.now());
});

test('a flapping transport rides the cadence, one fetch per window', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue(mockZecQuote);
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(1);

  for (let flap = 0; flap < 2; flap++) {
    view.rerender(surfaceUi(makeCtx({ mixnetView: DIED_VIEW }), setZecPrice));
    await jest.advanceTimersByTimeAsync(6_000);
    view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
    await jest.advanceTimersByTimeAsync(6_000);
  }
  expect(price).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS);
  expect(price.mock.calls.length).toBeGreaterThan(1);
});

test('a rejected native call reads as a refusal, not a vanish', async () => {
  jest.useFakeTimers();
  price.mockRejectedValue(new Error('zecPriceInfo is not a function'));
  const setZecPrice = jest.fn();

  render(surfaceUi(makeCtx(), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2);

  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 1_000);
  expect(price).toHaveBeenCalledTimes(4);
});

test('the muting rule has one spelling, usePriceHealth', () => {
  const sites = [
    '../ui/widgets/PriceFetcher.tsx',
    '../ui/widgets/CurrencyAmount.tsx',
    '../screens/Send/Send.tsx',
  ];
  sites.forEach(site => {
    const source = fs.readFileSync(path.join(__dirname, site), 'utf8');
    expect(source).toMatch(/usePriceHealth\(/);
    expect(source).not.toMatch(/usePriceStale\(/);
  });

  expect(renderHook(() => usePriceHealth(0)).result.current).toBe('absent');
  expect(renderHook(() => usePriceHealth(undefined)).result.current).toBe(
    'live',
  );
  expect(renderHook(() => usePriceHealth(Date.now())).result.current).toBe(
    'live',
  );
  // Age alone never mutes: only a failed fetch does.
  expect(
    renderHook(() => usePriceHealth(Date.now() - 24 * 3_600_000)).result
      .current,
  ).toBe('live');
});

test('a failed fetch mutes the price until one succeeds', async () => {
  jest.useFakeTimers();
  price.mockRejectedValue(new Error('down'));
  const date = Date.now();
  const health = renderHook(() => usePriceHealth(date));

  render(surfaceUi(makeCtx(), jest.fn()));
  await jest.advanceTimersByTimeAsync(0);
  expect(health.result.current).toBe('stale');

  price.mockResolvedValue(mockZecQuote);
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 1_000);
  expect(health.result.current).toBe('live');
});
