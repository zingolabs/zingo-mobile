import React, { useContext, useEffect } from 'react';
import { View, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../app/theme';
import { ContextAppLoaded } from '../../app/context';
import { ChainNameEnum, SelectServerEnum } from '../../app/AppState';
import RegText from './RegText';
import QuoteRefreshRing from './QuoteRefreshRing';
import {
  PRICE_AUTO_REFRESH_MS,
  priceFetcherStore,
  usePriceFetcherStore,
  usePriceStale,
} from './priceFetcherStore';

/**
 * Owns the price surface's traffic for the wallet session: LoadedApp
 * mounts exactly one, so fetching follows the session and the Nym
 * consent, never whichever currency the screens happen to display.
 */
export const PriceTrafficDriver: React.FunctionComponent = () => {
  const context = useContext(ContextAppLoaded);
  const { zecPrice, mixnetView, nym, setZecPrice, selectServer, info } =
    context;

  // Deps first, so the attach below always finds them. The statusKey
  // write is also what fires an armed ready follow-up.
  useEffect(() => {
    priceFetcherStore.setDeps({
      setZecPrice,
      priceDate: zecPrice.date,
      mixnetStatusKey: mixnetView
        ? mixnetView.statusKey
        : 'mixnet.status.unknown',
      nymSelected: nym,
      // Offline mode and non-mainnet chains have no usable ZEC/USD
      // market, so they never justify traffic, consent or not.
      marketAvailable:
        selectServer !== SelectServerEnum.offline &&
        info.chainName === ChainNameEnum.mainChainName,
    });
  });

  useEffect(() => priceFetcherStore.attach(), []);

  return null;
};

// Display-only (ADR 0008): the ring reports the shared store's cadence
// and the price's health; it starts nothing and offers no tap.
type PriceFetcherProps = {
  textBefore?: string;
  backgroundColor?: string;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({
  textBefore,
  backgroundColor,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, zecPrice, nym, mixnetView } = context;
  const { colors } = useTheme();
  const bg = backgroundColor ?? colors.bgCanvas;

  // Shared state across every mounted PriceFetcher.
  const { loading, cycle } = usePriceFetcherStore();
  const stale = usePriceStale(zecPrice.date);

  // Without the Nym consent no cadence exists, and under an 'off' or
  // 'died' transport verdict the store pauses it; in both states a ring
  // counting down to a refresh that cannot come would mislead, so
  // render nothing at all.
  const transportRefuses =
    mixnetView !== null &&
    (mixnetView.statusKey === 'mixnet.status.off' ||
      mixnetView.statusKey === 'mixnet.status.died');
  if (!nym || transportRefuses) {
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
