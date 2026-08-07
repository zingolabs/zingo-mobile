// The semantic token layer. 24 roles, flat camelCase, per-surface.

export type ThemeColors = {
  bgCanvas: string;
  bgSurface: string;
  bgChrome: string;
  bottomSheetBorder: string;

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
  fgDangerEmphasis: string;
};

const base = {
  bgCanvas: '#010A17',
  bgSurface: '#031124',
  bgChrome: '#040C17',
  bottomSheetBorder: '#05234C',

  fgDefault: '#dadfe1',

  fgSyncing: '#ebff5a',
  borderSyncing: '#ebff5a',

  fgWarning: '#F99D00',
  fgWarningEmphasis: '#E1AA1B',
  fgWarningDark: '#DD7500',
  borderWarning: '#65491C',
  bgWarning: '#262527',

  fgDanger: '#FFB972',
  fgDangerEmphasis: '#dc2626',
} as const;

export const advancedTokens: ThemeColors = {
  ...base,
  fgAccent: '#43a637',
  borderAccent: '#43a637',
  bgAccent: '#43a637',
  fgAccentDisabled: '#23692f',
  borderAccentDisabled: '#23692f',
  bgAccentDisabled: '#23692f',
  bgSecondaryDisabled: '#183f24',
  fgMuted: '#7c8494',
  borderMuted: '#7c8494',
  bgMuted: '#7c8494',
};

export const basicTokens: ThemeColors = {
  ...base,
  fgAccent: '#60849c',
  borderAccent: '#60849c',
  bgAccent: '#60849c',
  fgAccentDisabled: '#15576f',
  borderAccentDisabled: '#15576f',
  bgAccentDisabled: '#15576f',
  bgSecondaryDisabled: '#123a53',
  fgMuted: '#84848a',
  borderMuted: '#84848a',
  bgMuted: '#84848a',
};
