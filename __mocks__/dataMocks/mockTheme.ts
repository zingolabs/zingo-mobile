import { DefaultTheme } from '@react-navigation/native';
import type { ThemeColors } from '@app/theme';

// The drifted values (`#18bd18` for the accent, `#c3c3c3` for text) predate the
// token layer and stay wrong on purpose: the 43 snapshot suites are baselined
// on them. Reconciling them with the real palette is out of the migration's
// scope. Danger is the exception: it changed meaning (orange to the one red),
// so the mock follows the real value.
const colors: ThemeColors = {
  bgCanvas: '#011401',
  bgSurface: '#031124',
  bgChrome: '#040C17',
  bottomSheetBorder: '#05234C',
  borderFocus: '#0B3A75',
  borderSubtle: '#FFFFFF0F',
  sheetHandle: '#1B3C6B',

  fgDefault: '#c3c3c3',

  fgMuted: '#888888',
  borderMuted: '#888888',
  bgMuted: '#888888',
  bgMutedSubtle: '#8888881F',

  fgAccent: '#18bd18',
  borderAccent: '#18bd18',
  bgAccent: '#18bd18',
  bgAccentSubtle: '#18bd181F',
  fgOnAccent: '#060B12',

  fgAccentDisabled: '#5a8c5a',
  borderAccentDisabled: '#5a8c5a',
  bgAccentDisabled: '#5a8c5a',

  fgSyncing: '#ebff5a',
  borderSyncing: '#ebff5a',

  fgWarning: '#F99D00',
  borderWarning: '#65491C',
  bgWarning: '#262527',
  bgWarningSubtle: '#F99D001F',

  fgDanger: '#E5484D',
  borderDanger: '#E5484D',
  bgDanger: '#E5484D',
  bgDangerSubtle: '#E5484D1F',

  fgViewOnly: '#8FB4E6',
  bgViewOnlySubtle: '#8FB4E61F',

  bgNym: '#07FF94',

  fgOrchard: '#4E8E96',
  borderOrchard: '#2E5E66',
  bgOrchard: '#0B1D26',
  fgSapling: '#8DBF7A',
  borderSapling: '#314533',
  bgSapling: '#141D1C',
  fgIronwood: '#E4C28F',
  borderIronwood: '#5A4630',
  bgIronwood: '#241A12',
  fgTransparent: '#E6C46A',
  bgTransparent: '#E6C46A1F',

  fgCategory1: '#18bd18',
  bgCategory1: '#18bd181F',
  fgCategory2: '#8FB4E6',
  bgCategory2: '#8FB4E61F',
  fgCategory3: '#E6C46A',
  bgCategory3: '#E6C46A1F',
  fgCategory4: '#F07A86',
  bgCategory4: '#F07A861F',
  fgCategory5: '#B79CF2',
  bgCategory5: '#B79CF21F',
};

export const mockTheme = {
  ...DefaultTheme,
  dark: true,
  colors,
};
