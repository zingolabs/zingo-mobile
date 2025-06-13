const Animated = class Animated {
  static View() {
    return '';
  }
};

const useAnimatedStyle = jest.fn(() => ({}));
const useSharedValue = jest.fn((v) => ({ value: v }));
const useAnimatedGestureHandler = jest.fn(() => ({}));
const withTiming = jest.fn((v) => v);
const withSpring = jest.fn((v) => v);

export default Animated;

export {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  withTiming,
  withSpring,
};
