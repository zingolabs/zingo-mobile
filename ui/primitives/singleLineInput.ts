import { Platform, TextStyle } from 'react-native';

/**
 * iOS draws a single-line TextInput's text and placeholder low in its box
 * when the input has a lineHeight or vertical padding. There it fills its
 * row's height with neither, so the text centres on what sits beside it.
 */
export const singleLineInput = (lineHeight?: number): TextStyle =>
  Platform.OS === 'ios'
    ? { alignSelf: 'stretch', paddingVertical: 0 }
    : lineHeight === undefined
      ? {}
      : { lineHeight };
