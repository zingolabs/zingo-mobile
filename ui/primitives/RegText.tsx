import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@app/theme';

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
  const { colors } = useTheme();

  const styleSum: TextStyle = {
    color: color || colors.fgDefault,
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
