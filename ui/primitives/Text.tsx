import React, { createContext, useContext } from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
  StyleProp,
  useWindowDimensions,
} from 'react-native';
import { textVariants, useTheme } from '@app/theme';
import type { TextVariant } from '@app/theme';
import { ArrowRightIcon } from './Icons/ArrowRightIcon';

export type TextTone =
  'default' | 'muted' | 'accent' | 'danger' | 'warning' | 'transparent';

const monoFamily = Platform.select({ ios: 'Menlo', default: 'monospace' });

const ARROW = '→';
/** The drawn arrow against the text's size, and how far it drops to sit on the x-height. */
const ARROW_EM = 0.9;
const ARROW_DROP_EM = 0.1;

/**
 * Every "→" in the text is drawn as an icon: some phones' fonts draw the
 * character wrong (a Tecno showed "ʼn"), and an icon looks the same on all.
 */
function drawArrows(
  children: React.ReactNode,
  size: number,
  color: string,
): React.ReactNode {
  const arrow = (key: string) => (
    <ArrowRightIcon
      key={key}
      // The arrow takes the text's size, not an icon token: it stands for a character.
      // eslint-disable-next-line no-restricted-syntax
      size={size * ARROW_EM}
      color={color}
      style={{ transform: [{ translateY: size * ARROW_DROP_EM }] }}
    />
  );
  const hasArrow = (node: React.ReactNode): boolean =>
    typeof node === 'string'
      ? node.includes(ARROW)
      : Array.isArray(node) && node.some(hasArrow);
  if (!hasArrow(children)) {
    return children;
  }
  return React.Children.map(children, (child, i) =>
    typeof child === 'string' && child.includes(ARROW)
      ? child
          .split(ARROW)
          .flatMap((part, j) => (j === 0 ? [part] : [arrow(`${i}-${j}`), part]))
      : child,
  );
}

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
  /** Struck through: an amount or an address that is no longer good. */
  strike?: boolean;
  style?: StyleProp<TextStyle>;
};

const Text: React.FunctionComponent<TextProps> = ({
  variant = 'body',
  tone = 'default',
  color,
  strike = false,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  const scale = useContext(TextScaleContext);
  const { fontScale } = useWindowDimensions();
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
    ...(strike ? { textDecorationLine: 'line-through' as const } : {}),
    ...own,
  };

  if (scale !== 1) {
    const k = Math.min(scale, v.cap);
    merged.fontSize = (merged.fontSize ?? v.fontSize) * k;
    if (merged.lineHeight !== undefined) {
      merged.lineHeight *= k;
    }
  }

  /** The OS scales the text but not a drawn arrow: the arrow follows it. */
  const arrowSize =
    (merged.fontSize ?? v.fontSize) *
    (scale === 1 ? Math.min(fontScale, v.cap) : 1);
  return (
    <RNText maxFontSizeMultiplier={v.cap} {...rest} style={merged}>
      {drawArrows(rest.children, arrowSize, String(merged.color))}
    </RNText>
  );
};

export default Text;
