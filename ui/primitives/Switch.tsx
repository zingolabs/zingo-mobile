import React, { useEffect, useId } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { radiusPill, touchTarget, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';

/** Exception D (DESIGN.md): the switch keeps the prototype's own size. */
const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 19;
const THUMB = 15;
const THUMB_INSET = (TRACK_HEIGHT - THUMB) / 2;
const TRAVEL = TRACK_WIDTH - THUMB - 2 * THUMB_INSET;
const slop = {
  top: Math.ceil((touchTarget - TRACK_HEIGHT) / 2),
  bottom: Math.ceil((touchTarget - TRACK_HEIGHT) / 2),
  left: Math.ceil((touchTarget - TRACK_WIDTH) / 2),
  right: Math.ceil((touchTarget - TRACK_WIDTH) / 2),
};

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** `nym` for a toggle that acts through the mixnet: Nym's own green. */
  variant?: 'default' | 'nym';
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * The one toggle of the app, for an on/off setting. Off, a grey track with
 * the thumb on the left; on, a green gradient with the thumb on the right.
 * The thumb slides and the on track fades in over `duration.base`.
 */
const Switch: React.FunctionComponent<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  variant = 'default',
  accessibilityLabel,
  testID,
}) => {
  const { colors } = useTheme();
  const gradient = useId();
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(value ? 1 : 0, {
      duration: duration.base,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
  }, [value, on]);
  const onTrackStyle = useAnimatedStyle(() => ({ opacity: on.value }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * TRAVEL }],
  }));
  const [top, bottom] =
    variant === 'nym'
      ? [colors.bgSwitchNym, colors.bgSwitchNymDeep]
      : [colors.bgAccent, colors.bgSwitchOnDeep];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={slop}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={styles.track}
    >
      <Svg width={TRACK_WIDTH} height={TRACK_HEIGHT}>
        <Rect
          width={TRACK_WIDTH}
          height={TRACK_HEIGHT}
          rx={TRACK_HEIGHT / 2}
          fill={colors.bgSwitchOff}
        />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, onTrackStyle]}>
        <Svg width={TRACK_WIDTH} height={TRACK_HEIGHT}>
          <Defs>
            <LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={top} />
              <Stop offset="1" stopColor={bottom} />
            </LinearGradient>
          </Defs>
          <Rect
            width={TRACK_WIDTH}
            height={TRACK_HEIGHT}
            rx={TRACK_HEIGHT / 2}
            fill={`url(#${gradient})`}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: colors.fgSwitchThumb },
          thumbStyle,
        ]}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: { width: TRACK_WIDTH, height: TRACK_HEIGHT },
  thumb: {
    position: 'absolute',
    top: THUMB_INSET,
    left: THUMB_INSET,
    width: THUMB,
    height: THUMB,
    borderRadius: radiusPill,
  },
});

export default Switch;
