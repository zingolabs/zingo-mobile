/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { PixelRatio, Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  Text as SvgText,
} from 'react-native-svg';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { EyeOffIcon } from '@ui/primitives/Icons/EyeOffIcon';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import { SIDE } from './StepParts';

const WORD_BG = '#041936';
const NUMBER_INK = '#61748F';
export const VEIL_MS = 220;
// The words blur by this much while hidden; the numbers stay sharp.
const BLUR_PT = 6;
const WORD_H = 32;
// Room left of the word for the blur to fade out round, not cut straight.
const BLUR_PAD = BLUR_PT * 2;
// Native filters run on the bitmap in device pixels; web runs in points.
const BLUR_DEVIATION =
  Platform.OS === 'web' ? BLUR_PT : BLUR_PT * PixelRatio.get();
const COPIED_MS = 1600;
const COLUMNS = 3;

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

// A word drawn through a gaussian blur, for the hidden state. Drawn once
// and kept mounted: the filter is the costly part, the veil only fades it.
const BlurredWord = React.memo<{ word: string; color: string }>(
  ({ word, color }) => (
    <Svg width="100%" height={WORD_H}>
      <Defs>
        <Filter
          id="wordblur"
          filterUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <FeGaussianBlur stdDeviation={BLUR_DEVIATION} />
        </Filter>
      </Defs>
      <SvgText
        x={BLUR_PAD}
        y={20.5}
        fill={color}
        fontSize={13}
        fontWeight="700"
        filter="url(#wordblur)"
      >
        {word}
      </SvgText>
    </Svg>
  ),
);

// The words in three columns, numbered; the words blur while veiled.
export const WordGrid: React.FunctionComponent<{
  words: string[];
  veiled: boolean;
  testID: string;
}> = ({ words, veiled, testID }) => {
  const { colors } = useTheme();
  const veil = useSharedValue(veiled ? 1 : 0);
  useEffect(() => {
    veil.value = withTiming(veiled ? 1 : 0, {
      duration: VEIL_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.Never,
    });
  }, [veiled, veil]);
  const wordInk = useAnimatedStyle(() => ({ opacity: 1 - veil.value }));
  const blurInk = useAnimatedStyle(() => ({ opacity: veil.value * 0.7 }));
  const rows = Math.ceil(words.length / COLUMNS);

  return (
    <View
      testID={testID}
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
          {words.slice(r * COLUMNS, r * COLUMNS + COLUMNS).map((w, c) => {
            const n = r * COLUMNS + c + 1;
            return (
              <View
                key={n}
                style={{
                  flex: 1,
                  height: WORD_H,
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
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      { position: 'absolute', left: -BLUR_PAD, right: 0 },
                      blurInk,
                    ]}
                  >
                    <BlurredWord word={w} color={colors.fgDefault} />
                  </Animated.View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// A slim row: a label with an info tooltip on the left, a value on the right.
export const InfoRow: React.FunctionComponent<{
  testID: string;
  label: string;
  tipTitle: string;
  tipBody: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  value: string;
  trailing?: React.ReactNode;
}> = ({
  testID,
  label,
  tipTitle,
  tipBody,
  open,
  onToggle,
  value,
  trailing,
}) => {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 36,
        marginHorizontal: SIDE,
        paddingLeft: 14,
        paddingRight: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        backgroundColor: colors.bgSurface,
        zIndex: open ? 3 : 1,
      }}
    >
      <InfoTooltip
        testID={`${testID}-info`}
        alignStart
        label={label}
        labelStyle={{ fontSize: 12, fontWeight: '500', color: colors.fgMuted }}
        title={tipTitle}
        text={tipBody}
        open={open}
        onToggle={onToggle}
      />
      <Text
        numberOfLines={1}
        style={{
          marginLeft: 'auto',
          color: colors.fgDefault,
          fontSize: 13,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      {trailing}
    </View>
  );
};

// Copy and Show / Hide side by side.
export const CopyShowButtons: React.FunctionComponent<{
  hidden: boolean;
  onToggleHide: () => void;
  onCopy: () => void;
  testID: string;
}> = ({ hidden, onToggleHide, onCopy, testID }) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  // The eye turns as feedback to a tap, not when the screen mounts.
  const [turned, setTurned] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = () => {
    onCopy();
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

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
    <View style={{ flexDirection: 'row', gap: 11, marginHorizontal: SIDE }}>
      <Pressable
        testID={`${testID}.copy`}
        accessibilityRole="button"
        onPress={copy}
        style={({ pressed }) => ({
          ...outline,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <View style={{ width: 15, height: 15 }}>
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
        </View>
        <Text style={outlineText}>
          {translate(copied ? 'seedbackup.copied' : 'copy') as string}
        </Text>
      </Pressable>
      <Pressable
        testID={`${testID}.hide`}
        accessibilityRole="button"
        onPress={() => {
          setTurned(true);
          onToggleHide();
        }}
        style={({ pressed }) => ({
          ...outline,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <View style={{ width: 15, height: 15 }}>
          <Animated.View
            key={hidden ? 'show' : 'hide'}
            entering={turned ? iconTurn() : undefined}
          >
            {hidden ? (
              <EyeIcon size={15} color={colors.fgDefault} />
            ) : (
              <EyeOffIcon size={15} color={colors.fgDefault} />
            )}
          </Animated.View>
        </View>
        <Text style={outlineText}>
          {translate(hidden ? 'seedbackup.show' : 'seedbackup.hide') as string}
        </Text>
      </Pressable>
    </View>
  );
};
