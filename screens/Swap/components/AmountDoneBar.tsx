/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
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
import { ContextAppLoaded } from '@app/context';
import Pressable from '@ui/primitives/Pressable';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';

/** The id an amount field passes as `inputAccessoryViewID`. */
export const AMOUNT_DONE_BAR = 'swap.amount.done-bar';

const SIZE = buttonMinHeightSmall;

type AmountDoneBarProps = {
  /** An amount above zero is typed: the button confirms it. */
  ready: boolean;
};

/** A round button over iOS's decimal pad, which has no key to close it. */
export default function AmountDoneBar({ ready }: AmountDoneBarProps) {
  const { translate } = useContext(ContextAppLoaded);
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

  if (Platform.OS !== 'ios') {
    return null;
  }
  const Glyph = ready ? CheckIcon : ChevronDown;
  return (
    <InputAccessoryView
      nativeID={AMOUNT_DONE_BAR}
      backgroundColor="transparent"
    >
      <View
        pointerEvents="box-none"
        style={{
          alignItems: 'flex-end',
          paddingRight: space12,
          paddingBottom: space8,
        }}
      >
        <Pressable
          testID="swap.amount.done"
          kind="icon"
          accessibilityRole="button"
          accessibilityLabel={
            translate(
              ready ? 'swap.amount-confirm' : 'swap.hide-keyboard',
            ) as string
          }
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
      </View>
    </InputAccessoryView>
  );
}
