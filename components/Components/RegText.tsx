import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

type RegTextProps = {
  style?: TextStyle;
  color?: string;
  onPress?: () => void;
  children: string | string[];
};

const RegText: React.FunctionComponent<RegTextProps> = ({ style, color, onPress, children }) => {
  const { colors } = useTheme();

  let arrayed: TextStyle[] = [];

  if (Array.isArray(style)) {
    arrayed = style.slice(0);
  } else if (style) {
    arrayed.push(style);
  }
  arrayed.push({ color: color || colors.text, fontSize: 18, fontWeight: '600', opacity: 1 });

  return (
    <Text style={arrayed} onPress={onPress}>
      {children}
    </Text>
  );
};

export default RegText;
