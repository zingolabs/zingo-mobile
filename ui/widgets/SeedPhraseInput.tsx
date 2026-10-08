/* eslint-disable react-native/no-inline-styles */
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  seedStatus,
  suggestWords,
  tokenize,
} from '@app/utils/seedPhrase';

type SeedPhraseInputProps = {
  value: string;
  onChangeValue: (value: string) => void;
  translate: (key: string) => TranslateType;
  testID?: string;
  accessibilityLabel?: string;
  // Why the viewing key in the field cannot be used, already translated.
  keyError?: string;
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
  keyError,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const [invalidDraft, setInvalidDraft] = useState(false);
  // Set when typing or pasting tried to go past the 24th word.
  const [overflow, setOverflow] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  // A fast keyboard sends the next key before the last change renders, so the
  // props can still hold the words from before it. Every render catches up.
  const pendingWordsRef = useRef<string[] | null>(null);
  useLayoutEffect(() => {
    pendingWordsRef.current = null;
  });
  // The native text already turned into words. A TextInput keeps its own text
  // while newer keys are pending instead of taking the emptied draft, so the
  // next change can still start with it, render or not. It is dropped once a
  // change no longer does: the field has emptied.
  const consumedRef = useRef('');
  // The native text as the last change reported it.
  const nativeRef = useRef('');

  const ufvk = isViewingKey(value) ? value : '';
  const status = useMemo(() => seedStatus(value), [value]);
  const words = status.kind === 'seed' ? status.words : [];
  const full = words.length >= SEED_WORD_COUNT;
  const badWords = full && status.kind === 'seed' && status.invalid > 0;
  const badChecksum = status.kind === 'seed' && status.badChecksum;
  const keyFault = status.kind === 'ufvk' && !!keyError;
  const complete =
    (status.kind === 'ufvk' && !keyFault) ||
    (status.kind === 'seed' && status.complete);
  const fieldError: string | undefined = keyFault
    ? keyError
    : invalidDraft
      ? 'import.word-invalid'
      : overflow && full
        ? 'import.seed-full'
        : badWords
          ? 'import.seed-words-invalid'
          : badChecksum
            ? 'import.seed-checksum'
            : undefined;
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

  const shakeField = () => {
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

  const rejectDraft = () => {
    setInvalidDraft(true);
    shakeField();
  };

  const currentWords = () => pendingWordsRef.current ?? words;

  // Empties the draft. `used` is the native text it came from, which the field
  // may keep showing.
  const clearDraft = (used: string) => {
    consumedRef.current = used;
    setDraft('');
  };

  const rejectOverflow = (used: string) => {
    clearDraft(used);
    setOverflow(true);
    shakeField();
  };

  const commit = (next: string[]) => {
    pendingWordsRef.current = next;
    onChangeValue(joinWords(next));
    pulseCounter();
  };

  const acceptWord = (word: string, used: string) => {
    clearDraft(used);
    setInvalidDraft(false);
    if (currentWords().length >= SEED_WORD_COUNT) {
      rejectOverflow(used);
      return;
    }
    commit([...currentWords(), word]);
  };

  const acceptDraftFrom = (text: string, used: string) => {
    const word = resolveWord(text);
    if (word) {
      acceptWord(word, used);
    } else {
      setDraft(text);
      rejectDraft();
    }
  };

  const acceptDraft = () => {
    if (draft) {
      acceptDraftFrom(draft, nativeRef.current);
    }
  };

  const removeWordAt = (index: number) => {
    setOverflow(false);
    commit(currentWords().filter((_, i) => i !== index));
  };

  const onChangeText = (native: string) => {
    nativeRef.current = native;
    // Text already turned into words is not read again.
    if (!native.startsWith(consumedRef.current)) {
      consumedRef.current = '';
    }
    const text = native.slice(consumedRef.current.length);
    const before = currentWords();
    setInvalidDraft(false);
    if (isViewingKey(text)) {
      clearDraft(native);
      onChangeValue(text.trim());
      return;
    }
    if (before.length >= SEED_WORD_COUNT && text.trim()) {
      // The field can hand back text it kept after its words were taken.
      // Words that only repeat the end of the phrase are that, not a 25th.
      const echo = tokenize(text);
      const tail = before.slice(before.length - echo.length);
      if (echo.length <= before.length && echo.every((w, i) => w === tail[i])) {
        clearDraft(native);
        return;
      }
      rejectOverflow(native);
      return;
    }
    if (!/[\s,]/.test(text)) {
      setDraft(text);
      return;
    }
    const closed = /[\s,]$/.test(text);
    const parts = tokenize(text);
    if (parts.length === 0) {
      clearDraft(native);
      return;
    }
    if (parts.length === 1) {
      if (closed) {
        acceptDraftFrom(parts[0], native);
      } else {
        setDraft(parts[0]);
      }
      return;
    }
    clearDraft(native);
    const room = SEED_WORD_COUNT - before.length;
    if (parts.length > room) {
      setOverflow(true);
      shakeField();
    }
    commit([...before, ...parts.slice(0, room)]);
  };

  // Editing the key in place; a change that leaves it no longer a key returns
  // the field to words.
  const onChangeKey = (text: string) => {
    if (isViewingKey(text)) {
      onChangeValue(text);
      return;
    }
    pendingWordsRef.current = [];
    onChangeValue('');
    onChangeText(text);
  };

  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const current = currentWords();
    if (e.nativeEvent.key === 'Backspace' && draft === '' && current.length) {
      removeWordAt(current.length - 1);
    }
  };

  useEffect(() => {
    if (ufvk) {
      setDraft('');
    }
  }, [ufvk]);

  // The 24th word that breaks the checksum shakes the field once.
  useEffect(() => {
    if (badChecksum || badWords || keyFault) {
      shakeField();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badChecksum, badWords, keyFault]);

  const borderColor = fieldError
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
            <TextInput
              testID={testID}
              accessible={true}
              accessibilityLabel={translate('import.viewing-key') as string}
              value={ufvk}
              onChangeText={onChangeKey}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onChangeValue(ufvk.trim());
              }}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              textContentType="none"
              cursorColor={colors.fgAccent}
              style={{
                flex: 1,
                color: colors.fgDefault,
                fontSize: 14,
                lineHeight: 20,
                padding: 0,
                textAlignVertical: 'top',
                backgroundColor: 'transparent',
              }}
            />
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
                onPress={() => acceptWord(s, nativeRef.current)}
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
              color: fieldError
                ? BAD_TEXT
                : complete
                  ? colors.fgAccent
                  : colors.fgMuted,
              fontSize: 11,
            },
            counterStyle,
          ]}
        >
          {counter}
        </Animated.Text>
      </Animated.View>
      {fieldError && (
        <Text
          testID={testID ? `${testID}.error` : undefined}
          style={{
            marginTop: 6,
            marginHorizontal: 2,
            color: BAD_TEXT,
            fontSize: 10.5,
            lineHeight: 15,
          }}
        >
          {(keyFault ? fieldError : (translate(fieldError) as string)).replace(
            '{count}',
            String(status.kind === 'seed' ? status.invalid : 0),
          )}
        </Text>
      )}
    </View>
  );
};

export default SeedPhraseInput;
