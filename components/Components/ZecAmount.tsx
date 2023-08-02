/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { Text, View, Platform, TextStyle, TouchableOpacity, Dimensions } from 'react-native';
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
  smallPrefix?: boolean;
};

const ZecAmount: React.FunctionComponent<ZecAmountProps> = ({
  color,
  style,
  size,
  currencyName,
  amtZec,
  privacy,
  smallPrefix,
}) => {
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

  if (!smallPrefix) {
    smallPrefix = false;
  }

  // when the scale is more than 2 I need to fix some movements.
  // Pixel 2 -> scale 2.625
  // Samsung A8 Tablet -> 1.5
  let corrector = Dimensions.get('screen').scale;

  const alignmentPadding = Platform.OS === 'android' ? 4 : 0;

  const onPress = () => {
    setPrivacyHigh(false);
    setTimeout(() => setPrivacyHigh(true), 5000);
  };

  //console.log(size, corrector, Dimensions.get('screen'));

  return (
    <View style={{ ...style, flexDirection: 'row', alignItems: 'baseline' }}>
      <TouchableOpacity disabled={!privacyHigh} onPress={onPress}>
        <View style={{ ...style, flexDirection: 'row', alignItems: 'baseline' }}>
          <View style={{ flexDirection: currencyName === 'TAZ' ? 'row-reverse' : 'row', alignItems: 'baseline' }}>
            <Text
              style={{
                fontSize: size * (smallPrefix ? 0.7 : 1),
                color,
                transform: [
                  { scale: 2 },
                  {
                    translateY:
                      size * corrector * (smallPrefix ? (corrector < 2 ? -0.01 : 0.045) : corrector < 2 ? -0.01 : 0.06),
                  },
                ],
              }}>
              {currencyName === 'TAZ' || currencyName === 'ZEC' ? '\u1647' : null}
            </Text>
            <Text
              style={{
                fontSize: size * (smallPrefix ? 0.7 : 1),
                color,
                marginHorizontal:
                  size * corrector * (smallPrefix ? (corrector < 2 ? 0.1 : 0.05) : corrector < 2 ? 0.15 : 0.07),
              }}>
              {currencyName === 'TAZ' ? 'TA' : currencyName === 'ZEC' ? 'EC' : currencyName}
            </Text>
          </View>
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
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ZecAmount;
