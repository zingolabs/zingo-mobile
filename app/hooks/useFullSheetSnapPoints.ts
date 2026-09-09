import { useMemo } from 'react';

const SNAP_GAP = 4;
const MIN_SHEET_HEIGHT = 200;

/**
 * Computes the single snap point for a full-screen BottomSheet (Settings
 * pattern): the sheet sits just below the measured Header, leaving a small
 * gap. Falls back to '95%' until both heights are measured.
 */
export function useFullSheetSnapPoints(
  containerH: number,
  headerH: number,
): (string | number)[] {
  return useMemo(() => {
    if (containerH <= 0 || headerH <= 0) {
      return ['95%'];
    }
    return [Math.max(containerH - headerH - SNAP_GAP, MIN_SHEET_HEIGHT)];
  }, [containerH, headerH]);
}
