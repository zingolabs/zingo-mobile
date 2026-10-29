export const GestureHandlerRootView = ({ children }) => children;

/** Any gesture, with every builder method returning itself. */
const gesture = new Proxy({}, { get: () => () => gesture });
export const Gesture = new Proxy({}, { get: () => () => gesture });
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
