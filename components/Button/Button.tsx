/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';

const Button: React.FunctionComponent<any> = ({
  type,
  title,
  disabled,
  onPress,
  style,
  accessible,
  accessibilityLabel,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;
  // type: 'Primary' or 'Secondary'
  const styleButton =
    type === 'Primary'
      ? {
          backgroundColor: disabled ? colors.primaryDisabled : colors.primary,
          borderColor: colors.primary,
          borderWidth: 2,
        }
      : type === 'Secondary'
      ? {
          borderColor: colors.primary,
          borderWidth: 2,
        }
      : {
          // error
          backgroundColor: colors.primary,
        };
  const styleCommon = {
    padding: 0,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 10,
    maxWidth: '90%',
    minWidth: '30%',
    minHeight: 48,
    alignItems: 'center',
    juatifyContent: 'center',
  };

  return (
    <TouchableOpacity
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={{
        ...styleButton,
        ...styleCommon,
        ...style,
      }}
      onPress={() => !disabled && onPress && onPress()}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: 0,
          minWidth: 48,
          minHeight: 48,
        }}>
        <Text
          style={{
            color: type === 'Primary' ? colors.background : colors.primary,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            fontSize: 16,
          }}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Button;
