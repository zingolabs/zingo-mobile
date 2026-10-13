export const GestureHandlerRootView = ({ children }) => children;

// Every builder call (`Gesture.Pan().activeOffsetX(-12).onEnd(fn)`) hands the
// same object back; nothing in it runs under the test renderer.
const builder = new Proxy(
  {},
  { get: (_, name) => (name === 'then' ? undefined : () => builder) },
);

export const Gesture = {
  Pan: () => builder,
  Tap: () => builder,
  LongPress: () => builder,
};

export const GestureDetector = ({ children }) => children;

export default {
  Swipeable: jest.fn().mockImplementation(({ children }) => children),
  RNGestureHandlerModule: {
    attachGestureHandler: jest.fn(),
    createGestureHandler: jest.fn(),
    dropGestureHandler: jest.fn(),
    updateGestureHandler: jest.fn(),
    forceTouchAvailable: jest.fn(),
    hasGenericPassword: jest.fn(),
    getSupportedBiometryType: jest.fn(),
    State: {},
    Directions: {},
  },
};
