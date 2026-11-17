/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { radiusPill } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { PencilIcon } from '@ui/primitives/Icons/PencilIcon';
import { TrashCan, TrashLid } from '@ui/primitives/Icons/TrashIcon';

const MARK = 20;

/** Runs a mark once from rest: the pencil on the standard curve, the lid on the spring. */
export function playMark(
  progress: SharedValue<number>,
  kind: 'edit' | 'delete',
): void {
  progress.value = withTiming(1, {
    duration: duration.action,
    easing: kind === 'delete' ? ease.spring : ease.standard,
    reduceMotion: ReduceMotion.System,
  });
}

/** The edit action's pencil: it slides, tilts and draws its line under it. */
export function EditMark({
  progress,
  color,
}: {
  progress: SharedValue<number>;
  color: string;
}) {
  const penStyle = useAnimatedStyle(() => {
    const tilt =
      progress.value < 0.15
        ? progress.value / 0.15
        : (1 - progress.value) / 0.85;
    return {
      transform: [
        { translateX: 10 * progress.value },
        { rotate: `${-6 * tilt}deg` },
      ],
    };
  });
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));
  return (
    <View style={{ width: MARK, height: MARK }}>
      <Animated.View style={penStyle}>
        <PencilIcon size={MARK} color={color} />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: -1,
            bottom: -1,
            width: 10,
            height: 2,
            borderRadius: radiusPill,
            backgroundColor: color,
            transformOrigin: 'left',
          },
          lineStyle,
        ]}
      />
    </View>
  );
}

/** The delete action's trash: its hinged lid lifts to -24°. */
export function DeleteMark({
  progress,
  color,
}: {
  progress: SharedValue<number>;
  color: string;
}) {
  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -1 * progress.value },
      { translateY: -2.5 * progress.value },
      { rotate: `${-24 * progress.value}deg` },
    ],
  }));
  return (
    <View style={{ width: MARK, height: MARK }}>
      <TrashCan size={MARK} color={color} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: '13% 25%' },
          lidStyle,
        ]}
      >
        <TrashLid size={MARK} color={color} />
      </Animated.View>
    </View>
  );
}
