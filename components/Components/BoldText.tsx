import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

type BoldTextProps = {
  style?: TextStyle;
  children: string | string[];
};

const BoldText: React.FunctionComponent<BoldTextProps> = ({ style, children }) => {
  const { colors } = useTheme();
  const totalStyle: TextStyle = {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.87,
    ...style,
  };

  return <Text style={totalStyle}>{children}</Text>;
};

export default BoldText;
