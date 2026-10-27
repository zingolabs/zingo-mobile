import React, { createContext, forwardRef, useContext, useEffect } from 'react';
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
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';

/**
 * How a control answers a press, by its kind (DESIGN.md "Pressing").
 * button: buttons and pills, scale to 0.97 · row: rows and tappable cards,
 * their background takes `bgMutedSubtle` · icon: icon-only buttons, scale
 * to 0.88, never a background · link: text links, fade to 0.6 · tile: a
 * cell whose `PressTile` child scales to 0.94 while the rest stays still.
 */
export type PressKind = 'button' | 'row' | 'icon' | 'link' | 'tile';

export type PressableProps = Omit<RNPressableProps, 'style' | 'children'> & {
  kind: PressKind;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const PRESSED_SCALE = 0.97;
const PRESSED_ICON_SCALE = 0.88;
const PRESSED_TILE_SCALE = 0.94;
const PRESSED_LINK_OPACITY = 0.6;

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/** How far the enclosing Pressable is pressed, 0 to 1, for a `PressTile`. */
const PressProgress = createContext<SharedValue<number> | undefined>(undefined);

/** The one pressable of the app: every control reacts the way its kind does. */
const Pressable = forwardRef<View, PressableProps>(
  (
    { kind, style, disabled, onPressIn, onPressOut, children, ...rest },
    ref,
  ) => {
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
      if (kind === 'button' || kind === 'icon') {
        const target = kind === 'button' ? PRESSED_SCALE : PRESSED_ICON_SCALE;
        return { transform: [{ scale: 1 - (1 - target) * pressed.value }] };
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
        ref={ref}
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
        <PressProgress.Provider value={pressed}>
          {children}
        </PressProgress.Provider>
      </AnimatedPressable>
    );
  },
);

/** The part of a `tile` cell that answers its press: it scales to 0.94. */
export function PressTile({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const pressed = useContext(PressProgress);
  const scaled = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - (1 - PRESSED_TILE_SCALE) * (pressed?.value ?? 0) },
    ],
  }));
  return <Animated.View style={[style, scaled]}>{children}</Animated.View>;
}

export default Pressable;
