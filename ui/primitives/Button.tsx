/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, Text, View, TextStyle } from 'react-native';
import { useTheme } from '@app/theme';

export enum ButtonTypeEnum {
  Primary = 'Primary',
  Secondary = 'Secondary',
  Ghost = 'Ghost',
  Warning = 'Warning',
  Nym = 'Nym',
  // A destructive action: red fill, white text.
  Danger = 'Danger',
  // A quiet text action, such as Cancel under a sheet's main button.
  Link = 'Link',
}

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
  // Spans the whole row.
  fullWidth?: boolean;
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
  fullWidth,
}) => {
  const { colors } = useTheme();

  const styleButton: TextStyle =
    type === ButtonTypeEnum.Primary
      ? {
          backgroundColor: disabled ? colors.bgAccentDisabled : colors.bgAccent,
          borderColor: disabled
            ? colors.borderAccentDisabled
            : colors.borderAccent,
          borderWidth: 2,
          width: twoButtons ? '40%' : '80%',
        }
      : type === ButtonTypeEnum.Secondary
        ? {
            // A borderless text button, as in the prototype screens.
            backgroundColor: 'transparent',
            width: twoButtons ? '40%' : '80%',
          }
        : type === ButtonTypeEnum.Ghost
          ? {
              backgroundColor: 'transparent',
              color: colors.fgDefault,
            }
          : type === ButtonTypeEnum.Danger
            ? {
                backgroundColor: colors.bgDanger,
                width: twoButtons ? '40%' : '80%',
              }
            : type === ButtonTypeEnum.Link
              ? {
                  backgroundColor: 'transparent',
                  minHeight: 38,
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
          fontWeight: '700',
        }
      : type === ButtonTypeEnum.Secondary
        ? {
            color: disabled ? colors.fgAccentDisabled : colors.fgAccent,
            fontWeight: '700',
          }
        : type === ButtonTypeEnum.Ghost
          ? {
              // Ghost carries brand-green (primary) text as its formal
              // style; instances no longer override the color per call.
              color: colors.fgAccent,
              textTransform: 'none',
            }
          : type === ButtonTypeEnum.Danger
            ? {
                color: '#ffffff',
                fontWeight: '700',
              }
            : type === ButtonTypeEnum.Link
              ? {
                  color: colors.fgMuted,
                  fontSize: 13,
                  fontWeight: '500',
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
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        ...styleButton,
        ...styleButtonCommon,
        ...(type === ButtonTypeEnum.Link ? { minHeight: 38 } : {}),
        ...(fullWidth ? { width: '100%', maxWidth: '100%' } : {}),
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
