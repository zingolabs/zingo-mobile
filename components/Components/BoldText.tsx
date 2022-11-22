import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

const BoldText: React.FunctionComponent<any> = ({ style, children }) => {
  const { colors } = useTheme();
  const totalStyle = {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.87,
    ...style,
  };

  return <Text style={totalStyle}>{children}</Text>;
};

export default BoldText;
