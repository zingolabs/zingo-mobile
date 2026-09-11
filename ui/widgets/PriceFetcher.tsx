import React, { useContext, useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { ChainNameEnum, SelectServerEnum } from '@app/AppState';
import QuoteRefreshRing from '@ui/primitives/QuoteRefreshRing';
import {
  PRICE_REFRESH_MS,
  priceFetcherStore,
  usePriceFetcherStore,
  usePriceHealth,
} from './priceFetcherStore';

// LoadedApp mounts exactly one driver, which owns the session's price traffic.
export const PriceTrafficDriver: React.FunctionComponent = () => {
  const context = useContext(ContextAppLoaded);
  const { mixnetView, setZecPrice, selectServer, info } = context;

  const mixnetStatusKey = mixnetView
    ? mixnetView.statusKey
    : 'mixnet.status.unknown';
  const priceFetchable =
    selectServer !== SelectServerEnum.offline &&
    info.chainName === ChainNameEnum.mainChainName;

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

type PriceFetcherProps = {
  backgroundColor?: string;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({
  backgroundColor,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, zecPrice } = context;
  const { colors } = useTheme();
  const bg = backgroundColor ?? colors.bgCanvas;

  const { nextFetchAt, nextFetchDelayMs, surfaceActive } =
    usePriceFetcherStore();
  const health = usePriceHealth(zecPrice.date);

  if (!zecPrice.date) {
    return null;
  }

  const containerStyle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bg,
    margin: 0,
    marginTop: 10,
    padding: 5,
    minWidth: 40,
    minHeight: 40,
  };

  // A ring with no running cadence stays static and muted.
  const muted = health !== 'live' || !surfaceActive;
  const cadenceMs = nextFetchDelayMs || PRICE_REFRESH_MS;
  const elapsedFraction =
    nextFetchAt > 0
      ? Math.min(Math.max(1 - (nextFetchAt - Date.now()) / cadenceMs, 0), 1)
      : 0;
  return (
    <View style={containerStyle}>
      <QuoteRefreshRing
        size={22}
        color={muted ? colors.fgMuted : colors.fgAccent}
        ringColor={muted ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.55)'}
        trackColor={'rgba(255,255,255,0.12)'}
        durationMs={surfaceActive ? cadenceMs : 0}
        resetKey={nextFetchAt}
        startProgress={elapsedFraction}
        accessibilityLabel={
          translate(
            health === 'stale' ? 'price-ring-stale' : 'price-ring-live',
          ) as string
        }
        testID="pricefetcher.ring"
      />
    </View>
  );
};

export default PriceFetcher;
