/* geometry-gap: not yet on the system */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { iconSize, radiusPill, space8, space24, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import Text from '@ui/primitives/Text';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';

// One dot grows from 0.55 to 1 and from 35% to full opacity and back over
// the first 80% of a 1.1 s loop; the next dot starts 160 ms later.
const LOOP_MS = duration.hero;
const RISE_MS = LOOP_MS * 0.4;
const HOLD_MS = LOOP_MS * 0.2;
const DOT_OFFSET_MS = 160;
const DOT_MIN_SCALE = 0.55;
const DOT_MIN_OPACITY = 0.35;
const RING = 56;

type DotProps = {
  size: number;
  gap: number;
  delay: number;
  color: string;
};

const Dot: React.FC<DotProps> = ({ size, gap, delay, color }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: RISE_MS,
            easing: ease.standard,
          }),
          withTiming(0, {
            duration: RISE_MS,
            easing: ease.standard,
          }),
          withTiming(0, { duration: HOLD_MS }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
    );
    return () => {
      t.value = 0;
    };
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: DOT_MIN_OPACITY + (1 - DOT_MIN_OPACITY) * t.value,
    transform: [{ scale: DOT_MIN_SCALE + (1 - DOT_MIN_SCALE) * t.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radiusPill,
          marginHorizontal: gap / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

type LoadingDotsProps = {
  size?: number;
  gap?: number;
  color?: string;
  testID?: string;
};

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 11,
  gap = 11,
  color,
  testID,
}) => {
  const { colors } = useTheme();
  const tint = color ?? colors.fgMuted;
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Dot size={size} gap={gap} delay={0} color={tint} />
      <Dot size={size} gap={gap} delay={DOT_OFFSET_MS} color={tint} />
      <Dot size={size} gap={gap} delay={DOT_OFFSET_MS * 2} color={tint} />
    </View>
  );
};

export type ProgressStateKind = 'working' | 'done' | 'failed';

type ProgressStateProps = {
  state: ProgressStateKind;
  title: string;
  body?: string;
};

const dotsExit = () =>
  ZoomOut.duration(duration.fast).reduceMotion(ReduceMotion.System);
const ringEnter = () =>
  ZoomIn.duration(duration.tabBar)
    .easing(ease.spring)
    .withInitialValues({ transform: [{ scale: 0.6 }] })
    .reduceMotion(ReduceMotion.System);
const checkEnter = () =>
  FadeIn.duration(duration.emphasized)
    .delay(duration.base)
    .reduceMotion(ReduceMotion.System);

// The dots and the ring share one 56 pt box so the title never moves.
const ProgressState: React.FC<ProgressStateProps> = ({
  state,
  title,
  body,
}) => {
  const { colors } = useTheme();

  return (
    <>
      <View
        style={{
          height: RING,
          marginBottom: space24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {state === 'working' ? (
          <Animated.View exiting={dotsExit()}>
            <LoadingDots testID="progress.dots" />
          </Animated.View>
        ) : (
          <Animated.View
            testID={`progress.${state}`}
            entering={ringEnter()}
            style={{
              width: RING,
              height: RING,
              borderRadius: radiusPill,
              borderWidth: 2,
              borderColor:
                state === 'done' ? colors.borderAccent : colors.borderDanger,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View entering={checkEnter()}>
              {state === 'done' ? (
                <CheckIcon size={iconSize} color={colors.fgAccent} />
              ) : (
                <XIcon size={iconSize} color={colors.fgDanger} />
              )}
            </Animated.View>
          </Animated.View>
        )}
      </View>
      <Text variant="subtitle" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {!!body && (
        <Text
          variant="bodySmall"
          tone="muted"
          style={{ marginTop: space8, textAlign: 'center' }}
        >
          {body}
        </Text>
      )}
    </>
  );
};

export default ProgressState;
