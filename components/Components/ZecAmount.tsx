/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { Text, View, Platform, TextStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';

import Utils from '../../app/utils';
import { ThemeType } from '../../app/types';
import { SvgXml } from 'react-native-svg';

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

  const onPress = () => {
    setPrivacyHigh(false);
    setTimeout(() => setPrivacyHigh(true), 5000);
  };

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <svg viewBox="0 0 282.84 147.85">
    <polygon points="34.44 107.62 34.44 106.98 87.19 34.17 87.19 20.12 56.09 20.12 56.09 0 35.98 0 35.98 20.12 5.04 20.12 5.04 40.24 53.93 40.24 53.93 40.88 0 114.64 0 127.73 35.98 127.73 35.98 147.85 56.09 147.85 56.09 127.73 88.03 127.73 88.03 107.62 34.44 107.62"/>
    <polygon points="180.89 39.03 180.89 19.35 124.56 19.35 110.48 19.35 102.52 19.35 102.52 127.75 110.48 127.75 124.56 127.75 180.89 127.75 180.89 108.07 124.56 108.07 124.56 83.77 172.04 83.77 172.04 64.09 124.56 64.09 124.56 39.03 180.89 39.03"/>
    <path d="m240.92,128.87c-8.96,0-16.59-1.58-22.89-4.73-6.3-3.16-11.12-7.75-14.44-13.79-3.33-6.04-4.99-13.33-4.99-21.88v-29.75c0-8.6,1.66-15.9,4.99-21.92,3.33-6.01,8.14-10.61,14.44-13.79,6.3-3.18,13.93-4.77,22.89-4.77,7.4,0,13.99,1.47,19.75,4.4,5.77,2.93,10.54,7.18,14.32,12.75,3.78,5.57,6.4,12.33,7.85,20.28h-22.85c-.86-3.63-2.19-6.7-3.98-9.21-1.8-2.51-3.97-4.44-6.52-5.78-2.55-1.34-5.41-2.01-8.57-2.01-6.17,0-10.96,1.75-14.36,5.26-3.41,3.5-5.11,8.44-5.11,14.8v29.75c0,6.36,1.7,11.28,5.11,14.76,3.41,3.48,8.19,5.22,14.36,5.22,4.83,0,8.9-1.48,12.23-4.44,3.33-2.96,5.61-7.14,6.84-12.56h22.85c-1.5,7.9-4.14,14.65-7.93,20.24-3.78,5.59-8.54,9.85-14.28,12.79-5.74,2.93-12.31,4.4-19.71,4.4Z"/>
  </svg>`;

  //console.log(xml);

  return (
    <View style={{ ...style, flexDirection: 'row', margin: 5 }}>
      <TouchableOpacity disabled={!privacyHigh} onPress={onPress}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            margin: 0,
            padding: 0,
          }}>
          {currencyName === 'ZEC' ? (
            <SvgXml
              width={size * 2 * (smallPrefix ? 0.7 : 1)}
              height={size * (smallPrefix ? 0.7 : 1)}
              xml={xml}
              fill={color}
              style={{
                marginBottom:
                  Platform.OS === 'android' ? size / (smallPrefix ? 4 : 6.5) : size / (smallPrefix ? 6 : 20),
              }}
            />
          ) : (
            <Text
              style={{
                fontSize: size * (smallPrefix ? 0.7 : 1),
                color,
                margin: 0,
                padding: 0,
              }}>
              {currencyName}
            </Text>
          )}
          {privacyHigh ? (
            <Text
              style={{
                fontSize: size,
                fontWeight: '700',
                color,
                margin: 0,
                padding: 0,
              }}>
              {' -' + decimalSeparator + '----'}
            </Text>
          ) : (
            <Text
              style={{
                fontSize: size,
                fontWeight: '700',
                color,
                margin: 0,
                padding: 0,
              }}>
              {' ' + Utils.toLocaleFloat(splits.bigPart)}
            </Text>
          )}
          {splits.smallPart !== '0000' && !privacyHigh && (
            <Text
              style={{
                fontSize: size * 0.7,
                color,
                margin: 0,
                padding: 0,
                marginBottom: Platform.OS === 'android' ? size / 10 : size / 15,
              }}>
              {splits.smallPart}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ZecAmount;
