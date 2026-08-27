import React, { useContext, useEffect } from 'react';
import { View, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../app/theme';
import { ContextAppLoaded } from '../../app/context';
import RegText from './RegText';
import QuoteRefreshRing from './QuoteRefreshRing';
import {
  PRICE_AUTO_REFRESH_MS,
  priceFetcherStore,
  usePriceFetcherStore,
  usePriceStale,
} from './priceFetcherStore';

// Display-only (ADR 0008): mounting this component is what starts and
// keeps the shared store's fetch lifecycle; there is no tap.
type PriceFetcherProps = {
  setZecPrice: (p: number, d: number) => void;
  textBefore?: string;
  backgroundColor?: string;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({
  setZecPrice,
  textBefore,
  backgroundColor,
}) => {
  const context = useContext(ContextAppLoaded);
  const { zecPrice, mixnetView } = context;
  const { colors } = useTheme();
  const bg = backgroundColor ?? colors.bgCanvas;

  // Shared state across every mounted PriceFetcher.
  const { loading } = usePriceFetcherStore();
  const stale = usePriceStale(zecPrice.date);

  // Feed the shared store the latest context-bound callbacks and the live
  // Indicator (identical across instances, so the last writer wins
  // harmlessly). The statusKey write is also what fires an armed ready
  // follow-up.
  useEffect(() => {
    priceFetcherStore.setDeps({
      setZecPrice,
      mixnetStatusKey: mixnetView ? mixnetView.statusKey : null,
    });
  });

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bg,
    margin: 0,
    marginTop: 10,
    padding: 5,
    minWidth: 40,
    minHeight: 40,
    rowGap: 5,
    columnGap: 10,
  };

  // First fetch in flight (no price yet): show the spinner.
  if (loading && !zecPrice.date) {
    return (
      <View style={containerStyle}>
        {textBefore && (
          <RegText style={{ color: colors.fgDefault }}>{textBefore}</RegText>
        )}
        <ActivityIndicator size="small" color={colors.fgAccent} />
      </View>
    );
  }

  // No price and nothing in flight, or a stale price: the ring drops to
  // its track color, the only failure cue this surface shows.
  const muted = stale || !zecPrice.date;
  return (
    <View style={containerStyle}>
      {textBefore && (
        <RegText style={{ color: colors.fgDefault }}>{textBefore}</RegText>
      )}
      <QuoteRefreshRing
        size={22}
        color={muted ? colors.fgMuted : colors.fgAccent}
        ringColor={
          muted ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)'
        }
        trackColor={'rgba(255,255,255,0.12)'}
        durationMs={PRICE_AUTO_REFRESH_MS}
        resetKey={zecPrice.date}
        testID="pricefetcher.ring"
      />
    </View>
  );
};

export default PriceFetcher;
