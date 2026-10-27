import React, { useEffect } from 'react';
import {
  GestureResponderEvent,
  Pressable as RNPressable,
  PressableProps as RNPressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { radiusPill, touchTarget, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';

/**
 * How a control answers a press, by its kind (DESIGN.md "Pressing").
 * button: buttons and pills, scale to 0.97 · row: rows and tappable cards,
 * their background takes `bgMutedSubtle` · icon: icon-only buttons, a
 * `bgMutedSubtle` circle the size of the tap area · link: text links, fade
 * to 0.6.
 */
export type PressKind = 'button' | 'row' | 'icon' | 'link';

export type PressableProps = Omit<RNPressableProps, 'style' | 'children'> & {
  kind: PressKind;
  style?: StyleProp<ViewStyle>;
  /** icon: the circle's diameter, for a tap area larger than `touchTarget`. */
  circle?: number;
  children?: React.ReactNode;
};

const PRESSED_SCALE = 0.97;
const PRESSED_LINK_OPACITY = 0.6;

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/** The one pressable of the app: every control reacts the way its kind does. */
const Pressable: React.FunctionComponent<PressableProps> = ({
  kind,
  style,
  circle = touchTarget,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}) => {
  const { colors } = useTheme();
  const pressed = useSharedValue(0);
  const to = (value: number) => {
    pressed.value = withTiming(value, {
      duration: duration.fast,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
  };

  /** A control disabled while held lets go: a disabled control does not react. */
  useEffect(() => {
    if (disabled) {
      pressed.value = 0;
    }
  }, [disabled, pressed]);

  const own = useAnimatedStyle(() => {
    if (kind === 'button') {
      return {
        transform: [{ scale: 1 - (1 - PRESSED_SCALE) * pressed.value }],
      };
    }
    if (kind === 'link') {
      return { opacity: 1 - (1 - PRESSED_LINK_OPACITY) * pressed.value };
    }
    return {};
  });
  const shade = useAnimatedStyle(() => ({ opacity: pressed.value }));

  const borderRadius = StyleSheet.flatten(style)?.borderRadius;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        to(1);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        to(0);
        onPressOut?.(e);
      }}
      style={[style, own]}
    >
      {kind === 'row' && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.bgMutedSubtle, borderRadius },
            shade,
          ]}
        />
      )}
      {kind === 'icon' && (
        <View pointerEvents="none" style={styles.center}>
          <Animated.View
            style={[
              {
                width: circle,
                height: circle,
                borderRadius: radiusPill,
                backgroundColor: colors.bgMutedSubtle,
              },
              shade,
            ]}
          />
        </View>
      )}
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  /** Centres the circle on the icon, even when it is larger than the icon. */
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Pressable;
