/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { Text, View, TextStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@app/theme';
import { getNumberFormatSettings } from 'react-native-localize';

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
};

const CurrencyAmount: React.FunctionComponent<CurrencyAmountProps> = ({
  price,
  style,
  amtZec,
  privacy,
  selectable,
  priceDate,
  color,
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
