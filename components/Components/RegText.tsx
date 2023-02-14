import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

type RegTextProps = {
  style?: TextStyle;
  color?: string;
  onPress?: () => void;
  testID?: string;
  children: string | string[];
};

const RegText: React.FunctionComponent<RegTextProps> = ({ style, color, onPress, testID, children }) => {
  const { colors } = useTheme();

  const styleSum: TextStyle = { color: color || colors.text, fontSize: 18, fontWeight: '600', opacity: 1, ...style };

  return (
    <Text testID={testID} style={styleSum} onPress={onPress}>
      {children}
    </Text>
  );
};

export default RegText;
