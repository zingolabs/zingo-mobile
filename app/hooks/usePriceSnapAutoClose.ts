import BottomSheet from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef } from 'react';

import { safeSnapToIndex } from '@app/utils/safeSnapToIndex';

const PRICE_SNAP_TIMEOUT_MS = 30 * 1000;

/**
 * Arms a one-shot timer when the bottom sheet reaches the "price" snap
 * (the smallest snap, where the PriceRow at the bottom of the Header is
 * revealed). After 30 seconds it snaps back to `returnIndex`. Any sheet
 * movement before the timer fires cancels it.
 *
 * Returns an `onChange` callback to wire into the BottomSheet's `onChange`
 * prop (compose with any existing handler).
 *
 * Passing `priceIndex === null` disables the hook (e.g. when the PriceRow
 * isn't mounted because zecPrice has no value yet).
 *
 * `snapPointsLength` is needed because the auto-return snap goes through
 * `safeSnapToIndex` (which clamps + defers + try/catches gorhom's
 * out-of-range invariant). Without it, a `returnIndex` that becomes stale
 * mid-timer — e.g. the sheet shrunk while the user wasn't interacting —
 * would crash the screen when the timeout fires.
 */
export function usePriceSnapAutoClose(
  sheetRef: React.RefObject<BottomSheet | null>,
  priceIndex: number | null,
  returnIndex: number,
  snapPointsLength: number,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  return useCallback(
    (index: number) => {
      clear();
      if (priceIndex !== null && index === priceIndex) {
        timerRef.current = setTimeout(() => {
          safeSnapToIndex(sheetRef, returnIndex, snapPointsLength);
        }, PRICE_SNAP_TIMEOUT_MS);
      }
    },
    [clear, priceIndex, returnIndex, sheetRef, snapPointsLength],
  );
}
