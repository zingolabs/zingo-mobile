/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TextStyle } from 'react-native';
import LiquidPrimaryButton from '../LiquidButton/LiquidPrimaryButton';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types';

type AddressProps = {
  address: string;
  startLength?: number;
  endLength?: number;
  onPress?: () => void;
  style?: TextStyle;
};

const Address: React.FunctionComponent<AddressProps> = ({
  address,
  startLength = 10,
  endLength = 10,
  onPress,
  style,
}) => {
  const { colors } = useTheme() as ThemeType;
  if (!address) {
    return null;
  }

  const shortAddress = `${address.slice(0, startLength)}...${address.slice(-endLength)}`;

  return (
    <LiquidPrimaryButton
      tintColor={colors.secondary}
      onPress={onPress ? onPress : () => console.log('onPress')}
      title={shortAddress}
      textStyle={{
        ...style,
        fontSize: 16,
        fontFamily: 'monospace',
      }}
    />
  );
};

export default Address;
