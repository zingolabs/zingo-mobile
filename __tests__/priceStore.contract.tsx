/**
 * The store's observable contract.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn(),
}));

import * as fs from 'fs';
import * as path from 'path';
import 'react-native';
import type { AppStateStatus } from 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import PriceFetcher, {
  PriceTrafficDriver,
} from '../components/Components/PriceFetcher';
import QuoteRefreshRing from '../components/Components/QuoteRefreshRing';
import { priceFetcherStore } from '../components/Components/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { SelectServerEnum } from '../app/AppState';
import { getZecPrice } from '../app/walletBackend';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import {
  INITIAL_MIXNET_VIEW,
  MIXNET_STATUS_KEYS,
  MixnetView,
  transportDisposition,
} from '../app/walletBackend/transforms/mixnetPresenter';

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

beforeEach(() => {
  price.mockReset();
  priceFetcherStore.resetForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

test('withdrawing the opt-in takes the ring down', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(view.queryByTestId('pricefetcher.ring')).toBeTruthy();

  // Settings turns Nym off: the driver's next deps write must emit, or
  // an idle wallet keeps a ring filling toward a refusal forever.
  view.rerender(
    surfaceUi(makeCtx({ mixnetView: READY_VIEW, nym: false }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(view.queryByTestId('pricefetcher.ring')).toBeNull();
});

test('an entry flight with no armed deadline never reads full', async () => {
  jest.useFakeTimers();
  price.mockImplementation(() => new Promise(() => {})); // in flight
  const setZecPrice = jest.fn();

  // A prior price exists, so the ring (not the spinner) renders during
  // the boot flight, before any deadline is drawn.
  const view = render(
    surfaceUi(
      makeCtx({ zecPrice: { zecPrice: 42, date: Date.now() - 60_000 } }),
      setZecPrice,
    ),
  );
  await jest.advanceTimersByTimeAsync(0);

  const ring = view.UNSAFE_getByType(QuoteRefreshRing);
  expect(ring.props.startProgress).toBeLessThan(1);
});

test('the ready follow-up never re-arms itself', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: -1, error: 'refused' });
  const setZecPrice = jest.fn();

  const view = render(
    surfaceUi(makeCtx({ mixnetView: INITIAL_MIXNET_VIEW }), setZecPrice),
  );
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(2); // the boot pair, refused: arms

  view.rerender(surfaceUi(makeCtx({ mixnetView: READY_VIEW }), setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(price).toHaveBeenCalledTimes(4); // the follow-up pair, refused

  // The follow-up's own refusal must not have re-armed: nothing more
  // fires until the cadence tick, minutes away.
  await jest.advanceTimersByTimeAsync(10_000);
  expect(price).toHaveBeenCalledTimes(4);
});

test('every status key classifies under the disposition switch', () => {
  const dispositions = MIXNET_STATUS_KEYS.map(key => transportDisposition(key));
  dispositions.forEach(d =>
    expect(['refusing', 'possibleBootstrap', 'serving']).toContain(d),
  );
  expect(dispositions).toContain('refusing');
  expect(dispositions).toContain('possibleBootstrap');
  expect(dispositions).toContain('serving');
});

test('the driver writes deps when an input moves, not per render', async () => {
  jest.useFakeTimers();
  price.mockResolvedValue({ price: 42, error: '' });
  const setDepsSpy = jest.spyOn(priceFetcherStore, 'setDeps');
  const setZecPrice = jest.fn();
  const ctx = makeCtx({ mixnetView: READY_VIEW });

  const view = render(driverOnlyUi(ctx, setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  const writes = setDepsSpy.mock.calls.length;
  expect(writes).toBeGreaterThan(0);

  // An unrelated context change re-renders the driver with the same
  // five inputs: no new deps write may follow.
  view.rerender(driverOnlyUi({ ...ctx }, setZecPrice));
  await jest.advanceTimersByTimeAsync(0);
  expect(setDepsSpy.mock.calls.length).toBe(writes);
  setDepsSpy.mockRestore();
});

test('the snapshot carries exactly its four read fields', () => {
  expect(Object.keys(priceFetcherStore.snapshot()).sort()).toEqual([
    'loading',
    'nextFetchAt',
    'nextFetchDelayMs',
    'surfaceActive',
  ]);
});

test('the snapshot keeps its identity between emits', () => {
  const first = priceFetcherStore.snapshot();
  expect(priceFetcherStore.snapshot()).toBe(first);
});

test('no any-casts in the price suites and no null in the store', () => {
  const suites = [
    'priceStore.cadence.tsx',
    'priceDisplay.ring.tsx',
    'priceStore.lifecycle.tsx',
    'priceStore.trafficGuards.tsx',
    'priceStore.wedgeGuards.tsx',
    'priceStore.optIn.tsx',
    'priceStore.nativeCall.tsx',
    'priceStore.contract.tsx',
    'priceStore.recovery.tsx',
    'Send.priceCta.unit.tsx',
    'PriceFetcher.snapshot.tsx',
  ];
  // Built by concatenation, so this file's own source stays clean of
  // the pattern it hunts.
  const anyCast = new RegExp('as' + ' any');
  suites.forEach(suite => {
    const source = fs.readFileSync(path.join(__dirname, suite), 'utf8');
    expect(anyCast.test(source)).toBe(false);
  });
  const store = fs.readFileSync(
    path.join(__dirname, '../components/Components/priceFetcherStore.ts'),
    'utf8',
  );
  expect(new RegExp('\\bnul' + 'l\\b').test(store)).toBe(false);
});

test('the ring is display-only', () => {
  const ringSource = fs.readFileSync(
    path.join(__dirname, '../components/Components/QuoteRefreshRing.tsx'),
    'utf8',
  );
  expect(new RegExp('Pres' + 'sable').test(ringSource)).toBe(false);
  expect(new RegExp('on' + 'Press').test(ringSource)).toBe(false);

  const view = render(
    <QuoteRefreshRing
      size={22}
      color="#ffffff"
      trackColor="#333333"
      durationMs={60_000}
      resetKey={1}
      accessibilityLabel="ring"
      testID="h10.ring"
    />,
  );
  expect(view.getByTestId('h10.ring').props.accessibilityRole).toBe('image');
});
