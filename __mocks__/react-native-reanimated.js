const Animated = class Animated {
  static View() {
    return '';
  }
};

const useAnimatedStyle = jest.fn(() => ({}));
const useSharedValue = jest.fn(v => ({ value: v }));
const useAnimatedGestureHandler = jest.fn(() => ({}));
const useAnimatedReaction = jest.fn();
const withTiming = jest.fn(v => v);
const withSpring = jest.fn(v => v);
const runOnJS = jest.fn(fn => fn);
const Easing = {
  linear: v => v,
  ease: v => v,
  cubic: v => v,
  out: () => v => v,
  in: () => v => v,
  inOut: () => v => v,
};

export default Animated;

export {
  useAnimatedStyle,
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedReaction,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
};
