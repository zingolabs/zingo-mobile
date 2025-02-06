/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { Text, View, TextStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';

import { ThemeType } from '../../app/types';
import Utils from '../../app/utils';
import { CurrencyEnum } from '../../app/AppState';

type CurrencyAmountProps = {
  price?: number;
  amtZec?: number;
  style?: TextStyle;
  currency: CurrencyEnum;
  privacy?: boolean;
  selectable?: boolean;
};

const CurrencyAmount: React.FunctionComponent<CurrencyAmountProps> = ({
  price,
  style,
  amtZec,
  currency,
  privacy,
  selectable,
}) => {
  const [privacyHigh, setPrivacyHigh] = useState<boolean>(privacy || false);
  const [currencyString, setCurrencyString] = useState<string>('');
  const { colors } = useTheme() as unknown as ThemeType;
  const { decimalSeparator } = getNumberFormatSettings();

  useEffect(() => {
    setPrivacyHigh(privacy || false);
  }, [privacy]);

  useEffect(() => {
    if (privacyHigh && !privacy) {
      setPrivacyHigh(false);
    }
  }, [privacyHigh, privacy]);

  useEffect(() => {
    const zeroString = '0' + decimalSeparator + '00';
    var currencyStr;

    if (typeof price === 'undefined' || typeof amtZec === 'undefined' || price <= 0) {
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

  const onPress = () => {
    setPrivacyHigh(false);
    setTimeout(() => setPrivacyHigh(true), 5000);
  };

  if (currency === CurrencyEnum.USDCurrency) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <TouchableOpacity disabled={!privacyHigh} onPress={onPress}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            {privacyHigh ? (
              <Text style={{ color: colors.money, fontSize: 20, fontWeight: '700', ...style }}>
                {'$ -' + decimalSeparator + '--'}
              </Text>
            ) : (
              <Text style={{ color: colors.money, fontSize: 20, fontWeight: '700', ...style }} selectable={selectable}>
                {'$ ' + currencyString}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  } else {
    return null;
  }
};

export default CurrencyAmount;
