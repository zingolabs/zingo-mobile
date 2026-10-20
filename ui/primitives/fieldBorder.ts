import type { ThemeColors } from '@app/theme';

/** What a field knows about its value. */
export type FieldValidity = 'unknown' | 'valid' | 'invalid';

/**
 * The edge of every text field: blue at rest, a lighter blue in focus,
 * green once the value is valid and red when it is not. Validity wins
 * over focus, so a field the user is still in shows how its value stands.
 */
export const fieldBorder = (
  colors: ThemeColors,
  focused: boolean,
  validity: FieldValidity = 'unknown',
): string =>
  validity === 'invalid'
    ? colors.borderDanger
    : validity === 'valid'
      ? colors.borderAccent
      : focused
        ? colors.borderFocus
        : colors.bottomSheetBorder;
