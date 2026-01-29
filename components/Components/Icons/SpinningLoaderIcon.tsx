import { LoaderPinwheel } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function SpinningLoaderIcon({
  size = 20,
  color = '#8E8E93',
  duration = 2500,
}: {
  size?: number;
  color?: string;
  duration?: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;

    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [duration, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 360}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <LoaderPinwheel width={size} height={size} color={color} />
    </Animated.View>
  );
}
