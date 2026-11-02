import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space16, space24 } from '@app/theme/spacing';
import { useKeyboardHeight } from './useKeyboardHeight';

/**
 * The one distance from the bottom edge for a screen's, panel's or sheet's
 * lowest control: 16 above the home indicator or navigation bar, never less
 * than 24 on a device that reports no inset, and 16 above the keyboard
 * while it is open.
 */
export function useBottomActionPad(): number {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  return keyboard > 0
    ? keyboard + space16
    : Math.max(insets.bottom + space16, space24);
}
