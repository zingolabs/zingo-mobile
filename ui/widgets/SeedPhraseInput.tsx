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
import RegText from '@ui/primitives/RegText';

type SeedPhraseInputProps = {
  value: string;
  onChangeValue: (value: string) => void;
  translate: (key: string) => TranslateType;
  testID?: string;
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

const joinWords = (words: string[]) => words.join(' ');

const SeedPhraseInput: React.FunctionComponent<SeedPhraseInputProps> = ({
  value,
  onChangeValue,
  translate,
  testID,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const [invalidDraft, setInvalidDraft] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const ufvk = isViewingKey(value) ? value.trim() : '';
  const words = useMemo(() => (ufvk ? [] : tokenize(value)), [ufvk, value]);
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

  const acceptDraft = () => {
    if (!draft) {
      return;
    }
    const word = resolveWord(draft);
    if (word) {
      acceptWord(word);
    } else {
      rejectDraft();
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

  const acceptDraftFrom = (text: string) => {
    const word = resolveWord(text);
    if (word) {
      acceptWord(word);
    } else {
      setDraft(text);
      rejectDraft();
    }
  };

  const onKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
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
    : colors.borderMuted;
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
            padding: 10,
            minHeight: 100,
          },
          shakeStyle,
        ]}
      >
        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
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
                backgroundColor: colors.bgSurface,
              }}
            >
              <Text
                style={{
                  color: colors.fgDefault,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {ufvk}
              </Text>
            </Pressable>
          ) : (
            words.map((word, i) => {
              const valid = isSeedWord(word);
              const tint = valid ? colors.fgAccent : colors.fgDangerEmphasis;
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
                      borderWidth: 1,
                      borderColor: tint,
                      borderRadius: 16,
                      paddingLeft: 10,
                      paddingRight: 8,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ color: colors.fgMuted, fontSize: 12 }}>
                      {i + 1}
                    </Text>
                    <Text
                      style={{
                        color: valid ? colors.fgDefault : tint,
                        fontSize: 15,
                        fontWeight: '600',
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
              style={{ flexGrow: 1, minWidth: 96, justifyContent: 'center' }}
            >
              <Text
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  color: colors.fgMuted,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                <Text style={{ color: 'transparent' }}>{draft}</Text>
                {ghost}
              </Text>
              <TextInput
                ref={inputRef}
                testID={testID}
                value={draft}
                onChangeText={onChangeText}
                onKeyPress={onKeyPress}
                onSubmitEditing={acceptDraft}
                blurOnSubmit={false}
                autoCorrect={false}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                textContentType="none"
                keyboardType="visible-password"
                style={{
                  color: colors.fgDefault,
                  fontWeight: '600',
                  fontSize: 16,
                  padding: 0,
                  minHeight: 32,
                  backgroundColor: 'transparent',
                }}
              />
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          minHeight: 36,
        }}
      >
        {suggestions.length > 0 && !invalidDraft ? (
          <Animated.View
            entering={suggestionsEnter()}
            style={{ flexDirection: 'row', gap: 8, flex: 1 }}
          >
            {suggestions.map(s => (
              <Pressable
                key={s}
                onPress={() => acceptWord(s)}
                accessibilityRole="button"
                style={{
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: colors.bgSurface,
                }}
              >
                <Text style={{ color: colors.fgDefault, fontSize: 15 }}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : invalidDraft ? (
          <RegText
            style={{ flex: 1, color: colors.fgDangerEmphasis, fontSize: 13 }}
          >
            {translate('import.word-invalid') as string}
          </RegText>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Animated.Text
          style={[
            { color: colors.fgMuted, fontSize: 13, marginLeft: 8 },
            counterStyle,
          ]}
        >
          {counter}
        </Animated.Text>
      </View>
    </View>
  );
};

export default SeedPhraseInput;
