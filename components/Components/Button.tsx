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
          borderColor: disabled ? colors.primaryDisabled : colors.primary,
          borderWidth: 2,
          width: twoButtons ? '40%' : '80%',
        }
      : type === ButtonTypeEnum.Secondary
      ? {
          backgroundColor: disabled ? colors.secondaryDisabled : colors.background,
          borderColor: disabled ? colors.primaryDisabled : colors.primary,
          borderWidth: 2,
          width: twoButtons ? '40%' : '80%',
        }
      : type === ButtonTypeEnum.Tertiary
      ? {
          backgroundColor: colors.tertiary,
          width: twoButtons ? '40%' : '80%',
        }
      : type === ButtonTypeEnum.Ghost
      ? {
          backgroundColor: 'transparent',
          color: 'red',
          width: twoButtons ? '40%' : '80%',
        }
      : {
          // error
          backgroundColor: colors.primary,
          width: twoButtons ? '40%' : '80%',
        };

  const styleButtonCommon: TextStyle = {
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

  const styleText: TextStyle =
    type === ButtonTypeEnum.Primary
      ? {
          color: colors.background,
        }
      : type === ButtonTypeEnum.Secondary
      ? {
          color: disabled ? colors.primaryDisabled : colors.primary,
        }
      : type === ButtonTypeEnum.Tertiary
      ? {
          color: colors.text,
        }
      : type === ButtonTypeEnum.Ghost
      ? {
          color: colors.money,
          opacity: 0.5,
        }
      : {
          // error
          color: colors.background,
        };
  const styleTextCommon: TextStyle = {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 16,
    textAlign: 'center',
  };

  //if (type === ButtonTypeEnum.Tertiary) {
  //  console.log(styleText, styleTextCommon);
  //}

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
            ...styleText,
            ...styleTextCommon,
          }}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Button;
