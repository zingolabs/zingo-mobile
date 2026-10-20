/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { Text, View, TextStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@app/theme';
import { getNumberFormatSettings } from 'react-native-localize';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import Utils from '@app/utils';
import { usePriceHealth } from './priceFetcherStore';
import { useTimedReveal } from '@app/hooks/useTimedReveal';

type CurrencyAmountProps = {
  price?: number;
  amtZec?: number;
  style?: TextStyle;
  privacy?: boolean;
  selectable?: boolean;
  // The live price's date: a conversion older than the stale threshold
  // dims. Omit for historical conversions, which never dim.
  priceDate?: number;
  // Overrides the color the price's health gives, as a warning does.
  color?: string;
  // Tints the amount for the direction of the last price move.
  tint?: PriceTint;
};

export type PriceTint = 'none' | 'up' | 'down';

const TINT_UP = '#3CC52A';
const TINT_DOWN = '#F2878A';
const TINT_MS = 500;

// The amount eases to green or red for the direction of a price move.
const TintedText: React.FunctionComponent<{
  tint: PriceTint;
  base: string;
  style?: TextStyle;
  selectable?: boolean;
  children: string;
}> = ({ tint, base, style, selectable, children }) => {
  const tinted = useAnimatedStyle(() => ({
    color: withTiming(
      tint === 'up' ? TINT_UP : tint === 'down' ? TINT_DOWN : base,
      { duration: TINT_MS, reduceMotion: ReduceMotion.Never },
    ),
  }));
  return (
    <Animated.Text
      style={[
        {
          color: base,
          fontSize: 20,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
          ...style,
        },
        tinted,
      ]}
      selectable={selectable}
    >
      {children}
    </Animated.Text>
  );
};

const CurrencyAmount: React.FunctionComponent<CurrencyAmountProps> = ({
  price,
  style,
  amtZec,
  privacy,
  selectable,
  priceDate,
  color,
  tint,
}) => {
  const { visible, reveal } = useTimedReveal(!!privacy);
  const privacyHigh: boolean = !visible;
  const [currencyString, setCurrencyString] = useState<string>('');
  const { colors } = useTheme();
  const { decimalSeparator } = getNumberFormatSettings();
  // A live conversion whose price never arrived (priceDate 0) mutes like
  // a stale one, matching the ring beside it; historical conversions
  // omit priceDate and never dim.
  const health = usePriceHealth(priceDate);
  const baseColor =
    color ?? (health === 'live' ? colors.fgDefault : colors.fgMuted);

  useEffect(() => {
    const zeroString = '0' + decimalSeparator + '00';
    var currencyStr;

    if (
      typeof price === 'undefined' ||
      typeof amtZec === 'undefined' ||
      price <= 0
    ) {
      currencyStr = '-' + decimalSeparator + '--';
    } else {
      const currencyAmo = price * amtZec;
      currencyStr = Utils.parseNumberFloatToStringLocale(currencyAmo, 2);
      if (currencyStr === zeroString && amtZec > 0) {
        currencyStr = '< 0' + decimalSeparator + '01';
      }
    }
    setCurrencyString(currencyStr);
  }, [amtZec, decimalSeparator, price]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <TouchableOpacity disabled={!privacyHigh} onPress={reveal}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          {privacyHigh ? (
            <Text
              style={{
                color: baseColor,
                fontSize: 20,
                fontWeight: '700',
                ...style,
              }}
            >
              {'$ -' + decimalSeparator + '--'}
            </Text>
          ) : tint ? (
            <TintedText
              tint={tint}
              base={baseColor}
              style={style}
              selectable={selectable}
            >
              {'$ ' + currencyString}
            </TintedText>
          ) : (
            <Text
              style={{
                color: baseColor,
                fontSize: 20,
                fontWeight: '700',
                ...style,
              }}
              selectable={selectable}
            >
              {'$ ' + currencyString}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default CurrencyAmount;
