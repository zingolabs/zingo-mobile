jest.mock('@app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn().mockResolvedValue({ price: -1, error: 'refused' }),
}));

import 'react-native';
import React from 'react';
import { ReactTestRendererJSON } from 'react-test-renderer';
import { render, waitFor } from '@testing-library/react-native';
import PriceFetcher, { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import QuoteRefreshRing from '@ui/primitives/QuoteRefreshRing';
import {
  PRICE_REFRESH_MS,
  priceFetcherStore,
} from '@ui/widgets/priceFetcherStore';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { SelectServerEnum } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';

beforeEach(() => {
  priceFetcherStore.resetForTests();
});

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
  const view = render(
    fetcherUi(makeCtx({ zecPrice: { zecPrice: 33.33, date: Date.now() } })),
  );
  await jest.advanceTimersByTimeAsync(0);
  const firstCycle = view.UNSAFE_getByType(QuoteRefreshRing).props.resetKey;

  await jest.advanceTimersByTimeAsync(PRICE_REFRESH_MS + 61_000);
  const secondCycle = view.UNSAFE_getByType(QuoteRefreshRing).props.resetKey;

  expect(secondCycle).not.toBe(firstCycle);
  jest.useRealTimers();
});

test('a price that never arrived renders no ring', async () => {
  const view = render(fetcherUi(makeCtx()));
  await waitFor(() =>
    expect(view.queryByTestId('pricefetcher.ring')).toBeNull(),
  );
});

test('a switched-off transport shows no ring', () => {
  const view = render(
    fetcherUi(
      makeCtx({
        mixnetView: {
          statusKey: 'mixnet.status.off',
          socks5Addr: null,
          narration: null,
          sendBlocked: false,
          recovery: 'reenable',
          reconnecting: false,
        },
      }),
    ),
  );
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
  expect(view.queryByTestId('pricefetcher.ring')).toBeNull();
});
