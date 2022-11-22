import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

const ErrorText: React.FunctionComponent<any> = props => {
  const { colors } = useTheme();

  return <Text style={{ color: colors.primary, ...props.style }}>{props.children}</Text>;
};

export default ErrorText;
