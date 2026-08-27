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
  const { translate, zecPrice, mixnetView } = context;
  const { colors } = useTheme();
  const bg = backgroundColor ?? colors.bgCanvas;

  // Shared state across every mounted PriceFetcher.
  const { loading, cycle } = usePriceFetcherStore();
  const stale = usePriceStale(zecPrice.date);

  // Feed the shared store the latest context-bound callbacks and the live
  // Indicator (identical across instances, so the last writer wins
  // harmlessly). The statusKey write is also what fires an armed ready
  // follow-up. Declared before the attach effect so the attach always
  // finds its deps.
  useEffect(() => {
    priceFetcherStore.setDeps({
      setZecPrice,
      priceDate: zecPrice.date,
      mixnetStatusKey: mixnetView
        ? mixnetView.statusKey
        : 'mixnet.status.unknown',
    });
  });

  // The consent registration: a mounted fetcher is what lets fetches run.
  useEffect(() => priceFetcherStore.attach(), []);

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

  // A price that never arrived and a stale one share the muted look (a
  // value still distinct from the track) but not the label: screen
  // readers hear which of the two facts holds. The ring restarts on
  // every completed fetch cycle, failed ones included, so a full ring
  // always means a refresh really is due.
  const absent = !zecPrice.date;
  const muted = stale || absent;
  return (
    <View style={containerStyle}>
      {textBefore && (
        <RegText style={{ color: colors.fgDefault }}>{textBefore}</RegText>
      )}
      <QuoteRefreshRing
        size={22}
        color={muted ? colors.fgMuted : colors.fgAccent}
        ringColor={
          muted ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.55)'
        }
        trackColor={'rgba(255,255,255,0.12)'}
        durationMs={PRICE_AUTO_REFRESH_MS}
        resetKey={cycle}
        accessibilityLabel={
          translate(
            absent
              ? 'price-ring-none'
              : stale
                ? 'price-ring-stale'
                : 'price-ring-live',
          ) as string
        }
        testID="pricefetcher.ring"
      />
    </View>
  );
};

export default PriceFetcher;
