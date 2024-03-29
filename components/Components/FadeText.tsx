/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types/ThemeType';

type FadeTextProps = {
  style?: TextStyle;
  children: string | string[];
};

const FadeText: React.FunctionComponent<FadeTextProps> = ({ style, children }) => {
  const { colors } = useTheme() as unknown as ThemeType;

  return <Text style={{ opacity: 0.65, color: colors.text, ...style }}>{children}</Text>;
};

export default FadeText;
