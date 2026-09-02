import React, { useContext, useEffect } from 'react';
import { View, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../app/theme';
import { ContextAppLoaded } from '../../app/context';
import { ChainNameEnum, SelectServerEnum } from '../../app/AppState';
import RegText from './RegText';
import QuoteRefreshRing from './QuoteRefreshRing';
import {
  PRICE_REFRESH_MIN_MS,
  priceFetcherStore,
  usePriceFetcherStore,
  usePriceHealth,
} from './priceFetcherStore';

/**
 * Owns the price surface's traffic for the wallet session: LoadedApp
 * mounts exactly one, so fetching follows the session and its consent,
 * never whichever currency the screens happen to display.
 */
export const PriceTrafficDriver: React.FunctionComponent = () => {
  const context = useContext(ContextAppLoaded);
  const { mixnetView, nym, setZecPrice, selectServer, info } = context;

  const mixnetStatusKey = mixnetView
    ? mixnetView.statusKey
    : 'mixnet.status.unknown';
  // The price source is fetchable only on mainnet with a live server.
  const priceFetchable =
    selectServer !== SelectServerEnum.offline &&
    info.chainName === ChainNameEnum.mainChainName;

  // PriceInputs first, so the attach below always finds them; the dependency
  // list keeps the store's fetch-decision path off the render loop. The
  // statusKey write is also what fires an armed ready follow-up.
  useEffect(() => {
    priceFetcherStore.setDeps({
      setZecPrice,
      mixnetStatusKey,
      nymSelected: nym,
      priceFetchable,
    });
  }, [setZecPrice, mixnetStatusKey, nym, priceFetchable]);

  useEffect(() => priceFetcherStore.attach(), []);

  return null;
};

// Display-only: the ring reports the shared store's cadence and the
// price's health; it starts nothing and offers no tap.
type PriceFetcherProps = {
  textBefore?: string;
  backgroundColor?: string;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({
  textBefore,
  backgroundColor,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, zecPrice } = context;
  const { colors } = useTheme();
  const bg = backgroundColor ?? colors.bgCanvas;

  // Shared state across every mounted PriceFetcher.
  const { loading, nextFetchAt, nextFetchDelayMs, surfaceActive } =
    usePriceFetcherStore();
  const health = usePriceHealth(zecPrice.date);

  // The store's own decision governs visibility: without the consent,
  // the market, or a serving transport no cadence exists, and a ring
  // counting down to a refresh that cannot come would mislead, so
  // render nothing at all.
  if (!surfaceActive) {
    return null;
  }

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
  // readers hear which of the two facts holds. The ring keys on the
  // armed tick's deadline and starts at the cycle's true phase, so a
  // full ring always means a refresh really is due, on any mount.
  const muted = health !== 'live';
  const cadenceMs = nextFetchDelayMs || PRICE_REFRESH_MIN_MS;
  // No armed deadline (an entry flight before its schedule) reads as a
  // cycle just begun, never as one complete: a full ring is reserved
  // for a deadline that has actually passed.
  const elapsedFraction =
    nextFetchAt > 0
      ? Math.min(Math.max(1 - (nextFetchAt - Date.now()) / cadenceMs, 0), 1)
      : 0;
  return (
    <View style={containerStyle}>
      {textBefore && (
        <RegText style={{ color: colors.fgDefault }}>{textBefore}</RegText>
      )}
      <QuoteRefreshRing
        size={22}
        color={muted ? colors.fgMuted : colors.fgAccent}
        ringColor={muted ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.55)'}
        trackColor={'rgba(255,255,255,0.12)'}
        durationMs={cadenceMs}
        resetKey={nextFetchAt}
        startProgress={elapsedFraction}
        accessibilityLabel={
          translate(
            health === 'absent'
              ? 'price-ring-none'
              : health === 'stale'
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
