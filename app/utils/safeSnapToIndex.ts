import type { RefObject } from 'react';
import type BottomSheet from '@gorhom/bottom-sheet';

/**
 * Wrapper around `BottomSheet.snapToIndex` that clamps the target index to
 * the valid range derived from the current snapPoints length.
 *
 * gorhom v5 asserts `-1 <= index < snapPoints.length` and throws
 * `'index' was provided but out of the provided snap points range!` when
 * violated — uncaught, this kills the screen.
 *
 * Caveat: this only protects programmatic snapToIndex calls. The real
 * root-cause of the in-the-wild crash is gorhom's internal useEffect that
 * fires `handleSnapToIndex(_providedIndex)` when the `index` prop changes,
 * combined with a `useDerivedValue` over `snapPoints` that only re-evaluates
 * when its SharedValue deps (layoutState) change — NOT when the snapPoints
 * prop closure changes. So a reactive `index` racing with a snapPoints
 * change reads stale detents and crashes. The fix is to keep `index` static
 * (typically `{0}`) and move the sheet via the ref through this helper.
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
