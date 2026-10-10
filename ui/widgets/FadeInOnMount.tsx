import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ease } from '@app/theme/motion';

type FadeInOnMountProps = {
  duration: number;
  children: React.ReactNode;
};

// Fades its children in once, as they mount.
const FadeInOnMount: React.FunctionComponent<FadeInOnMountProps> = ({
  duration,
  children,
}) => {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, {
      duration,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
  }, [opacity, duration]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
};

const styles = StyleSheet.create({ fill: { flex: 1 } });

export default FadeInOnMount;
