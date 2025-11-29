/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, Text, View, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';
import { ButtonTypeEnum } from '../../app/AppState';

type ButtonProps = {
  type: ButtonTypeEnum;
  title: string;
  disabled?: boolean;
  onPress: () => void;
  style?: TextStyle;
  textStyle?: TextStyle;
  accessible?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  twoButtons?: boolean;
};

const Button: React.FunctionComponent<ButtonProps> = ({
  type,
  title,
  disabled,
  onPress,
  style,
  textStyle,
  accessible,
  accessibilityLabel,
  testID,
  twoButtons,
}) => {
  const { colors } = useTheme() as ThemeType;

  const styleButton: TextStyle =
    type === ButtonTypeEnum.Primary
      ? {
          backgroundColor: disabled ? colors.primaryDisabled : colors.primary,
          borderWidth: 1,
          width: twoButtons ? '40%' : '80%',
        }
      : type === ButtonTypeEnum.Secondary
        ? {
            backgroundColor: disabled
              ? colors.secondaryDisabled
              : colors.secondary,
            borderColor: disabled ? colors.primaryDisabled : colors.border,
            borderWidth: 1,
            width: twoButtons ? '40%' : '80%',
          }
        : type === ButtonTypeEnum.Tertiary
          ? {
              backgroundColor: disabled
                ? colors.secondaryDisabled
                : colors.background,
              borderColor: disabled ? colors.primaryDisabled : colors.primary,
              borderWidth: 1,
              width: twoButtons ? '40%' : '80%',
            }
          : type === ButtonTypeEnum.Ghost
            ? {
                backgroundColor: 'transparent',
                color: colors.money,
              }
            : {
                // error
                backgroundColor: colors.danger.primary,
                width: twoButtons ? '40%' : '80%',
              };

  const styleButtonCommon: TextStyle = {
    padding: 0,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 25,
    maxWidth: '90%',
    minWidth: '30%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const styleText: TextStyle =
    type === ButtonTypeEnum.Primary
      ? {
          color: colors.text,
        }
      : type === ButtonTypeEnum.Secondary
        ? {
            color: colors.text,
          }
        : type === ButtonTypeEnum.Tertiary
          ? {
              color: colors.text,
            }
          : type === ButtonTypeEnum.Ghost
            ? {
                color: colors.text,
              }
            : {
                // error
                color: colors.danger.primary,
              };
  const styleTextCommon: TextStyle = {
    fontWeight: 'normal',
    fontSize: 18,
    textAlign: 'center',
  };

  return (
    <TouchableOpacity
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={{
        ...styleButton,
        ...styleButtonCommon,
        ...style,
      }}
      disabled={disabled}
      onPress={() => onPress()}
    >
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
        }}
      >
        <Text
          style={{
            ...styleTextCommon,
            ...styleText,
            ...textStyle,
          }}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Button;
