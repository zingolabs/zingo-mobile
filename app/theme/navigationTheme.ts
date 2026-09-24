import { DefaultTheme, Theme } from '@react-navigation/native';

import { ThemeColors } from './tokens';

export const navigationTheme = (colors: ThemeColors): Theme => ({
  ...DefaultTheme,
  dark: true,
  colors: {
    primary: colors.bgAccent,
    background: colors.bgCanvas,
    card: colors.bgCanvas,
    text: colors.fgDefault,
    border: colors.borderMuted,
    notification: '',
  },
});
