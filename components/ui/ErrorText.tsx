import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '../../app/theme';

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
      style={{ color: colors.fgAccent, ...style }}
      selectable={selectable}
    >
      {children}
    </Text>
  );
};

export default ErrorText;
