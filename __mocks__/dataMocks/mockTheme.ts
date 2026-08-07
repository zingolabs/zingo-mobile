import { DefaultTheme } from '@react-navigation/native';
import type { ThemeColors } from '../../app/theme';

// The drifted values (`#18bd18` for the accent, `#c3c3c3` for text) predate the
// token layer and stay wrong on purpose: the 43 snapshot suites are baselined
// on them. Reconciling them with the real palette is out of the migration's
// scope.
const colors: ThemeColors = {
  bgCanvas: '#011401',
  bgSurface: '#031124',
  bgChrome: '#040C17',
  bottomSheetBorder: '#05234C',

  fgDefault: '#c3c3c3',

  fgMuted: '#888888',
  borderMuted: '#888888',
  bgMuted: '#888888',

  fgAccent: '#18bd18',
  borderAccent: '#18bd18',
  bgAccent: '#18bd18',

  fgAccentDisabled: '#5a8c5a',
  borderAccentDisabled: '#5a8c5a',
  bgAccentDisabled: '#5a8c5a',
  bgSecondaryDisabled: '#233623',

  fgSyncing: '#ebff5a',
  borderSyncing: '#ebff5a',

  fgWarning: '#F99D00',
  fgWarningEmphasis: '#E1AA1B',
  fgWarningDark: '#DD7500',
  borderWarning: '#65491C',
  bgWarning: '#262527',

  fgDanger: '#FFB972',
  fgDangerEmphasis: '#dc2626',
};

export const mockTheme = {
  ...DefaultTheme,
  dark: true,
  colors,
  toggleTheme: () => {},
};
