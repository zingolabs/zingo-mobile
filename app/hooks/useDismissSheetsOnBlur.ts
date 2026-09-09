import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomSheetModal } from '@gorhom/bottom-sheet';

/**
 * Dismisses every open BottomSheetModal when the calling screen loses focus
 * (hardware back, iOS edge-swipe, tab switch, drawer open). BottomSheetModal
 * content is portaled under the global BottomSheetModalProvider, so it does
 * not unmount with the screen — without this hook a modal stays visible on
 * top of the next screen.
 */
export function useDismissSheetsOnBlur() {
  const { dismissAll } = useBottomSheetModal();

  useFocusEffect(
    useCallback(() => {
      return () => {
        dismissAll();
      };
    }, [dismissAll]),
  );
}
