import { useKeyboardState } from 'react-native-keyboard-controller';

/**
 * Tracks the on-screen keyboard height. Returns 0 when the keyboard is hidden,
 * or the keyboard's pixel height when shown.
 *
 * Powered by `react-native-keyboard-controller`, which normalises keyboard
 * reporting across OEMs (stock Pixel, HiOS, MIUI, OneUI, ...). Before the
 * migration we used `Keyboard.addListener('keyboardDidShow')` plus an
 * Android-only "boost" hack to make HiOS-like skins behave like stock
 * Android. That caused a double-push on devices where the system already
 * shrinks the window correctly (Tecno Phantom X) and not enough lift on
 * Pixel — both symptoms are gone now because the library measures the same
 * way everywhere.
 *
 * Requires `<KeyboardProvider>` mounted at the app root (see App.tsx).
 */
export function useKeyboardHeight(): number {
  return useKeyboardState(state => (state.isVisible ? state.height : 0));
}
