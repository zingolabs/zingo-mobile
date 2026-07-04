import type { RefObject } from 'react';
import type BottomSheet from '@gorhom/bottom-sheet';

/**
 * Wrapper around `BottomSheet.snapToIndex` that clamps the target index to
 * the valid range derived from the current snapPoints length, defers the
 * actual call one frame so gorhom can consume the latest `snapPoints`
 * prop, and swallows the invariant violation if the race still slips
 * through.
 *
 * Background — three-layer defence:
 *
 * gorhom v5 asserts `-1 <= index < snapPoints.length` and throws
 * `'index' was provided but out of the provided snap points range!` when
 * violated. The throw is unhandled by React Native's default boundary and
 * kills the screen.
 *
 * The real race is: React-side `snapPoints.length` can grow before gorhom's
 * internal `useDerivedValue<detents>` re-evaluates (it only re-runs on
 * SharedValue dep changes, not on prop changes). A callback whose closure
 * captured the *new* length can call `snapToIndex(N)` while gorhom still
 * thinks the array has `N` entries (max index `N-1`) and crashes.
 *
 * Layers:
 *   1. **Clamp** by `snapPointsLength` so we never *intentionally* aim
 *      past the array we know about.
 *   2. **Defer** via `requestAnimationFrame` so any pending React render
 *      that grew/shrunk `snapPoints` has a tick to propagate into gorhom's
 *      internal layoutState before we snap.
 *   3. **Catch** any residual invariant the deferred call may still trip
 *      (e.g. snapPoints shrunk between schedule and fire) so the screen
 *      keeps working — we log and no-op rather than tear the tree down.
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
  // Defer one frame so a snapPoints prop that *just* changed in the same
  // render has time to reach gorhom's internal layoutState. Without this,
  // a synchronous snapToIndex right after a state update that grew the
  // array trips the invariant.
  requestAnimationFrame(() => {
    try {
      ref.current?.snapToIndex(safe);
    } catch (err) {
      // gorhom's invariant rejected the snap despite the clamp + defer.
      // Better to log and survive than to kill the screen — the worst
      // outcome here is "the sheet did not move," which is recoverable
      // by the next user gesture or layout change.
      const msg = err instanceof Error ? err.message : String(err);
      console.log('safeSnapToIndex: gorhom rejected snap, suppressed:', msg);
    }
  });
}
