/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
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

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import TransactionCreatedIcon from '../../assets/img/transaction-created.svg';
import TransactionFailedIcon from '../../assets/img/transaction-failed.svg';

export const RING_GREEN = '#149D05';
export const RING_RED = '#822929';

// One dot grows from 0.55 to 1 and from 35% to full opacity and back over
// the first 80% of a 1.1 s loop; the next dot starts 160 ms later.
const LOOP_MS = 1100;
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
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: RISE_MS,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: HOLD_MS }),
        ),
        -1,
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
          borderRadius: size / 2,
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

const dotsExit = () => ZoomOut.duration(160).reduceMotion(ReduceMotion.System);
const ringEnter = () =>
  ZoomIn.duration(360)
    .easing(ease.spring)
    .withInitialValues({ transform: [{ scale: 0.6 }] })
    .reduceMotion(ReduceMotion.System);
const checkEnter = () =>
  FadeIn.duration(320).delay(duration.base).reduceMotion(ReduceMotion.System);

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
          marginBottom: 26,
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
              borderRadius: RING / 2,
              borderWidth: 2,
              borderColor: state === 'done' ? RING_GREEN : RING_RED,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View entering={checkEnter()}>
              {state === 'done' ? (
                <TransactionCreatedIcon width={26} height={26} />
              ) : (
                <TransactionFailedIcon width={26} height={26} />
              )}
            </Animated.View>
          </Animated.View>
        )}
      </View>
      <BoldText style={{ fontSize: 17, textAlign: 'center' }}>{title}</BoldText>
      {!!body && (
        <RegText
          style={{
            marginTop: 8,
            fontSize: 11.5,
            lineHeight: 18,
            textAlign: 'center',
            color: colors.fgMuted,
          }}
        >
          {body}
        </RegText>
      )}
    </>
  );
};

export default ProgressState;
