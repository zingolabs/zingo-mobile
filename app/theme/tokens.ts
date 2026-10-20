/** The semantic token layer: flat camelCase, surface plus role (CONTEXT.md). */

export type ThemeColors = {
  bgCanvas: string;
  bgSurface: string;
  bgChrome: string;
  bottomSheetBorder: string;
  /** Fields: blue at rest and in focus, accent when valid, danger when not. */
  borderFocus: string;
  /** Hairline between rows inside a card. */
  borderSubtle: string;
  /** The grab pill at the top of a bottom sheet. */
  sheetHandle: string;
  /** The veil behind a sheet that asks before leaving. */
  bgScrim: string;

  fgDefault: string;

  fgMuted: string;
  borderMuted: string;
  bgMuted: string;
  bgMutedSubtle: string;

  fgAccent: string;
  borderAccent: string;
  bgAccent: string;
  bgAccentSubtle: string;
  /** Text and icons on a filled button: accent, danger and Nym. */
  fgOnAccent: string;

  fgAccentDisabled: string;
  borderAccentDisabled: string;
  bgAccentDisabled: string;

  fgSyncing: string;
  borderSyncing: string;

  fgWarning: string;
  borderWarning: string;
  bgWarning: string;
  bgWarningSubtle: string;

  /** Errors and destructive actions only, never decoration. */
  fgDanger: string;
  borderDanger: string;
  bgDanger: string;
  bgDangerSubtle: string;

  /** View-only (watch-only) wallet marks: the snowflake and its tiles. */
  fgViewOnly: string;
  bgViewOnlySubtle: string;

  /** Nym's own green, only on actions that go through the mixnet. */
  bgNym: string;
  bgNymSubtle: string;

  /** A price move: up and down are not success and error. */
  fgPriceUp: string;
  fgPriceDown: string;

  fgOrchard: string;
  borderOrchard: string;
  bgOrchard: string;
  fgSapling: string;
  borderSapling: string;
  bgSapling: string;
  fgIronwood: string;
  borderIronwood: string;
  bgIronwood: string;
  fgTransparent: string;
  /** The brown pot of the sprout mark, part of the brand. */
  bgSproutPot: string;
  bgTransparent: string;

  /** Contact avatars and chart series; a contact keeps its category for life. */
  fgCategory1: string;
  bgCategory1: string;
  fgCategory2: string;
  bgCategory2: string;
  fgCategory3: string;
  bgCategory3: string;
  fgCategory4: string;
  bgCategory4: string;
  fgCategory5: string;
  bgCategory5: string;
};

const surface = '#031124';
const muted = '#8DA0B8';
const accent = '#149D05';
const accentSubtle = '#149D051F';
const accentDisabled = '#0D540C';
const syncing = '#EBFF5A';
const danger = '#E5484D';

export const themeTokens: ThemeColors = {
  bgCanvas: '#060B12',
  bgSurface: surface,
  bgChrome: surface,
  bottomSheetBorder: '#05234C',
  borderFocus: '#0B3A75',
  borderSubtle: '#FFFFFF0F',
  sheetHandle: '#1B3C6B',
  bgScrim: '#02060C9E',

  fgDefault: '#D3E2F8',

  fgMuted: muted,
  borderMuted: '#4A6487',
  bgMuted: muted,
  bgMutedSubtle: '#8DA0B81F',

  fgAccent: accent,
  borderAccent: accent,
  bgAccent: accent,
  bgAccentSubtle: accentSubtle,
  fgOnAccent: '#060B12',

  fgAccentDisabled: '#16700B',
  borderAccentDisabled: accentDisabled,
  bgAccentDisabled: accentDisabled,

  fgSyncing: syncing,
  borderSyncing: syncing,

  fgWarning: '#F99D00',
  borderWarning: '#65491C',
  bgWarning: '#1E1A10',
  bgWarningSubtle: '#F99D001F',

  fgDanger: danger,
  borderDanger: danger,
  bgDanger: danger,
  bgDangerSubtle: '#E5484D1F',

  fgViewOnly: '#8FB4E6',
  bgViewOnlySubtle: '#8FB4E61F',

  bgNym: '#07FF94',
  bgNymSubtle: '#07FF941F',

  fgPriceUp: '#3CC52A',
  fgPriceDown: '#F2878A',

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
  bgSproutPot: '#5A3A1E',
  bgTransparent: '#E6C46A1F',

  fgCategory1: accent,
  bgCategory1: accentSubtle,
  fgCategory2: '#8FB4E6',
  bgCategory2: '#8FB4E61F',
  fgCategory3: '#E6C46A',
  bgCategory3: '#E6C46A1F',
  fgCategory4: '#F07A86',
  bgCategory4: '#F07A861F',
  fgCategory5: '#B79CF2',
  bgCategory5: '#B79CF21F',
};
