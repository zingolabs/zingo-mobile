import type { TextStyle } from 'react-native';

export type TextVariant =
  | 'balance'
  | 'screenTitle'
  | 'subtitle'
  | 'button'
  | 'bodyStrong'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'address';

/** How far each style grows with the OS text size (`maxFontSizeMultiplier`). */
export const fontScaleBody = 2;
export const fontScaleTitle = 1.5;
export const fontScaleDisplay = 1.3;

type VariantStyle = {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  cap: number;
  mono?: true;
};

export const textVariants: Record<TextVariant, VariantStyle> = {
  balance: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    cap: fontScaleDisplay,
  },
  screenTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    cap: fontScaleTitle,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    cap: fontScaleTitle,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    cap: fontScaleTitle,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    cap: fontScaleBody,
  },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400', cap: fontScaleBody },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    cap: fontScaleBody,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    cap: fontScaleBody,
  },
  address: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    cap: fontScaleBody,
    mono: true,
  },
};
