/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  Pressable,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  ReduceMotion,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { TranslateType } from '@app/AppState';
import {
  SEED_WORD_COUNT,
  isSeedWord,
  isViewingKey,
  resolveWord,
  suggestWords,
  tokenize,
} from '@app/utils/seedPhrase';

type SeedPhraseInputProps = {
  value: string;
  onChangeValue: (value: string) => void;
  translate: (key: string) => TranslateType;
  testID?: string;
  accessibilityLabel?: string;
};

const chipEnter = () =>
  ZoomIn.duration(duration.medium)
    .easing(ease.spring)
    .reduceMotion(ReduceMotion.System);
const chipExit = () =>
  ZoomOut.duration(160).easing(ease.in).reduceMotion(ReduceMotion.System);
const chipLayout = () =>
  LinearTransition.duration(240)
    .easing(ease.out)
    .reduceMotion(ReduceMotion.System);
const suggestionsEnter = () =>
  FadeIn.duration(duration.fast)
    .easing(ease.out)
    .reduceMotion(ReduceMotion.System);

const SHAKE_PX = 6;
const SHAKE_MS = 320;
const CHIP_HEIGHT = 25;
const BAD_BG = 'rgba(229,72,77,0.14)';
const BAD_BORDER = 'rgba(229,72,77,0.45)';
const BAD_TEXT = '#FF9DA0';
const OK_BG = 'rgba(20,157,5,0.15)';
const OK_BORDER = 'rgba(20,157,5,0.55)';
const OK_TEXT = '#9FE092';

const joinWords = (words: string[]) => words.join(' ');

const SeedPhraseInput: React.FunctionComponent<SeedPhraseInputProps> = ({
  value,
  onChangeValue,
  translate,
  testID,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const [invalidDraft, setInvalidDraft] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const ufvk = isViewingKey(value) ? value.trim() : '';
  const words = useMemo(() => (ufvk ? [] : tokenize(value)), [ufvk, value]);
  const complete =
    !!ufvk ||
    (words.length === SEED_WORD_COUNT && words.every(w => isSeedWord(w)));
  const suggestions = useMemo(() => suggestWords(draft), [draft]);
  const ghost =
    suggestions.length > 0 && suggestions[0] !== draft
      ? suggestions[0].slice(draft.length)
      : '';

  const shake = useSharedValue(0);
  const counterScale = useSharedValue(1);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));
  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  const pulseCounter = () => {
    counterScale.value = withSequence(
      withTiming(1.15, { duration: 120, easing: ease.out }),
      withTiming(1, { duration: 140, easing: ease.settle }),
    );
  };

  const rejectDraft = () => {
    setInvalidDraft(true);
    const step = SHAKE_MS / 6;
    shake.value = withSequence(
      withTiming(-SHAKE_PX, { duration: step / 2 }),
      withTiming(SHAKE_PX, { duration: step }),
      withTiming(-SHAKE_PX, { duration: step }),
      withTiming(SHAKE_PX, { duration: step }),
      withTiming(-SHAKE_PX, { duration: step }),
      withTiming(0, { duration: step / 2 }),
    );
  };

  const commit = (next: string[]) => {
    onChangeValue(joinWords(next));
    pulseCounter();
  };

  const acceptWord = (word: string) => {
    setDraft('');
    setInvalidDraft(false);
    commit([...words, word]);
  };

  const acceptDraftFrom = (text: string) => {
    const word = resolveWord(text);
    if (word) {
      acceptWord(word);
    } else {
      setDraft(text);
      rejectDraft();
    }
  };

  const acceptDraft = () => {
    if (draft) {
      acceptDraftFrom(draft);
    }
  };

  const removeWordAt = (index: number) => {
    commit(words.filter((_, i) => i !== index));
  };

  const onChangeText = (text: string) => {
    setInvalidDraft(false);
    if (isViewingKey(text)) {
      setDraft('');
      onChangeValue(text.trim());
      return;
    }
    if (!/[\s,]/.test(text)) {
      setDraft(text);
      return;
    }
    const closed = /[\s,]$/.test(text);
    const parts = tokenize(text);
    if (parts.length === 0) {
      setDraft('');
      return;
    }
    if (parts.length === 1) {
      if (closed) {
        acceptDraftFrom(parts[0]);
      } else {
        setDraft(parts[0]);
      }
      return;
    }
    setDraft('');
    commit([...words, ...parts]);
  };

  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && draft === '' && words.length) {
      removeWordAt(words.length - 1);
    }
  };

  useEffect(() => {
    if (ufvk) {
      setDraft('');
    }
  }, [ufvk]);

  const borderColor = invalidDraft
    ? colors.fgDangerEmphasis
    : complete
      ? colors.borderAccent
      : focused
        ? colors.borderFocus
        : colors.bottomSheetBorder;
  const counter = ufvk
    ? (translate('import.viewing-key') as string)
    : `${words.length} / ${SEED_WORD_COUNT}`;

  return (
    <View>
      <Animated.View
        style={[
          {
            borderWidth: 1,
            borderRadius: 12,
            borderColor,
            backgroundColor: colors.bgSurface,
            paddingTop: 14,
            paddingHorizontal: 12,
            paddingBottom: 32,
            minHeight: 135,
          },
          shakeStyle,
        ]}
      >
        <Pressable
          accessible={false}
          onPress={() => inputRef.current?.focus()}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: 11,
            rowGap: 15,
          }}
        >
          {ufvk ? (
            <Pressable
              onPress={() => onChangeValue('')}
              accessibilityRole="button"
              accessibilityLabel={translate('import.viewing-key') as string}
              style={{
                flex: 1,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: colors.bgCanvas,
              }}
            >
              <Text style={{ color: colors.fgDefault, fontSize: 14 }}>
                {ufvk}
              </Text>
            </Pressable>
          ) : (
            words.map((word, i) => {
              const valid = isSeedWord(word);
              return (
                <Animated.View
                  key={`${i}-${word}`}
                  entering={chipEnter()}
                  exiting={chipExit()}
                  layout={chipLayout()}
                >
                  <Pressable
                    onPress={() => removeWordAt(i)}
                    accessibilityRole="button"
                    accessibilityLabel={word}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      height: CHIP_HEIGHT,
                      borderRadius: CHIP_HEIGHT / 2,
                      paddingLeft: 10,
                      paddingRight: 11,
                      backgroundColor: valid ? colors.bgCanvas : BAD_BG,
                      borderWidth: valid ? 0 : 1,
                      borderColor: BAD_BORDER,
                    }}
                  >
                    <Text style={{ color: colors.fgMuted, fontSize: 10 }}>
                      {i + 1}
                    </Text>
                    <Text
                      style={{
                        color: valid ? colors.fgDefault : BAD_TEXT,
                        fontSize: 15,
                      }}
                    >
                      {word}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })
          )}
          {!ufvk && (
            <Animated.View
              layout={chipLayout()}
              style={{
                flexGrow: 1,
                minWidth: 90,
                height: CHIP_HEIGHT,
                justifyContent: 'center',
              }}
            >
              <Text
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 3,
                  color: colors.fgMuted,
                  fontSize: 15,
                }}
              >
                <Text style={{ color: 'transparent' }}>{draft}</Text>
                {ghost}
              </Text>
              <TextInput
                ref={inputRef}
                testID={testID}
                accessible={true}
                accessibilityLabel={accessibilityLabel}
                value={draft}
                onChangeText={onChangeText}
                onKeyPress={onKeyPress}
                onSubmitEditing={acceptDraft}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                blurOnSubmit={false}
                autoCorrect={false}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                textContentType="none"
                keyboardType="visible-password"
                cursorColor={colors.fgAccent}
                style={{
                  color: colors.fgDefault,
                  fontSize: 15,
                  paddingVertical: 0,
                  paddingLeft: 3,
                  paddingRight: 0,
                  height: CHIP_HEIGHT,
                  backgroundColor: 'transparent',
                }}
              />
            </Animated.View>
          )}
        </Pressable>
        {suggestions.length > 0 && !invalidDraft && (
          <Animated.View
            entering={suggestionsEnter()}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 14,
            }}
          >
            {suggestions.map((s, i) => (
              <Pressable
                key={s}
                onPress={() => acceptWord(s)}
                accessibilityRole="button"
                style={{
                  height: CHIP_HEIGHT,
                  borderRadius: CHIP_HEIGHT / 2,
                  paddingHorizontal: 11,
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: i === 0 ? OK_BORDER : colors.bottomSheetBorder,
                  backgroundColor: i === 0 ? OK_BG : colors.bgCanvas,
                }}
              >
                <Text
                  style={{
                    color: i === 0 ? OK_TEXT : colors.fgMuted,
                    fontSize: 12.5,
                  }}
                >
                  <Text
                    style={{
                      color: i === 0 ? '#E2FFDB' : colors.fgDefault,
                      fontWeight: '600',
                    }}
                  >
                    {draft.toLowerCase()}
                  </Text>
                  {s.slice(draft.length)}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        )}
        <Animated.Text
          style={[
            {
              position: 'absolute',
              right: 13,
              bottom: 12,
              color: complete ? colors.fgAccent : colors.fgMuted,
              fontSize: 11,
            },
            counterStyle,
          ]}
        >
          {counter}
        </Animated.Text>
      </Animated.View>
      {invalidDraft && (
        <Text
          style={{
            marginTop: 6,
            marginHorizontal: 2,
            color: BAD_TEXT,
            fontSize: 10.5,
            lineHeight: 15,
          }}
        >
          {translate('import.word-invalid') as string}
        </Text>
      )}
    </View>
  );
};

export default SeedPhraseInput;
