/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

type FadeTextProps = {
  style?: TextStyle;
  children: string | string[];
};

const FadeText: React.FunctionComponent<FadeTextProps> = ({ style, children }) => {
  const { colors } = useTheme();

  return <Text style={{ opacity: 0.65, color: colors.text, ...style }}>{children}</Text>;
};

export default FadeText;
