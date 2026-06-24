import type { RefObject } from 'react';
import type BottomSheet from '@gorhom/bottom-sheet';

/**
 * Wrapper around `BottomSheet.snapToIndex` that clamps the target index to
 * the valid range derived from the current snapPoints length.
 *
 * gorhom v5 asserts `-1 <= index < snapPoints.length` and throws
 * `'index' was provided but out of the provided snap points range!`
 * when violated — uncaught, this kills the screen and tripped Google Play
 * pre-launch review on the 315/316 betas. Any time we compute a target
 * inside an effect or callback, snapPoints may not yet be propagated to the
 * sheet's internal detents (mount race, USD/price row appearing, currency
 * toggle, container/header measurement). Clamping here turns those races
 * into a no-op visual nudge instead of a crash.
 *
 * - `index < 0` is preserved (gorhom uses `-1` to close the sheet).
 * - `index >= snapPointsLength` is clamped to `snapPointsLength - 1`.
 * - `snapPointsLength <= 0` is treated as not-ready and skipped.
 */
export function safeSnapToIndex(
  ref: RefObject<BottomSheet | null>,
  index: number,
  snapPointsLength: number,
): void {
  if (snapPointsLength <= 0) return;
  const safe = index < 0 ? -1 : Math.min(index, snapPointsLength - 1);
  ref.current?.snapToIndex(safe);
}
