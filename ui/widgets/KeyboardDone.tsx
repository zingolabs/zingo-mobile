/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { InputAccessoryView, Keyboard, Platform, View } from 'react-native';
import Animated, {
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  buttonMinHeightSmall,
  iconSizeSm,
  radiusPill,
  slopFor,
  space8,
  space12,
  useTheme,
} from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';

const SIZE = buttonMinHeightSmall;

/** The key's spoken names, translated by the caller. */
export type KeyboardDoneLabels = { confirm: string; hide: string };

type DoneKeyProps = {
  labels: KeyboardDoneLabels;
  /** The field holds a good value: the key confirms it. */
  ready: boolean;
  testID?: string;
};

/** The round key that closes the keyboard, a grey chevron or a green check. */
export function DoneKey({
  labels,
  ready,
  testID = 'keyboard.done',
}: DoneKeyProps) {
  const { colors } = useTheme();
  const tone = useSharedValue(ready ? 1 : 0);
  const glyph = useSharedValue(1);

  useEffect(() => {
    tone.value = withTiming(ready ? 1 : 0, {
      duration: duration.base,
      reduceMotion: ReduceMotion.System,
    });
    glyph.value = 0.4;
    glyph.value = withTiming(1, {
      duration: duration.step,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
  }, [ready, tone, glyph]);

  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      tone.value,
      [0, 1],
      [colors.bgMutedSubtle, colors.bgAccent],
    ),
  }));
  const grow = useAnimatedStyle(() => ({
    transform: [{ scale: glyph.value }],
  }));

  const Glyph = ready ? CheckIcon : ChevronDown;
  return (
    <Pressable
      testID={testID}
      kind="icon"
      accessibilityRole="button"
      accessibilityLabel={ready ? labels.confirm : labels.hide}
      hitSlop={slopFor(SIZE)}
      onPress={() => Keyboard.dismiss()}
    >
      <Animated.View
        style={[
          {
            width: SIZE,
            height: SIZE,
            borderRadius: radiusPill,
            borderWidth: 0.5,
            borderColor: colors.borderSubtle,
            alignItems: 'center',
            justifyContent: 'center',
          },
          fill,
        ]}
      >
        <Animated.View style={grow}>
          <Glyph
            size={iconSizeSm}
            color={ready ? colors.fgOnAccent : colors.fgDefault}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

type KeyboardDoneProps = DoneKeyProps & {
  /** The `inputAccessoryViewID` the field passes. */
  nativeID: string;
};

/** The done key floating over iOS's number pads, which have no key to close them. */
export default function KeyboardDone({ nativeID, ...key }: KeyboardDoneProps) {
  if (Platform.OS !== 'ios') {
    return null;
  }
  return (
    <InputAccessoryView nativeID={nativeID} backgroundColor="transparent">
      <View
        pointerEvents="box-none"
        style={{
          alignItems: 'flex-end',
          paddingRight: space12,
          paddingBottom: space8,
        }}
      >
        <DoneKey {...key} />
      </View>
    </InputAccessoryView>
  );
}

const NUMBER_PADS = ['decimal-pad', 'number-pad', 'numeric', 'phone-pad'];

/** The keyboards without a key that closes them on iOS. */
export const isNumberPad = (keyboardType?: string) =>
  keyboardType !== undefined && NUMBER_PADS.includes(keyboardType);
