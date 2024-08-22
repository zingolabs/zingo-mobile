import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types/ThemeType';

type BoldTextProps = {
  style?: TextStyle;
  children: string | string[];
  testID?: string;
};

const BoldText: React.FunctionComponent<BoldTextProps> = ({ style, children, testID }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const totalStyle: TextStyle = {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.87,
    ...style,
  };

  return (
    <Text testID={testID} style={totalStyle}>
      {children}
    </Text>
  );
};

export default BoldText;
