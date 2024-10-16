import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types/ThemeType';

type ErrorTextProps = {
  style?: TextStyle;
  children: string;
  testID?: string;
};

const ErrorText: React.FunctionComponent<ErrorTextProps> = ({ style, children, testID }) => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <Text testID={testID} style={{ color: colors.primary, ...style }}>
      {children}
    </Text>
  );
};

export default ErrorText;
