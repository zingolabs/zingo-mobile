import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useBottomSheetModal } from '@gorhom/bottom-sheet';

/**
 * Wires Android's hardware/gesture back to dismiss the topmost BottomSheetModal
 * before letting navigation pop the screen. Behaviour:
 *
 *   - Sheet open  → dismiss() pops the top one; remaining stacked sheets
 *                   (e.g. ListSelect over Server) stay visible. Event is
 *                   consumed so the screen doesn't navigate.
 *   - No sheet    → dismiss() returns false; the event falls through to
 *                   React Navigation's default back handling.
 *
 * Mount once per BottomSheetModalProvider via the <BottomSheetBackHandler />
 * wrapper, since the hook reads from the modal context.
 */
function useBottomSheetBackHandler() {
  const { dismiss } = useBottomSheetModal();

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () =>
      dismiss(),
    );
    return () => sub.remove();
  }, [dismiss]);
}

export const BottomSheetBackHandler: React.FC = () => {
  useBottomSheetBackHandler();
  return null;
};
