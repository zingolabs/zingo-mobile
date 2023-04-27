/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, Text, View, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';

type ButtonProps = {
  type: string;
  title: string;
  disabled?: boolean;
  onPress: () => void;
  style?: TextStyle;
  accessible?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

const Button: React.FunctionComponent<ButtonProps> = ({
  type,
  title,
  disabled,
  onPress,
  style,
  accessible,
  accessibilityLabel,
  testID,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;
  // type: 'Primary' or 'Secondary'
  const styleButton: TextStyle =
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
  const styleCommon: TextStyle = {
    padding: 0,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 10,
    maxWidth: '90%',
    minWidth: '30%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <TouchableOpacity
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={{
        ...styleButton,
        ...styleCommon,
        ...style,
      }}
      disabled={disabled}
      onPress={() => onPress()}>
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
