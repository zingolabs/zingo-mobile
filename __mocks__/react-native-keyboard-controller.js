// Minimal mock for react-native-keyboard-controller.
// Tests run in a JSDOM-style environment with no native keyboard module —
// we just stub the provider as a passthrough and the hooks return safe
// defaults (no keyboard visible, height 0).
const React = require('react');

const passthrough = ({ children }) => children;

const defaultState = {
  isVisible: false,
  height: 0,
  duration: 0,
  timestamp: 0,
  target: -1,
  type: 0,
  appearance: 'light',
};

const useKeyboardState = selector =>
  selector ? selector(defaultState) : defaultState;

const useKeyboardAnimation = () => ({
  progress: { value: 0 },
  height: { value: 0 },
});

const useReanimatedKeyboardAnimation = () => ({
  progress: { value: 0 },
  height: { value: 0 },
});

const noop = () => {};

module.exports = {
  KeyboardProvider: passthrough,
  KeyboardAvoidingView: passthrough,
  KeyboardStickyView: passthrough,
  KeyboardAwareScrollView: passthrough,
  KeyboardToolbar: passthrough,
  OverKeyboardView: passthrough,
  KeyboardExtender: passthrough,
  KeyboardChatScrollView: passthrough,
  useKeyboardState,
  useKeyboardAnimation,
  useReanimatedKeyboardAnimation,
  useKeyboardHandler: noop,
  useGenericKeyboardHandler: noop,
  useResizeMode: noop,
  useKeyboardController: () => ({
    setEnabled: noop,
    enabled: true,
  }),
  useFocusedInputHandler: noop,
  useReanimatedFocusedInput: () => ({ input: { value: null } }),
  KeyboardEvents: {
    addListener: () => ({ remove: noop }),
  },
  KeyboardController: {
    dismiss: noop,
    setInputMode: noop,
    setDefaultMode: noop,
    isVisible: () => false,
  },
};
// Keep React import referenced so bundlers don't strip it in environments
// that need it for createElement (the passthroughs above are React
// children, not elements, so this is belt-and-suspenders).

React;
