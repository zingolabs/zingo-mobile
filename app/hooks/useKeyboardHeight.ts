import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Extra pixels added to the reported keyboard height on Android. The native
// `android_keyboardInputMode="adjustResize"` resizes the window when the
// keyboard appears, but the resize doesn't always leave enough breathing room
// above the keyboard for the sheet's bottom action button; this small boost
// closes the gap. iOS does not need it because `keyboardWillShow` reports the
// keyboard height that translates well with gorhom's `keyboardBehavior`.
const ANDROID_KEYBOARD_BOOST = 15;

/**
 * Tracks the on-screen keyboard height. Returns 0 when the keyboard is hidden,
 * or the keyboard's pixel height (plus a small Android boost) when shown. Use
 * directly as part of a BottomSheet's `paddingBottom` so dynamically-sized
 * modals grow enough to keep their action buttons above the keyboard.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      const boost = Platform.OS === 'android' ? ANDROID_KEYBOARD_BOOST : 0;
      setHeight(e.endCoordinates.height + boost);
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
