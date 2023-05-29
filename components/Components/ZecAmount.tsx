/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { Text, View, Platform, TextStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';

import Utils from '../../app/utils';
import { ThemeType } from '../../app/types';

type ZecAmountProps = {
  color?: string;
  size?: number;
  amtZec?: number;
  style?: TextStyle;
  currencyName: string;
  privacy?: boolean;
};

const ZecAmount: React.FunctionComponent<ZecAmountProps> = ({ color, style, size, currencyName, amtZec, privacy }) => {
  const [privacyHigh, setPrivacyHigh] = useState<boolean>(privacy || false);
  const splits = Utils.splitZecAmountIntoBigSmall(amtZec);
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

  if (!size) {
    size = 24;
  }

  if (!currencyName) {
    currencyName = '---';
  }

  if (!color) {
    color = colors.money;
  }

  const alignmentPadding = Platform.OS === 'android' ? 4 : 0;

  const onPress = () => {
    setPrivacyHigh(false);
    setTimeout(() => setPrivacyHigh(true), 5000);
  };

  return (
    <View style={{ ...style, flexDirection: 'row', alignItems: 'baseline' }}>
      <TouchableOpacity disabled={!privacyHigh} onPress={onPress}>
        <View style={{ ...style, flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontSize: size, color }}>{'\u1647'}</Text>
          {privacyHigh ? (
            <Text style={{ fontSize: size, fontWeight: '700', color }}>{' -' + decimalSeparator + '----'}</Text>
          ) : (
            <Text style={{ fontSize: size, fontWeight: '700', color }}>
              {' ' + Utils.toLocaleFloat(splits.bigPart)}
            </Text>
          )}
          {splits.smallPart !== '0000' && !privacyHigh && (
            <Text style={{ fontSize: size * 0.7, color, paddingBottom: alignmentPadding }}>{splits.smallPart}</Text>
          )}
          <Text style={{ fontSize: size, color }}>{' ' + currencyName}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ZecAmount;
