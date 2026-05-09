import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

type ErrorTextProps = {
  style?: TextStyle;
  children: string;
  testID?: string;
  selectable?: boolean;
};

const ErrorText: React.FunctionComponent<ErrorTextProps> = ({
  style,
  children,
  testID,
  selectable,
}) => {
  const { colors } = useTheme();

  return (
    <Text
      testID={testID}
      style={{ color: colors.primary, ...style }}
      selectable={selectable}
    >
      {children}
    </Text>
  );
};

export default ErrorText;
