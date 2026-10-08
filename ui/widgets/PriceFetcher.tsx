import React, { useContext, useEffect } from 'react';
import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { fiatEligible } from '@app/price/fiatQuote';
import QuoteRefreshRing from '@ui/primitives/QuoteRefreshRing';
import {
  PRICE_REFRESH_MAX_MS,
  priceFetcherStore,
  usePriceFetcherStore,
  usePriceHealth,
} from './priceFetcherStore';

// LoadedApp mounts exactly one driver, which owns the session's price traffic.
export const PriceTrafficDriver: React.FunctionComponent = () => {
  const context = useContext(ContextAppLoaded);
  const { mixnetView, setZecPrice, server, info } = context;

  const mixnetStatusKey =
    mixnetView.kind === 'transport'
      ? mixnetView.statusKey
      : 'mixnet.status.unknown';
  const priceFetchable = fiatEligible(server, info.chainName);

  useEffect(() => {
    priceFetcherStore.setDeps({
      setZecPrice,
      mixnetStatusKey,
      priceFetchable,
    });
  }, [setZecPrice, mixnetStatusKey, priceFetchable]);

  useEffect(() => priceFetcherStore.attach(), []);

  return null;
};

export type PriceRingState = {
  shown: boolean;
  muted: boolean;
  fetching: boolean;
  cadenceMs: number;
  resetKey: number;
  elapsedFraction: number;
  labelKey: 'price-ring-live' | 'price-ring-stale' | 'price-ring-paused';
};

/** The countdown the ring draws and the state the price beside it announces. */
export const usePriceRing = (): PriceRingState => {
  const { zecPrice } = useContext(ContextAppLoaded);
  const { nextFetchAt, nextFetchDelayMs, surfaceActive, loading } =
    usePriceFetcherStore();
  const health = usePriceHealth(zecPrice.date);

  // A ring with no running cadence stays static and muted.
  const muted = health !== 'live' || !surfaceActive;
  const cadenceMs = nextFetchDelayMs || PRICE_REFRESH_MAX_MS;
  const elapsedFraction =
    nextFetchAt > 0
      ? Math.min(Math.max(1 - (nextFetchAt - Date.now()) / cadenceMs, 0), 1)
      : 0;
  return {
    shown: !!zecPrice.date,
    muted,
    fetching: loading && surfaceActive,
    cadenceMs: surfaceActive ? cadenceMs : 0,
    resetKey: nextFetchAt,
    elapsedFraction,
    labelKey:
      health === 'stale'
        ? 'price-ring-stale'
        : surfaceActive
          ? 'price-ring-live'
          : 'price-ring-paused',
  };
};

const RING_SIZE = 16;
const RING_TRACK = '#13263F';

// The countdown ring next to the fiat balance.
const PriceFetcher: React.FunctionComponent = () => {
  const { colors } = useTheme();
  const ring = usePriceRing();

  if (!ring.shown) {
    return null;
  }

  return (
    <QuoteRefreshRing
      size={RING_SIZE}
      color={ring.muted ? 'rgba(255,255,255,0.30)' : colors.fgMuted}
      fetchColor={colors.fgAccent}
      trackColor={RING_TRACK}
      durationMs={ring.cadenceMs}
      resetKey={ring.resetKey}
      startProgress={ring.elapsedFraction}
      fetching={ring.fetching}
      testID="pricefetcher.ring"
    />
  );
};

export default PriceFetcher;
