/**
 * Locale-aware number parsing and formatting, as a leaf module: its only
 * dependency is the device's number-format settings, so pure form logic
 * (and its unit tests) can use it without dragging in the native bridge
 * that the full Utils barrel imports.
 */
import { getNumberFormatSettings } from 'react-native-localize';

export function parseStringLocaleToNumberFloat(stringValue: string): number {
  const { decimalSeparator } = getNumberFormatSettings();

  return Number(stringValue.replace(new RegExp(`\\${decimalSeparator}`), '.'));
}

export function parseNumberFloatToStringLocale(
  numberValue: number,
  toFixed: number,
): string {
  const { decimalSeparator } = getNumberFormatSettings();

  const stringValue = numberValue.toFixed(toFixed);

  return stringValue.replace(new RegExp('\\.'), `${decimalSeparator}`);
}
