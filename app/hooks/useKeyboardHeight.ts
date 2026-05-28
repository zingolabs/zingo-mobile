import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Tracks the on-screen keyboard height. Returns 0 when the keyboard is hidden,
 * the keyboard's pixel height when shown. Used to grow dynamically-sized
 * BottomSheet modals so their content stays visible above the keyboard on iOS
 * (Android already resizes via android_keyboardInputMode="adjustResize").
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      setHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
