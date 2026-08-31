/**
 * The staleness cue and the display-only ring's accessibility.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn().mockResolvedValue({ price: -1, error: 'refused' }),
}));

import 'react-native';
import React from 'react';
import { ReactTestRendererJSON } from 'react-test-renderer';
import { render, waitFor } from '@testing-library/react-native';
import PriceFetcher, {
  PriceTrafficDriver,
} from '../components/Components/PriceFetcher';
import QuoteRefreshRing from '../components/Components/QuoteRefreshRing';
import {
  PRICE_REFRESH_MAX_MS,
  priceFetcherStore,
} from '../components/Components/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { SelectServerEnum } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';

beforeEach(() => {
  priceFetcherStore.resetForTests();
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

const fetcherUi = (ctx: Ctx) => (
  <ContextAppLoadedProvider value={{ ...ctx, setZecPrice: jest.fn() }}>
    {PriceTrafficDriver ? <PriceTrafficDriver /> : <></>}
    <PriceFetcher />
  </ContextAppLoadedProvider>
);

type JsonNode = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;
const collect = (
  node: JsonNode,
  hits: ReactTestRendererJSON[],
  pick: (n: ReactTestRendererJSON) => boolean,
) => {
  if (!node || typeof node === 'string') return;
  if (Array.isArray(node)) {
    node.forEach(child => collect(child, hits, pick));
    return;
  }
  if (pick(node)) hits.push(node);
  (node.children ?? []).forEach(child => collect(child, hits, pick));
};

test('the stale arc keeps a color of its own, distinct from the track', () => {
  const staleCtx = makeCtx({
    zecPrice: { zecPrice: 33.33, date: Date.now() - 11 * 60_000 },
  });
  const view = render(fetcherUi(staleCtx));

  const ring = view.UNSAFE_getByType(QuoteRefreshRing);
  expect(ring.props.ringColor).not.toBe(ring.props.trackColor);
});

test('the display-only ring exposes no disabled tap stop', () => {
  const freshCtx = makeCtx({
    zecPrice: { zecPrice: 33.33, date: Date.now() },
  });
  const view = render(fetcherUi(freshCtx));

  const disabledStops: ReactTestRendererJSON[] = [];
  collect(
    view.toJSON(),
    disabledStops,
    n => n.props?.accessibilityState?.disabled === true,
  );
  expect(disabledStops).toEqual([]);
});

test('a stale price reaches screen readers as a label', () => {
  const staleCtx = makeCtx({
    zecPrice: { zecPrice: 33.33, date: Date.now() - 11 * 60_000 },
  });
  const view = render(fetcherUi(staleCtx));
  expect(view.getByLabelText('price-ring-stale')).toBeTruthy();
});

test('a current price reaches screen readers as a label too', () => {
  const freshCtx = makeCtx({
    zecPrice: { zecPrice: 33.33, date: Date.now() },
  });
  const view = render(fetcherUi(freshCtx));
  expect(view.getByLabelText('price-ring-live')).toBeTruthy();
});

test('the ring restarts on every refresh cycle, failed ones included', async () => {
  jest.useFakeTimers();
  const view = render(fetcherUi(makeCtx())); // every fetch here is refused
  await jest.advanceTimersByTimeAsync(0);
  const firstCycle = view.UNSAFE_getByType(QuoteRefreshRing).props.resetKey;

  // Past the longest draw plus both bounded attempts: a second refused
  // cycle has completed and redrawn.
  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MAX_MS + 61_000);
  const secondCycle = view.UNSAFE_getByType(QuoteRefreshRing).props.resetKey;

  // A frozen full ring would misreport a failing refresh as complete.
  expect(secondCycle).not.toBe(firstCycle);
  jest.useRealTimers();
});

test('a price that never arrived is announced as absent, not stale', async () => {
  const view = render(fetcherUi(makeCtx())); // no price has ever existed
  await waitFor(() =>
    expect(view.getByLabelText('price-ring-none')).toBeTruthy(),
  );
});

test('without the Nym opt-in no ring counts down to nothing', () => {
  const view = render(fetcherUi(makeCtx({ nym: false })));
  // A countdown beside a surface that will never fetch misleads; the
  // unconsented state renders no ring at all.
  expect(view.queryByTestId('pricefetcher.ring')).toBeNull();
});

test('a refusing transport hides the ring for the same reason', () => {
  const view = render(
    fetcherUi(
      makeCtx({
        mixnetView: {
          statusKey: 'mixnet.status.died',
          socks5Addr: null,
          narration: null,
          sendBlocked: true,
          recovery: 'reenable',
          reconnecting: false,
        },
      }),
    ),
  );
  // The cadence is paused by the verdict; a ring filling toward a
  // refresh that cannot come misleads exactly like the unconsented case.
  expect(view.queryByTestId('pricefetcher.ring')).toBeNull();
});
