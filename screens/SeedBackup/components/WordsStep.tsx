/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { EyeOffIcon } from '@ui/primitives/Icons/EyeOffIcon';
import { SIDE, StepTitle } from './StepParts';

const WORD_BG = '#041936';
const NUMBER_INK = '#61748F';
const BOX_BORDER = '#1E4A80';
const VEIL_MS = 220;
const COPIED_MS = 1600;

const iconPop = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.4 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(240)
    .reduceMotion(ReduceMotion.System);
const iconTurn = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ rotate: '-20deg' }, { scale: 0.7 }] },
    100: {
      opacity: 1,
      transform: [{ rotate: '0deg' }, { scale: 1 }],
      easing: ease.out,
    },
  })
    .duration(VEIL_MS)
    .reduceMotion(ReduceMotion.System);
const boxPop = () =>
  new Keyframe({
    0: { transform: [{ scale: 0.8 }] },
    100: { transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(VEIL_MS)
    .reduceMotion(ReduceMotion.System);

type WordsStepProps = {
  words: string[];
  hidden: boolean;
  // Words veil while hidden, and while the screenshot warning is up.
  veiled: boolean;
  onToggleHide: () => void;
  onCopy: () => void;
  checked: boolean;
  onCheck: () => void;
  // Bumps on a press of the disabled "I saved it", to point at the box.
  nudge: number;
};

// The 24 words in order, with Copy, Hide and the paper checkbox.
const WordsStep: React.FunctionComponent<WordsStepProps> = ({
  words,
  hidden,
  veiled,
  onToggleHide,
  onCopy,
  checked,
  onCheck,
  nudge,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const veil = useSharedValue(veiled ? 1 : 0);
  useEffect(() => {
    veil.value = withTiming(veiled ? 1 : 0, {
      duration: VEIL_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.Never,
    });
  }, [veiled, veil]);
  const wordInk = useAnimatedStyle(() => ({ opacity: 1 - veil.value }));
  const wordMask = useAnimatedStyle(() => ({ opacity: veil.value * 0.7 }));

  const flash = useSharedValue(0);
  useEffect(() => {
    if (nudge > 0) {
      flash.value = 1;
      flash.value = withTiming(0, {
        duration: 420,
        easing: ease.out,
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [nudge, flash]);
  const boxNudge = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + flash.value * 0.25 }],
    borderColor: flash.value > 0.05 ? colors.fgAccent : BOX_BORDER,
  }));

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = () => {
    onCopy();
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  const columns = 3;
  const rows = Math.ceil(words.length / columns);

  const outline = {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.bottomSheetBorder,
    backgroundColor: colors.bgSurface,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 9,
  };
  const outlineText = {
    color: colors.fgDefault,
    fontSize: 13,
    fontWeight: '700' as const,
  };

  return (
    <View>
      <StepTitle
        title={translate('seedbackup.words-title') as string}
        sub={translate('seedbackup.words-sub') as string}
      />
      <View
        testID="seedbackup.words"
        style={{
          marginHorizontal: SIDE,
          padding: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          backgroundColor: colors.bgSurface,
          gap: 7,
        }}
      >
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 9 }}>
            {words.slice(r * columns, r * columns + columns).map((w, c) => {
              const n = r * columns + c + 1;
              return (
                <View
                  key={n}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: WORD_BG,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      width: 24,
                      marginRight: 6,
                      textAlign: 'right',
                      color: NUMBER_INK,
                      fontSize: 11,
                      fontWeight: '500',
                    }}
                  >
                    {n}
                  </Text>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Animated.Text
                      numberOfLines={1}
                      style={[
                        {
                          color: colors.fgDefault,
                          fontSize: 13,
                          fontWeight: '700',
                        },
                        wordInk,
                      ]}
                    >
                      {w}
                    </Animated.Text>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        {
                          position: 'absolute',
                          left: 0,
                          width: Math.min(w.length * 7.5, 70),
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: colors.fgMuted,
                        },
                        wordMask,
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          gap: 11,
          marginHorizontal: SIDE,
          marginTop: 16,
        }}
      >
        <Pressable
          testID="seedbackup.copy"
          accessibilityRole="button"
          onPress={copy}
          style={({ pressed }) => ({
            ...outline,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Animated.View
            key={copied ? 'copied' : 'copy'}
            entering={copied ? iconPop() : undefined}
          >
            {copied ? (
              <CheckIcon size={15} color={colors.fgAccent} strokeWidth={2.6} />
            ) : (
              <CopyIcon size={15} color={colors.fgDefault} />
            )}
          </Animated.View>
          <Text style={outlineText}>
            {translate(copied ? 'seedbackup.copied' : 'copy') as string}
          </Text>
        </Pressable>
        <Pressable
          testID="seedbackup.hide"
          accessibilityRole="button"
          onPress={onToggleHide}
          style={({ pressed }) => ({
            ...outline,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Animated.View key={hidden ? 'show' : 'hide'} entering={iconTurn()}>
            {hidden ? (
              <EyeIcon size={15} color={colors.fgDefault} />
            ) : (
              <EyeOffIcon size={15} color={colors.fgDefault} />
            )}
          </Animated.View>
          <Text style={outlineText}>
            {
              translate(
                hidden ? 'seedbackup.show' : 'seedbackup.hide',
              ) as string
            }
          </Text>
        </Pressable>
      </View>
      <Pressable
        testID="seedbackup.check"
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onCheck}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginHorizontal: SIDE,
          marginTop: 22,
          paddingVertical: 4,
        }}
      >
        <Animated.View
          key={checked ? 'on' : 'off'}
          entering={checked ? boxPop() : undefined}
        >
          <Animated.View
            style={[
              {
                width: 17,
                height: 17,
                borderRadius: 4,
                borderWidth: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: checked ? colors.bgAccent : colors.bgSurface,
              },
              checked ? { borderColor: colors.bgAccent } : boxNudge,
            ]}
          >
            {checked && (
              <CheckIcon size={12} color={colors.bgCanvas} strokeWidth={3.6} />
            )}
          </Animated.View>
        </Animated.View>
        <Text
          style={{
            flex: 1,
            color: colors.fgMuted,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {translate('seedbackup.paper') as string}
        </Text>
      </Pressable>
    </View>
  );
};

export default WordsStep;
