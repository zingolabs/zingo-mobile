import React, { createContext, useContext } from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
  StyleProp,
} from 'react-native';
import { textVariants, useTheme } from '@app/theme';
import type { TextVariant } from '@app/theme';

export type TextTone =
  'default' | 'muted' | 'accent' | 'danger' | 'warning' | 'transparent';

const monoFamily = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * A simulated OS text size, for the web Storybook only: the web has no
 * `fontScale`, so the visual review sets this to capture the 200% variants.
 * In the app it stays 1 and the OS does the scaling.
 */
export const TextScaleContext = createContext(1);

export type TextProps = Omit<RNTextProps, 'style'> & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Wins over `tone`; for the rare color no tone names yet. */
  color?: string;
  style?: StyleProp<TextStyle>;
};

const Text: React.FunctionComponent<TextProps> = ({
  variant = 'body',
  tone = 'default',
  color,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  const scale = useContext(TextScaleContext);
  const v = textVariants[variant];
  const toneColor = {
    default: colors.fgDefault,
    muted: colors.fgMuted,
    accent: colors.fgAccent,
    danger: colors.fgDanger,
    warning: colors.fgWarning,
    transparent: colors.fgTransparent,
  }[tone];
  const own = StyleSheet.flatten(style) ?? {};

  const merged: TextStyle = {
    color: color ?? toneColor,
    fontSize: v.fontSize,
    fontWeight: v.fontWeight,
    /** A caller that sets its own size keeps RN's line height, so it never clips. */
    ...(own.fontSize === undefined ? { lineHeight: v.lineHeight } : {}),
    ...(v.mono ? { fontFamily: monoFamily } : {}),
    ...own,
  };

  if (scale !== 1) {
    const k = Math.min(scale, v.cap);
    merged.fontSize = (merged.fontSize ?? v.fontSize) * k;
    if (merged.lineHeight !== undefined) {
      merged.lineHeight *= k;
    }
  }

  return <RNText maxFontSizeMultiplier={v.cap} {...rest} style={merged} />;
};

export default Text;
