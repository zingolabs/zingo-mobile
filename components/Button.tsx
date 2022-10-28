/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

const Button: React.FunctionComponent<any> = ({ type, title, disabled, onPress, style }) => {
  const { colors } = useTheme();
  // type: 'Primary' or 'Secondary'
  const styleButton =
    type === 'Primary'
      ? {
          backgroundColor: disabled ? colors.primaryDisabled : colors.primary,
        }
      : type === 'Secondary'
      ? {
          borderColor: colors.primary || colors.text,
          borderWidth: 2,
        }
      : {
          // error
          backgroundColor: colors.primary,
        };
  const styleCommon = {
    padding: 10,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 10,
    maxWidth: '90%',
    minWidth: '30%',
  };

  return (
    <TouchableOpacity
      style={{
        ...styleButton,
        ...styleCommon,
        ...style,
      }}
      onPress={() => !disabled && onPress && onPress()}>
      <Text
        style={{
          color: type === 'Primary' ? colors.background : colors.primary || colors.text,
          fontWeight: 'bold',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default Button;
