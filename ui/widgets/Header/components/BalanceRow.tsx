/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  FadeIn,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { useTheme, slopFor } from '@app/theme';
import { Route, ServerType, TranslateType } from '@app/AppState';
import TotalBalanceClass from '@app/AppState/classes/TotalBalanceClass';
import InfoType from '@app/AppState/types/InfoType';
import { fiatQuote } from '@app/price/fiatQuote';
import ZecPriceType from '@app/AppState/types/ZecPriceType';
import Utils from '@app/utils';
import CurrencyAmount, { PriceTint } from '@ui/widgets/CurrencyAmount';
import PriceFetcher, { usePriceRing } from '@ui/widgets/PriceFetcher';
import RegText from '@ui/primitives/RegText';
import Text from '@ui/primitives/Text';
import ZecAmount from '@ui/widgets/ZecAmount';
import PrivacyToggle from './PrivacyToggle';
import { poolsWorthALook } from './poolsWorthALook';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';

const BALANCE_BOTTOM_GAP = 20;
const TINT_HOLD_MS = 900;

// Green or red for a moment after the price moves, by its direction.
const usePriceTint = (price: number): PriceTint => {
  const [tint, setTint] = useState<PriceTint>('none');
  const last = useRef(price);
  useEffect(() => {
    const before = last.current;
    last.current = price;
    if (before <= 0 || price <= 0 || price === before) {
      return;
    }
    setTint(price > before ? 'up' : 'down');
    const t = setTimeout(() => setTint('none'), TINT_HOLD_MS);
    return () => clearTimeout(t);
  }, [price]);
  return tint;
};
const REVEAL_MS = 220;
const REVEAL_EASE = Easing.bezier(0.23, 1, 0.32, 1);

// The fiat row settles into place from a slightly smaller, transparent copy.
const materialize: EntryExitAnimationFunction = () => {
  'worklet';
  const timing = { duration: REVEAL_MS, easing: REVEAL_EASE };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.94 }] },
    animations: {
      opacity: withTiming(1, timing),
      transform: [{ scale: withTiming(1, timing) }],
    },
  };
};

type BalanceRowProps = {
  noBalance: boolean | undefined;
  noPrivacy: boolean | undefined;
  setPrivacyOption: ((value: boolean) => Promise<void>) | undefined;
  privacy: boolean;
  translate: (key: string) => TranslateType;
  totalBalance: TotalBalanceClass | null;
  info: InfoType;
  zecPrice: ZecPriceType;
  server: ServerType;
  receivedLegend: boolean | undefined;
  onUsdRowLayout?: (height: number) => void;
};

/** The balance as the redesign sets it: 4 decimals, the unit after it. */
const MASK = '•••••';

const BalanceRow: React.FC<BalanceRowProps> = React.memo(
  ({
    noBalance,
    noPrivacy,
    setPrivacyOption,
    privacy,
    translate,
    totalBalance,
    info,
    zecPrice,
    server,
    receivedLegend,
    onUsdRowLayout,
  }) => {
    const navigation = useNavigation<WalletNavigation>();
    const { colors } = useTheme();
    const reducedMotion = useReducedMotion();
    const quote = fiatQuote(zecPrice, server, info.chainName);
    const showFiat = !noBalance && quote.kind === 'quote';
    const ring = usePriceRing();
    const tint = usePriceTint(quote.kind === 'quote' ? quote.price : 0);
    const fiatTotal = totalBalance
      ? totalBalance.totalIronwoodBalance +
        totalBalance.totalOrchardBalance +
        totalBalance.totalSaplingBalance +
        totalBalance.totalTransparentBalance
      : 0;
    const updatedAt =
      quote.kind === 'quote' && quote.date
        ? new Date(quote.date).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })
        : '';
    const fiatLabel = [
      privacy || quote.kind !== 'quote'
        ? ''
        : '$ ' +
          Utils.parseNumberFloatToStringLocale(quote.price * fiatTotal, 2),
      translate(ring.labelKey) as string,
      updatedAt
        ? (translate('header.lastupdate') as string) + ' ' + updatedAt
        : '',
    ]
      .filter(part => !!part)
      .join('. ');

    return (
      <>
        {!noBalance && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: 6,
              height: 22,
              marginTop: 4,
            }}
          >
            <Text variant="caption" tone="muted" style={{ fontWeight: '500' }}>
              {translate('header.total-balance') as string}
            </Text>
            {!noPrivacy && setPrivacyOption && (
              <PrivacyToggle
                privacy={privacy}
                setPrivacyOption={setPrivacyOption}
                translate={translate}
              />
            )}
          </View>
        )}
        {!noBalance && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'center',
              columnGap: 8,
              marginTop: 2,
              // Without the fiat row the balance keeps the same air below as above.
              marginBottom: showFiat ? 0 : BALANCE_BOTTOM_GAP,
            }}
          >
            <Text
              testID="header.balance"
              style={{
                fontSize: 36,
                lineHeight: 40,
                fontWeight: '700',
                letterSpacing: -0.8,
                fontVariant: ['tabular-nums'],
                color: colors.fgDefault,
              }}
            >
              {privacy
                ? MASK
                : Utils.parseNumberFloatToStringLocale(fiatTotal, 4)}
            </Text>
            <Text
              style={{ fontSize: 18, fontWeight: '700', color: colors.fgMuted }}
            >
              {info.currencyName}
            </Text>
            {totalBalance && poolsWorthALook(totalBalance) && (
              <TouchableOpacity
                hitSlop={slopFor(20)}
                onPress={() => {
                  navigation.navigate(Route.Pools);
                }}
              >
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.bgCanvas,
                    borderRadius: 10,
                    margin: 0,
                    marginLeft: 5,
                    padding: 0,
                    minWidth: 25,
                    minHeight: 25,
                  }}
                >
                  <InfoIcon size={20} color={colors.fgAccent} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {receivedLegend &&
          totalBalance &&
          totalBalance.totalIronwoodBalance +
            totalBalance.totalOrchardBalance +
            totalBalance.totalSaplingBalance >
            0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
              }}
            >
              <RegText color={colors.fgAccent}>
                {translate('seed.youreceived') as string}
              </RegText>
              <ZecAmount
                currencyName={info.currencyName}
                color={colors.fgAccent}
                size={13}
                amtZec={
                  totalBalance.totalIronwoodBalance +
                  totalBalance.totalOrchardBalance +
                  totalBalance.totalSaplingBalance
                }
                privacy={privacy}
              />
              <RegText color={colors.fgAccent}>!!!</RegText>
            </View>
          )}

        {showFiat && (
          <Animated.View
            entering={reducedMotion ? FadeIn.duration(REVEAL_MS) : materialize}
            onLayout={e => onUsdRowLayout?.(e.nativeEvent.layout.height)}
            accessible
            accessibilityLabel={fiatLabel}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <CurrencyAmount
              style={{
                marginTop: 0,
                marginBottom: 0,
                fontSize: 15,
                lineHeight: 21,
                fontWeight: '600',
              }}
              priceDate={quote.date}
              price={quote.price}
              amtZec={fiatTotal}
              privacy={privacy}
              tint={tint}
            />
            <View style={{ marginLeft: 8 }}>
              <PriceFetcher />
            </View>
          </Animated.View>
        )}
      </>
    );
  },
);

export default BalanceRow;
