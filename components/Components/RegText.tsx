import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';

type RegTextProps = {
  style?: TextStyle;
  color?: string;
  onPress?: () => void;
  testID?: string;
  children: string | string[];
  selectable?: boolean;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
};

const RegText: React.FunctionComponent<RegTextProps> = ({
  style,
  color,
  onPress,
  testID,
  children,
  selectable,
  numberOfLines,
  ellipsizeMode,
}) => {
  const { colors } = useTheme() as ThemeType;

  const styleSum: TextStyle = {
    color: color || colors.text,
    fontSize: 15,
    fontWeight: '400',
    opacity: 1,
    ...style,
  };

  return (
    <Text
      testID={testID}
      style={styleSum}
      onPress={onPress}
      selectable={selectable}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {children}
    </Text>
  );
};

export default RegText;
