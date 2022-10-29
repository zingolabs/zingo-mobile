/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, View, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Utils from '../../app/utils';

type ZecAmountProps = {
  color?: string;
  size?: number;
  amtZec?: number;
  style?: any;
  currencyName?: string;
};

const ZecAmount: React.FunctionComponent<ZecAmountProps> = ({ color, style, size, currencyName, amtZec }) => {
  const splits = Utils.splitZecAmountIntoBigSmall(amtZec);
  const { colors } = useTheme();

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

  return (
    <View style={{ ...style, flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ fontSize: size, color }}>{'\u1647'}</Text>
      <Text style={{ fontSize: size, fontWeight: '700', color }}>{' ' + Utils.toLocaleFloat(splits.bigPart)}</Text>
      <Text style={{ fontSize: size / 2, color, paddingBottom: alignmentPadding }}>{splits.smallPart}</Text>
      <Text style={{ fontSize: size, color }}>{' ' + currencyName}</Text>
    </View>
  );
};

export default ZecAmount;
