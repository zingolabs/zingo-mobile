import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';

type BoldTextProps = {
  style?: TextStyle;
  children: string | string[];
  testID?: string;
  selectable?: boolean;
  numberOfLines?: number;
};

const BoldText: React.FunctionComponent<BoldTextProps> = ({
  style,
  children,
  testID,
  selectable,
  numberOfLines,
}) => {
  const { colors } = useTheme() as ThemeType;
  const totalStyle: TextStyle = {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    opacity: 0.87,
    ...style,
  };

  return (
    <Text
      testID={testID}
      style={totalStyle}
      selectable={selectable}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

export default BoldText;
