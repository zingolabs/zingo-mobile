import React from 'react';
import { Text, Pressable, StyleSheet, GestureResponderEvent, TextStyle, StyleProp } from 'react-native';

interface AddressProps {
  address: string;
  startLength?: number;
  endLength?: number;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<TextStyle>;
}

export function Address({ address, startLength = 10, endLength = 10, onPress, style }: AddressProps) {
  if (!address) return null;

  const shortAddress = `${address.slice(0, startLength)}...${address.slice(-endLength)}`;

  const textStyle = [styles.baseText, onPress ? styles.linkText : null, style];

  const textElement = <Text style={textStyle}>{shortAddress}</Text>;

  return onPress ? <Pressable onPress={onPress}>{textElement}</Pressable> : textElement;
}

const styles = StyleSheet.create({
  baseText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
  },
  linkText: {
    color: '#007bff',
  },
});
