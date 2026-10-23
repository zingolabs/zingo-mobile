/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {
  buttonMinHeight,
  fontScaleTitle,
  buttonMinHeightSmall,
  radiusPill,
  space16,
  space24,
  space8,
  touchTarget,
  useTheme,
} from '@app/theme';
import Text from './Text';

/** The minimum height of every regular button in the app. */
export const BUTTON_HEIGHT = buttonMinHeight;

/**
 * primary: the one main action of a view · text: green, Back, Skip and
 * secondary moves · quiet: gray, only Cancel and a Close that leaves a flow ·
 * danger: deletes or cannot be undone · nym: only actions through the mixnet.
 */
export type ButtonVariant = 'primary' | 'text' | 'quiet' | 'danger' | 'nym';

/** small: inside banners and rows only. */
export type ButtonSize = 'regular' | 'small';

export type ButtonProps = {
  variant: ButtonVariant;
  title: string;
  disabled?: boolean;
  onPress: () => void;
  size?: ButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessible?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  /**
   * Takes its label's width instead of its container's: only for a button
   * that reads as a link inside a line of text.
   */
  inline?: boolean;
  /** Working: a spinner takes the label's place and presses wait. */
  busy?: boolean;
};

const Button: React.FunctionComponent<ButtonProps> = ({
  variant,
  title,
  disabled,
  onPress,
  size = 'regular',
  style,
  textStyle,
  accessible,
  accessibilityLabel,
  testID,
  inline,
  busy = false,
}) => {
  const { colors } = useTheme();
  const small = size === 'small';
  const minHeight = small ? buttonMinHeightSmall : buttonMinHeight;
  /** A small button still takes a full `touchTarget`. */
  const slop = (touchTarget - minHeight) / 2;

  const fill = {
    primary: colors.bgAccent,
    danger: colors.bgDanger,
    nym: colors.bgNym,
    text: undefined,
    quiet: undefined,
  }[variant];
  const label =
    fill !== undefined
      ? colors.fgOnAccent
      : variant === 'quiet'
        ? colors.fgMuted
        : disabled
          ? colors.fgAccentDisabled
          : colors.fgAccent;

  return (
    <TouchableOpacity
      testID={testID}
      accessible={accessible}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, busy }}
      hitSlop={slop > 0 ? { top: slop, bottom: slop } : undefined}
      style={{
        backgroundColor:
          fill !== undefined && disabled ? colors.bgAccentDisabled : fill,
        borderRadius: radiusPill,
        minHeight,
        maxWidth: '100%',
        paddingHorizontal: small ? space16 : space24,
        paddingVertical: small ? 0 : space8,
        alignItems: 'center',
        justifyContent: 'center',
        /** Every action spans its form or container; the container sets the gutter. */
        ...(inline ? {} : { alignSelf: 'stretch', width: '100%' }),
        ...style,
      }}
      disabled={disabled || busy}
      onPress={() => onPress()}
    >
      {busy ? (
        <ActivityIndicator size="small" color={label} />
      ) : (
        <Text
          variant={small ? 'bodySmall' : 'button'}
          maxFontSizeMultiplier={fontScaleTitle}
          color={label}
          style={{
            textAlign: 'center',
            ...(small ? { fontWeight: '700' } : {}),
            ...textStyle,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;
