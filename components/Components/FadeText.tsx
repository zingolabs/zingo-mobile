/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '../../app/theme';

type FadeTextProps = {
  style?: TextStyle;
  children: string | string[];
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
};

const FadeText: React.FunctionComponent<FadeTextProps> = ({
  style,
  children,
  numberOfLines,
  ellipsizeMode,
  selectable,
}) => {
  const { colors } = useTheme();

  return (
    <Text
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      style={{ opacity: 0.65, color: colors.fgDefault, ...style }}
      selectable={selectable}
    >
      {children}
    </Text>
  );
};

export default FadeText;
