const { Image, ScrollView, Text, View } = require('react-native');

// Animated hosts render as their plain counterparts. The stub this replaced
// returned an empty string from Animated.View, so anything wrapped in one
// dropped out of the tree along with its children.
const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent: c => c,
};

// Entering, exiting and layout builders are chainable and never run under the
// test renderer, so every config method hands the builder back.
class AnimationBuilder {
  duration() {
    return this;
  }
  delay() {
    return this;
  }
  easing() {
    return this;
  }
  springify() {
    return this;
  }
  damping() {
    return this;
  }
  dampingRatio() {
    return this;
  }
  stiffness() {
    return this;
  }
  mass() {
    return this;
  }
  randomDelay() {
    return this;
  }
  reduceMotion() {
    return this;
  }
  withCallback() {
    return this;
  }
  withInitialValues() {
    return this;
  }
  build() {
    return () => ({ initialValues: {}, animations: {} });
  }
}

const FadeIn = new AnimationBuilder();
const FadeInUp = new AnimationBuilder();
const FadeInDown = new AnimationBuilder();
const FadeOut = new AnimationBuilder();
const LinearTransition = new AnimationBuilder();
const Layout = new AnimationBuilder();

const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
const Extrapolation = {
  IDENTITY: 'identity',
  CLAMP: 'clamp',
  EXTEND: 'extend',
};

// Styles stay empty: the callbacks are worklets, and running them here would
// only exercise the mock's own stand-ins.
const useAnimatedStyle = jest.fn(() => ({}));
const useSharedValue = jest.fn(v => ({ value: v }));
const useDerivedValue = jest.fn(fn => ({ value: fn() }));
const useAnimatedGestureHandler = jest.fn(() => ({}));
const useAnimatedReaction = jest.fn();
const useAnimatedRef = jest.fn(() => ({ current: null }));
const withTiming = jest.fn(v => v);
const withSpring = jest.fn(v => v);
const withDelay = jest.fn((_, v) => v);
const withSequence = jest.fn(v => v);
const withRepeat = jest.fn(v => v);
const cancelAnimation = jest.fn();
const runOnJS = jest.fn(fn => fn);
const runOnUI = jest.fn(fn => fn);
const interpolate = jest.fn(() => 0);
const interpolateColor = jest.fn(() => 'transparent');
const Easing = {
  linear: v => v,
  ease: v => v,
  cubic: v => v,
  out: () => v => v,
  in: () => v => v,
  inOut: () => v => v,
  bezier: () => ({ factory: v => v }),
};

export default Animated;

export {
  cancelAnimation,
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  interpolate,
  interpolateColor,
  Layout,
  LinearTransition,
  ReduceMotion,
  runOnJS,
  runOnUI,
  useAnimatedGestureHandler,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
};
