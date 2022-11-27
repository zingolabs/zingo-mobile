/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

const ClickableText: React.FunctionComponent<any> = ({ style, ...props }) => {
  const { colors } = useTheme();
  const onPress = props.onPress || null;

  return (
    <TouchableOpacity {...props} onPress={onPress}>
      <Text style={{ color: colors.text, textDecorationLine: 'underline', ...style }}>{props.children}</Text>
    </TouchableOpacity>
  );
};

export default ClickableText;
