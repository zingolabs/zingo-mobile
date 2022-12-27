import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

type ErrorTextProps = {
  style?: TextStyle;
  children: string;
};

const ErrorText: React.FunctionComponent<ErrorTextProps> = ({ style, children }) => {
  const { colors } = useTheme();

  return <Text style={{ color: colors.primary, ...style }}>{children}</Text>;
};

export default ErrorText;
