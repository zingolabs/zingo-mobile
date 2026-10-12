// The semantic token layer. 24 roles, flat camelCase, per-surface.

export type ThemeColors = {
  bgCanvas: string;
  bgSurface: string;
  bgChrome: string;
  bottomSheetBorder: string;
  borderFocus: string;

  fgDefault: string;

  fgMuted: string;
  borderMuted: string;
  bgMuted: string;

  fgAccent: string;
  borderAccent: string;
  bgAccent: string;

  fgAccentDisabled: string;
  borderAccentDisabled: string;
  bgAccentDisabled: string;
  bgSecondaryDisabled: string;

  fgSyncing: string;
  borderSyncing: string;

  fgWarning: string;
  fgWarningEmphasis: string;
  fgWarningDark: string;
  borderWarning: string;
  bgWarning: string;

  fgDanger: string;

  // View-only (watch-only) wallet marks: the snowflake and its tiles.
  fgViewOnly: string;
  fgDangerEmphasis: string;
};

const base = {
  bgCanvas: '#060B12',
  bgSurface: '#05101E',
  bgChrome: '#040C17',
  bottomSheetBorder: '#05234C',
  borderFocus: '#0B3A75',
  fgDefault: '#c0cbdc',

  fgSyncing: '#ebff5a',
  borderSyncing: '#ebff5a',

  fgWarning: '#F99D00',
  fgWarningEmphasis: '#E1AA1B',
  fgWarningDark: '#DD7500',
  borderWarning: '#65491C',
  bgWarning: '#262527',

  fgDanger: '#FFB972',

  fgViewOnly: '#8FB4E6',
  fgDangerEmphasis: '#dc2626',
} as const;

export const themeTokens: ThemeColors = {
  ...base,
  fgAccent: '#43a637',
  borderAccent: '#43a637',
  // TODO: 1AD007
  bgAccent: '#43a637',
  fgAccentDisabled: '#23692f',
  borderAccentDisabled: '#23692f',
  bgAccentDisabled: '#23692f',
  bgSecondaryDisabled: '#183f24',
  fgMuted: '#7c8494',
  borderMuted: '#7c8494',
  bgMuted: '#7c8494',
};
