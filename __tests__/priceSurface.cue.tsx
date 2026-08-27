/**
 * Evidence tests for the PR 1343 review findings in the staleness cue and
 * the display-only ring's accessibility. Each test encodes the behavior
 * the finding says the surface should have: it fails on the broken code
 * and passes once the finding is fixed.
 *
 * F8 (ring half): the muted arc must stay distinguishable from the track.
 * F9: the display-only ring is not an unnamed disabled tap stop, and the
 *     staleness cue reaches screen readers as a label.
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn().mockResolvedValue({ price: -1, error: 'refused' }),
}));

import 'react-native';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PriceFetcher from '../components/Components/PriceFetcher';
import QuoteRefreshRing from '../components/Components/QuoteRefreshRing';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';

type Ctx = typeof defaultAppContextLoaded;
const makeCtx = (over?: Partial<Ctx>): Ctx => ({
  ...defaultAppContextLoaded,
  translate: (k: string) => k,
  zecPrice: { zecPrice: 0, date: 0 },
  ...over,
});

const fetcherUi = (ctx: Ctx) => (
  <ContextAppLoadedProvider value={ctx}>
    <PriceFetcher setZecPrice={jest.fn()} />
  </ContextAppLoadedProvider>
);


type JsonNode = any;
const collect = (node: JsonNode, hits: JsonNode[], pick: (n: JsonNode) => boolean) => {
  if (!node || typeof node !== 'object') return;
  if (pick(node)) hits.push(node);
  (node.children ?? []).forEach((child: JsonNode) => collect(child, hits, pick));
};

test('F8: the stale arc keeps a color of its own, distinct from the track', () => {
  const staleCtx = makeCtx({
    zecPrice: { zecPrice: 33.33, date: Date.now() - 6 * 60_000 },
  });
  const view = render(fetcherUi(staleCtx));

  const ring = view.UNSAFE_getByType(QuoteRefreshRing);
  expect(ring.props.ringColor).not.toBe(ring.props.trackColor);
});

test('F9: the display-only ring exposes no disabled tap stop', () => {
  const freshCtx = makeCtx({
    zecPrice: { zecPrice: 33.33, date: Date.now() },
  });
  const view = render(fetcherUi(freshCtx));

  const disabledStops: JsonNode[] = [];
  collect(
    view.toJSON(),
    disabledStops,
    n => n.props?.accessibilityState?.disabled === true,
  );
  expect(disabledStops).toEqual([]);
});

test('F9: a stale price reaches screen readers as a label', () => {
  const staleCtx = makeCtx({
    zecPrice: { zecPrice: 33.33, date: Date.now() - 6 * 60_000 },
  });
  const view = render(fetcherUi(staleCtx));
  expect(view.getByLabelText('price-ring-stale')).toBeTruthy();
});

test('F9: a current price reaches screen readers as a label too', () => {
  const freshCtx = makeCtx({
    zecPrice: { zecPrice: 33.33, date: Date.now() },
  });
  const view = render(fetcherUi(freshCtx));
  expect(view.getByLabelText('price-ring-live')).toBeTruthy();
});

test('R4: the ring restarts on every refresh cycle, failed ones included', async () => {
  jest.useFakeTimers();
  const view = render(fetcherUi(makeCtx())); // every fetch here is refused
  await jest.advanceTimersByTimeAsync(0);
  const firstCycle = view.UNSAFE_getByType(QuoteRefreshRing).props.resetKey;

  await jest.advanceTimersByTimeAsync(60_000); // a second refused cycle
  const secondCycle = view.UNSAFE_getByType(QuoteRefreshRing).props.resetKey;

  // A frozen full ring would misreport a failing refresh as complete.
  expect(secondCycle).not.toBe(firstCycle);
  jest.useRealTimers();
});

test('R5: a price that never arrived is announced as absent, not stale', async () => {
  const view = render(fetcherUi(makeCtx())); // no price has ever existed
  await waitFor(() =>
    expect(view.getByLabelText('price-ring-none')).toBeTruthy(),
  );
});
