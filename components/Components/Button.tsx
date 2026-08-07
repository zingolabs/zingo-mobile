/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, Text, View, TextStyle } from 'react-native';
import { useTheme } from '../../app/theme';

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
  const { colors } = useTheme();

  const styleButton: TextStyle =
    type === ButtonTypeEnum.Primary
      ? {
          backgroundColor: disabled ? colors.bgAccentDisabled : colors.bgAccent,
          borderColor: disabled ? colors.borderAccentDisabled : colors.borderAccent,
          borderWidth: 2,
          width: twoButtons ? '40%' : '80%',
        }
      : type === ButtonTypeEnum.Secondary
        ? {
            backgroundColor: disabled
              ? colors.bgSecondaryDisabled
              : colors.bgSurface,
            borderColor: disabled ? colors.borderAccentDisabled : colors.borderAccent,
            borderWidth: 2,
            width: twoButtons ? '40%' : '80%',
          }
        : type === ButtonTypeEnum.Ghost
          ? {
              backgroundColor: 'transparent',
              color: colors.fgDefault,
            }
          : type === ButtonTypeEnum.Nym
            ? {
                backgroundColor: disabled ? '#4DAF7C' : '#07FF94',
                borderColor: disabled ? '#4DAF7C' : '#07FF94',
                borderWidth: 2,
                width: twoButtons ? '40%' : '80%',
              }
            : {
                // error
                backgroundColor: colors.bgAccent,
                width: twoButtons ? '40%' : '80%',
              };

  const styleButtonCommon: TextStyle = {
    padding: 0,
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 24,
    maxWidth: '90%',
    minWidth: '30%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const styleText: TextStyle =
    type === ButtonTypeEnum.Primary
      ? {
          color: colors.bgCanvas,
        }
      : type === ButtonTypeEnum.Secondary
        ? {
            color: disabled ? colors.fgAccentDisabled : colors.fgAccent,
          }
        : type === ButtonTypeEnum.Ghost
          ? {
              // Ghost carries brand-green (primary) text as its formal
              // style; instances no longer override the color per call.
              color: colors.fgAccent,
              textTransform: 'none',
            }
          : type === ButtonTypeEnum.Nym
            ? {
                color: colors.bgCanvas,
              }
            : {
                // error
                color: colors.bgCanvas,
              };
  const styleTextCommon: TextStyle = {
    fontWeight: '600',
    textTransform: 'none',
    fontSize: 16,
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
