/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import TransactionCreatedIcon from '../../assets/img/transaction-created.svg';
import TransactionFailedIcon from '../../assets/img/transaction-failed.svg';

export const RING_GREEN = '#149D05';
export const RING_RED = '#822929';

// "Typing" dot animation timing (Signal-style indicator). Each dot fades in
// and out over (DOT_PULSE_MS * 2) ms; consecutive dots are offset by
// DOT_OFFSET_MS so the wave travels left-to-right. After all three finish,
// there's a DOT_PAUSE_MS gap before the next round starts.
const DOT_PULSE_MS = 500;
const DOT_OFFSET_MS = 400;
const DOT_PAUSE_MS = 1100;
const DOT_COUNT = 3;
const DOT_OPACITY_MIN = 0.25;
const DOT_CYCLE_MS =
  (DOT_COUNT - 1) * DOT_OFFSET_MS + DOT_PULSE_MS * 2 + DOT_PAUSE_MS;

type TypingDotProps = {
  delay: number;
  color: string;
};

const TypingDot: React.FC<TypingDotProps> = ({ delay, color }) => {
  const opacity = useSharedValue(DOT_OPACITY_MIN);
  useEffect(() => {
    const tailWait = DOT_CYCLE_MS - delay - DOT_PULSE_MS * 2;
    opacity.value = withRepeat(
      withSequence(
        withTiming(DOT_OPACITY_MIN, { duration: delay }),
        withTiming(1, {
          duration: DOT_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(DOT_OPACITY_MIN, {
          duration: DOT_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(DOT_OPACITY_MIN, { duration: tailWait }),
      ),
      -1,
    );
    return () => {
      opacity.value = DOT_OPACITY_MIN;
    };
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

export const TypingDots: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View
      testID="progress.dots"
      style={{ flexDirection: 'row', marginTop: 24, gap: 12 }}
    >
      <TypingDot delay={0} color={colors.bgMuted} />
      <TypingDot delay={DOT_OFFSET_MS} color={colors.bgMuted} />
      <TypingDot delay={DOT_OFFSET_MS * 2} color={colors.bgMuted} />
    </View>
  );
};

export type ProgressStateKind = 'working' | 'done' | 'failed';

type ProgressStateProps = {
  state: ProgressStateKind;
  title: string;
  body: string;
};

// The 100x100 circle keeps its size in every state so the title stays at
// the same height when the ring and icon appear.
const ProgressState: React.FC<ProgressStateProps> = ({
  state,
  title,
  body,
}) => {
  const { colors } = useTheme();
  const terminal = state !== 'working';

  return (
    <>
      <View
        testID={`progress.${state}`}
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          borderWidth: terminal ? 3 : 0,
          borderColor:
            state === 'done'
              ? RING_GREEN
              : state === 'failed'
                ? RING_RED
                : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {state === 'done' && <TransactionCreatedIcon width={30} height={30} />}
        {state === 'failed' && <TransactionFailedIcon width={30} height={30} />}
      </View>
      <BoldText
        style={{
          fontSize: 20,
          marginTop: 48,
          textAlign: 'center',
        }}
      >
        {title}
      </BoldText>
      <RegText
        style={{
          marginTop: 12,
          textAlign: 'center',
          color: colors.fgMuted,
        }}
      >
        {body}
      </RegText>
      {!terminal && <TypingDots />}
    </>
  );
};

export default ProgressState;
