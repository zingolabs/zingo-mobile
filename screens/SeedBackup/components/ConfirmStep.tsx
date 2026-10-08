/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  ReduceMotion,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { SIDE, StepTitle } from './StepParts';

export const CONFIRM_COUNT = 3;
const NEXT_MS = 420;
const SLIDE_OUT_MS = 160;
const SLIDE_IN_MS = 260;
const SLIDE_PT = 24;
const DONE_MS = 620;
const FIELD_BG = '#041834';
const HINT_INK = '#5B70A0';
const SLOT_W = 20;
const SLOT_H = 31;
const SLOT_GAP = 6;
const SLOT_FADE_MS = 140;
const DASH_EMPTY = '#33486A';
const DASH_FILL = '#5B70A0';
const TRACK = '#13263F';
const ERROR_INK = '#F2878A';

/** Picks `n` distinct word positions (1-based, ascending) out of `count`. */
export const pickPositions = (
  count: number,
  n: number,
  rand: () => number = Math.random,
): number[] => {
  const picked = new Set<number>();
  while (picked.size < Math.min(n, count)) {
    picked.add(1 + Math.floor(rand() * count));
  }
  return [...picked].sort((a, b) => a - b);
};

type Status = 'idle' | 'ok' | 'err';

export type WordCheck = {
  position: number;
  // Letters in the asked word, one placeholder dash each.
  letters: number;
  index: number;
  value: string;
  status: Status;
  type: (text: string) => void;
  submit: () => void;
  nudge: () => void;
  shake: SharedValue<number>;
  slideX: SharedValue<number>;
  slideOpacity: SharedValue<number>;
};

/** Holds one attempt at typing back three random words of the phrase. */
export const useWordCheck = (
  words: string[],
  onPassed: () => void,
): WordCheck => {
  const [positions] = useState(() =>
    pickPositions(words.length, CONFIRM_COUNT),
  );
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const checking = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shake = useSharedValue(0);
  const slideX = useSharedValue(0);
  const slideOpacity = useSharedValue(1);

  useEffect(() => () => clearTimeout(timer.current), []);

  const position = positions[Math.min(index, positions.length - 1)];
  const letters = words[position - 1]?.length ?? 0;

  const type = (text: string) => {
    if (checking.current) {
      return;
    }
    setValue(
      text
        .replace(/[^a-zA-Z]/g, '')
        .toLowerCase()
        .slice(0, letters),
    );
    setStatus('idle');
  };

  const submit = () => {
    if (checking.current || !value) {
      return;
    }
    if (value !== words[position - 1]) {
      setStatus('err');
      shake.value = withSequence(
        ...[-6, 6, -6, 6, -3, 0].map(x =>
          withTiming(x, {
            duration: 320 / 6,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.System,
          }),
        ),
      );
      return;
    }
    checking.current = true;
    setStatus('ok');
    const last = index === positions.length - 1;
    if (last) {
      timer.current = setTimeout(onPassed, DONE_MS);
      return;
    }
    timer.current = setTimeout(() => {
      const out = {
        duration: SLIDE_OUT_MS,
        easing: ease.in,
        reduceMotion: ReduceMotion.System,
      };
      slideX.value = withTiming(-SLIDE_PT, out);
      slideOpacity.value = withTiming(0, out);
      timer.current = setTimeout(() => {
        setIndex(i => i + 1);
        setValue('');
        setStatus('idle');
        checking.current = false;
        const back = {
          duration: SLIDE_IN_MS,
          easing: ease.out,
          reduceMotion: ReduceMotion.System,
        };
        slideX.value = SLIDE_PT;
        slideOpacity.value = 0;
        slideX.value = withTiming(0, back);
        slideOpacity.value = withTiming(1, back);
      }, SLIDE_OUT_MS);
    }, NEXT_MS);
  };

  const nudge = () => {
    const step = (x: number) =>
      withTiming(x, {
        duration: 80,
        easing: ease.standard,
        reduceMotion: ReduceMotion.System,
      });
    shake.value = withSequence(step(-4), step(4), step(0));
  };

  return {
    position,
    letters,
    index,
    value,
    status,
    type,
    submit,
    nudge,
    shake,
    slideX,
    slideOpacity,
  };
};

const markPop = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.3 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(280)
    .reduceMotion(ReduceMotion.System);

const Segment: React.FunctionComponent<{ done: boolean; color: string }> = ({
  done,
  color,
}) => {
  const fill = useAnimatedStyle(() => ({
    width: done
      ? withDelay(
          60,
          withTiming('100%', {
            duration: 320,
            easing: ease.emphasized,
            reduceMotion: ReduceMotion.System,
          }),
        )
      : '0%',
  }));
  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: TRACK,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[{ height: '100%', backgroundColor: color }, fill]}
      />
    </View>
  );
};

type SlotTone = 'empty' | 'fill' | 'cur' | 'ok' | 'err';

// One letter of the asked word, on its dash.
const Slot: React.FunctionComponent<{ letter: string; tone: SlotTone }> = ({
  letter,
  tone,
}) => {
  const { colors } = useTheme();
  const target =
    tone === 'ok' || tone === 'cur'
      ? colors.fgAccent
      : tone === 'err'
        ? colors.fgDangerEmphasis
        : tone === 'fill'
          ? DASH_FILL
          : DASH_EMPTY;
  const dash = useAnimatedStyle(() => ({
    backgroundColor: withTiming(target, {
      duration: SLOT_FADE_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.Never,
    }),
  }));
  return (
    <View style={{ width: SLOT_W, height: SLOT_H }}>
      <Text
        style={{
          color: colors.fgDefault,
          fontSize: 20,
          lineHeight: 26,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {letter}
      </Text>
      <Animated.View
        testID="seedbackup.dash"
        style={[
          {
            position: 'absolute',
            left: 1,
            right: 1,
            bottom: 0,
            height: 2.5,
            borderRadius: 2,
          },
          dash,
        ]}
      />
    </View>
  );
};

// Asks for three random words of the phrase, one at a time.
const ConfirmStep: React.FunctionComponent<{ check: WordCheck }> = ({
  check,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const slideStyle = useAnimatedStyle(() => ({
    opacity: check.slideOpacity.value,
    transform: [{ translateX: check.slideX.value }],
  }));
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: check.shake.value }],
  }));

  const done = check.index + (check.status === 'ok' ? 1 : 0);
  const border =
    check.status === 'ok'
      ? colors.fgAccent
      : check.status === 'err'
        ? colors.fgDangerEmphasis
        : focused
          ? colors.borderFocus
          : colors.bottomSheetBorder;

  return (
    <View>
      <StepTitle
        title={translate('seedbackup.confirm-title') as string}
        sub={translate('seedbackup.confirm-sub') as string}
      />
      <View
        style={{
          flexDirection: 'row',
          gap: 6,
          marginHorizontal: SIDE,
          marginBottom: 14,
        }}
      >
        {Array.from({ length: CONFIRM_COUNT }, (_, i) => (
          <Segment key={i} done={i < done} color={colors.fgAccent} />
        ))}
      </View>
      <View
        style={{
          marginHorizontal: SIDE,
          paddingTop: 18,
          paddingBottom: 18,
          paddingHorizontal: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          backgroundColor: colors.bgSurface,
          overflow: 'hidden',
        }}
      >
        <Animated.View style={slideStyle}>
          <Text
            style={{
              textAlign: 'center',
              color: colors.fgMuted,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 0.9,
            }}
          >
            {(translate('seedbackup.word-n') as string).replace(
              '{n}',
              String(check.position),
            )}
          </Text>
          <Text
            style={{
              textAlign: 'center',
              color: HINT_INK,
              fontSize: 12,
              marginTop: 4,
              marginBottom: 12,
            }}
          >
            {translate('seedbackup.word-hint') as string}
          </Text>
          <Animated.View
            style={[
              {
                height: 60,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: FIELD_BG,
                justifyContent: 'center',
              },
              shakeStyle,
            ]}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: SLOT_GAP,
              }}
            >
              {Array.from({ length: check.letters }, (_, i) => (
                <Slot
                  key={i}
                  letter={check.value[i] ?? ''}
                  tone={
                    check.status === 'ok'
                      ? 'ok'
                      : check.status === 'err'
                        ? 'err'
                        : i < check.value.length
                          ? 'fill'
                          : focused && i === check.value.length
                            ? 'cur'
                            : 'empty'
                  }
                />
              ))}
            </View>
            <TextInput
              testID="seedbackup.word"
              accessibilityLabel={(
                translate('seedbackup.word-n') as string
              ).replace('{n}', String(check.position))}
              autoFocus
              value={check.value}
              onChangeText={check.type}
              onSubmitEditing={check.submit}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={check.letters}
              caretHidden
              contextMenuHidden
              submitBehavior="submit"
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              keyboardType={
                Platform.OS === 'android' ? 'visible-password' : 'default'
              }
              selectionColor="transparent"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                color: 'transparent',
                fontSize: 20,
                textAlign: 'center',
              }}
            />
            {check.status === 'ok' && (
              <Animated.View
                entering={markPop()}
                style={{ position: 'absolute', right: 16 }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: colors.bgAccent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckIcon
                    size={13}
                    color={colors.bgCanvas}
                    strokeWidth={3}
                  />
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>
      </View>
      <Text
        accessibilityLiveRegion="polite"
        style={{
          marginHorizontal: SIDE,
          marginTop: 10,
          minHeight: 16,
          textAlign: 'center',
          color: ERROR_INK,
          fontSize: 12,
        }}
      >
        {check.status === 'err'
          ? (translate('seedbackup.word-wrong') as string).replace(
              '{n}',
              String(check.position),
            )
          : ''}
      </Text>
    </View>
  );
};

export default ConfirmStep;
