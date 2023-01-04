/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, View, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

import Utils from '../../app/utils';
import { ThemeType } from '../../app/types';

type CurrencyAmountProps = {
  price?: number;
  amtZec?: number;
  style?: TextStyle;
  currency: 'USD' | '';
};

const CurrencyAmount: React.FunctionComponent<CurrencyAmountProps> = ({ price, style, amtZec, currency }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  var currencyString;

  if (!price || typeof amtZec === 'undefined') {
    currencyString = '--';
  } else {
    const currencyAmount = price * amtZec;
    currencyString = currencyAmount.toFixed(2);
    if (currencyString === '0.00' && amtZec > 0) {
      currencyString = '< 0.01';
    }
  }

  if (currency === 'USD') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ color: colors.money, fontSize: 20, ...style }}>$</Text>
        <Text style={{ color: colors.money, fontSize: 20, fontWeight: '700', ...style }}>
          {' ' + Utils.toLocaleFloat(currencyString)}
        </Text>
        <Text style={{ color: colors.money, fontSize: 20, ...style }}>{' ' + currency}</Text>
      </View>
    );
  } else {
    return null;
  }
};

export default CurrencyAmount;
