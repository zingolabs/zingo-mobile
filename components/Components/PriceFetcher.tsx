import React, { useContext } from 'react';
import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useAtomValue } from 'jotai';
import { useTheme } from '../../app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { ContextAppLoaded } from '../../app/context';
import RegText from './RegText';
import { ModeEnum } from '../../app/AppState';
import {
  PRICE_AUTO_REFRESH_MS,
  priceLaneAtom,
  usePrice,
  usePriceFetcher,
} from '../../app/AppState/priceAtoms';
import { showConfirm, ConfirmButton } from '../../app/showConfirm';
import QuoteRefreshRing from './QuoteRefreshRing';

type PriceFetcherProps = {
  textBefore?: string;
  backgroundColor?: string;
  // Fired on a manual (user) tap only — not on the 60 s auto-refresh. Lets the
  // host screen reveal the header PriceRow (snap the bottom sheet down) so the
  // freshly-fetched price is actually visible.
  onManualFetch?: () => void;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({
  textBefore,
  backgroundColor,
  onManualFetch,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, mode } = context;
  const { colors } = useTheme();
  const bg = backgroundColor ?? colors.bgCanvas;

  const price = usePrice();
  // Subscribes this fetcher to the lane, gating the 60 s auto-refresh on ≥1
  // mounted consumer.
  const { started, loading, coolingDown } = usePriceFetcher();
  const lane = useAtomValue(priceLaneAtom);

  const onPressFetchAlert = () => {
    const buttons: ConfirmButton[] = [
      {
        text: translate('send.fetch-button') as string,
        onPress: () => lane.fetch(),
      },
      { text: translate('cancel') as string, style: 'cancel' },
    ];
    showConfirm({
      title: translate('send.fetchpricetitle') as string,
      message: translate('send.fetchpricebody') as string,
      buttons,
    });
  };

  const onManualPress = () => {
    // Reveal the header PriceRow so the (soon-to-refresh) price is on screen.
    // No-ops on screens that don't wire a reveal callback.
    onManualFetch?.();
    // Confirm only on the very first request in advanced mode; afterwards a tap
    // fetches straight away. Basic mode never confirms. The lane swallows the
    // tap while fetching / within the 5 s cooldown, so this can't be spammed.
    if (!started && mode === ModeEnum.advanced) {
      onPressFetchAlert();
    } else {
      lane.fetch();
    }
  };

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

  // First fetch in flight (no ring yet): show the spinner.
  if (loading && !started) {
    return (
      <View style={containerStyle}>
        {textBefore && (
          <RegText style={{ color: colors.fgDefault }}>{textBefore}</RegText>
        )}
        <ActivityIndicator size="small" color={colors.fgAccent} />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {textBefore && (
        <RegText style={{ color: colors.fgDefault }}>{textBefore}</RegText>
      )}
      {started ? (
        <QuoteRefreshRing
          size={22}
          color={colors.fgAccent}
          ringColor={'rgba(255,255,255,0.55)'}
          trackColor={'rgba(255,255,255,0.12)'}
          durationMs={PRICE_AUTO_REFRESH_MS}
          resetKey={price.date}
          onPress={onManualPress}
          disabled={loading || coolingDown}
          testID="pricefetcher.ring"
        />
      ) : (
        <TouchableOpacity
          disabled={loading}
          onPress={onManualPress}
          testID="pricefetcher.fetch"
        >
          <FontAwesomeIcon
            icon={faRotateRight}
            size={16}
            color={colors.fgAccent}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PriceFetcher;
