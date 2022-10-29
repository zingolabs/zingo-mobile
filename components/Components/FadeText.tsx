/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

const FadeText: React.FunctionComponent<any> = props => {
  const { colors } = useTheme();

  return <Text style={{ opacity: 0.65, color: colors.text, ...props.style }}>{props.children}</Text>;
};

export default FadeText;
