import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@app/theme';
import { FRESH_MS } from '@screens/History/useFreshRows';

/**
 * A row that just arrived: it starts lit in green and fades back to the
 * panel over 1.6 s.
 */
export default function FreshGlow({
  fresh,
  children,
}: {
  fresh: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const lit = useSharedValue(0);
  useEffect(() => {
    if (!fresh) {
      return;
    }
    lit.value = 1;
    lit.value = withTiming(0, {
      duration: FRESH_MS,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
  }, [fresh, lit]);
  const glow = useAnimatedStyle(() => ({ opacity: lit.value }));
  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.bgAccentSubtle },
          glow,
        ]}
      />
      {children}
    </View>
  );
}
