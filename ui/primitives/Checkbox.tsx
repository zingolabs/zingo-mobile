/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import {
  iconSizeSm,
  radiusXs,
  space8,
  touchTarget,
  useTheme,
} from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import Text from './Text';

/** Length of the tick path below, in viewBox units. */
const TICK_LENGTH = 21.3;
const EDGE = 1.5;

const boxPop = () =>
  new Keyframe({
    0: { transform: [{ scale: 0.8 }] },
    100: { transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(duration.base)
    .reduceMotion(ReduceMotion.System);

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The tick, drawn in as the box fills. */
const Tick: React.FunctionComponent<{ color: string }> = ({ color }) => {
  const drawn = useSharedValue(0);
  useEffect(() => {
    drawn.value = withTiming(1, {
      duration: duration.base,
      easing: ease.out,
      reduceMotion: ReduceMotion.System,
    });
  }, [drawn]);
  const stroke = useAnimatedProps(() => ({
    strokeDashoffset: TICK_LENGTH * (1 - drawn.value),
  }));
  return (
    <Svg
      width={iconSizeSm - 2 * EDGE}
      height={iconSizeSm - 2 * EDGE}
      viewBox="0 0 24 24"
      fill="none"
    >
      <AnimatedPath
        d="M5 12.5 10 17.5 19.5 7"
        stroke={color}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={TICK_LENGTH}
        animatedProps={stroke}
      />
    </Svg>
  );
};

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Beside the box, and part of its tap area. */
  label: string;
  disabled?: boolean;
  testID?: string;
};

/**
 * A 16 box at radiusXs: a borderMuted edge when off, bgAccent with the tick
 * in fgOnAccent when on. The box and its label are one target, at least 44
 * high. The box pops when tapped, not when it mounts checked.
 */
const Checkbox: React.FunctionComponent<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  testID,
}) => {
  const { colors } = useTheme();
  const [tapped, setTapped] = useState(false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        setTapped(true);
        onChange(!checked);
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space8,
        minHeight: touchTarget,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View style={{ width: iconSizeSm, height: iconSizeSm }}>
        <Animated.View
          key={checked ? 'on' : 'off'}
          entering={checked && tapped ? boxPop() : undefined}
          style={{
            width: iconSizeSm,
            height: iconSizeSm,
            borderRadius: radiusXs,
            borderWidth: EDGE,
            borderColor: checked ? colors.bgAccent : colors.borderMuted,
            backgroundColor: checked ? colors.bgAccent : undefined,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked && <Tick color={colors.fgOnAccent} />}
        </Animated.View>
      </View>
      <Text variant="bodySmall" tone="muted" style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
};

export default Checkbox;
