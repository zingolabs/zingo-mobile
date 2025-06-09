import React from 'react';
import { Text, Pressable, StyleSheet, GestureResponderEvent, TextStyle, StyleProp } from 'react-native';
import Button from '../Button';
import { ButtonTypeEnum } from '../../../app/AppState';

interface AddressProps {
  address: string;
  startLength?: number;
  endLength?: number;
  onPress?: () => void;
  style?: TextStyle;
}

export function Address({ address, startLength = 10, endLength = 10, onPress, style }: AddressProps) {
  if (!address) {
    return null;
  }

  const shortAddress = `${address.slice(0, startLength)}...${address.slice(-endLength)}`;

  return (
    <Button
      type={ButtonTypeEnum.Ghost}
      onPress={onPress ? onPress : () => console.log('onPress')}
      title={shortAddress}
      textStyle={{
        ...style,
        fontSize: 16,
        fontFamily: 'monospace',
      }}
    />
  );
}
