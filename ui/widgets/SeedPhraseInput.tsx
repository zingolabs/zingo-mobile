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
  Platform,
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
  scannedSeedPhrase,
  seedStatus,
  startsLikeViewingKey,
  suggestWords,
  tokenize,
} from '@app/utils/seedPhrase';
import { fieldBorder } from '@ui/primitives/fieldBorder';

type SeedPhraseInputProps = {
  value: string;
  onChangeValue: (value: string) => void;
  translate: (key: string) => TranslateType;
  testID?: string;
  accessibilityLabel?: string;
  // Why the viewing key in the field cannot be used, already translated.
  keyError?: string;
  // The decode accepted the viewing key in the field.
  keyValid?: boolean;
  // The viewing key text lost focus.
  onKeyBlur?: () => void;
  // Bumps to flash the border green once, as a scanned key lands.
  pulse?: number;
  // The birthday a pasted phrase carried after its words, as Zingo copies it.
  onBirthday?: (height: number) => void;
};

const PULSE_MS = 700;

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

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const joinWords = (words: string[]) => words.join(' ');
// A key keeps no spaces or line breaks and is always lowercase.
const normalizeKey = (text: string) => text.replace(/\s+/g, '').toLowerCase();

const SeedPhraseInput: React.FunctionComponent<SeedPhraseInputProps> = ({
  value,
  onChangeValue,
  translate,
  testID,
  accessibilityLabel,
  keyError,
  keyValid,
  onKeyBlur,
  pulse,
  onBirthday,
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
  // Words from this index on arrived in one paste and appear without the pop.
  const pastedFromRef = useRef(Number.MAX_SAFE_INTEGER);

  const ufvk = isViewingKey(value) ? value : '';
  const status = useMemo(() => seedStatus(value), [value]);
  const words = status.kind === 'seed' ? status.words : [];
  const full = words.length >= SEED_WORD_COUNT;
  const badWords = full && status.kind === 'seed' && status.invalid > 0;
  const badChecksum = status.kind === 'seed' && status.badChecksum;
  const keyFault = status.kind === 'ufvk' && !!keyError;
  const complete =
    (status.kind === 'ufvk' && !keyFault && !!keyValid) ||
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
  // A draft no word starts with: the start of a viewing key, or a typo.
  const draftHint =
    !ufvk && !!draft && suggestions.length === 0 && !invalidDraft
      ? words.length === 0 && startsLikeViewingKey(draft)
        ? (translate('import.key-keep-typing') as string)
        : (translate('import.word-nomatch') as string).replace(
            '{word}',
            draft.toLowerCase(),
          )
      : '';
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
    const before = currentWords().length;
    pastedFromRef.current =
      next.length - before > 1 ? before : Number.MAX_SAFE_INTEGER;
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
    /** Zingo copies a phrase with its birthday after it; read it as the scanner does. */
    const pasted = before.length === 0 ? scannedSeedPhrase(text) : null;
    if (pasted) {
      clearDraft(native);
      commit(pasted.words);
      if (pasted.birthday !== undefined) {
        onBirthday?.(pasted.birthday);
      }
      return;
    }
    if (isViewingKey(text)) {
      clearDraft(native);
      onChangeValue(normalizeKey(text));
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
  const onChangeKey = (raw: string) => {
    const text = normalizeKey(raw);
    if (isViewingKey(text)) {
      onChangeValue(text);
      return;
    }
    pendingWordsRef.current = [];
    onChangeValue('');
    onChangeText(raw);
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

  /** Emptied from outside, the text read before goes too: the same phrase or key pastes again. */
  useEffect(() => {
    if (!value) {
      consumedRef.current = '';
      nativeRef.current = '';
    }
  }, [value]);

  // The 24th word that breaks the checksum shakes the field once. A
  // viewing key only turns red.
  useEffect(() => {
    if (badChecksum || badWords) {
      shakeField();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badChecksum, badWords]);

  useEffect(() => {
    if (keyValid) {
      pulseCounter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyValid]);

  const flash = useSharedValue(0);
  useEffect(() => {
    if (pulse) {
      flash.value = 1;
      flash.value = withTiming(0, {
        duration: PULSE_MS,
        easing: ease.out,
        reduceMotion: ReduceMotion.Never,
      });
    }
  }, [pulse, flash]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const borderColor = fieldBorder(
    colors,
    focused,
    fieldError ? 'invalid' : complete ? 'valid' : 'unknown',
  );
  const counter = ufvk
    ? (translate(
        keyValid ? 'import.key-valid' : 'import.viewing-key',
      ) as string)
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
            paddingLeft: 12,
            paddingRight: 12,
            paddingBottom: 32,
            minHeight: 135,
          },
          shakeStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: -1,
              right: -1,
              top: -1,
              bottom: -1,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: colors.borderAccent,
            },
            pulseStyle,
          ]}
        />
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
                onKeyBlur?.();
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
                fontFamily: MONO,
                fontSize: 13,
                lineHeight: 21,
                padding: 0,
                textAlignVertical: 'top',
              }}
            />
          ) : (
            words.map((word, i) => {
              const valid = isSeedWord(word);
              return (
                <Animated.View
                  key={`${i}-${word}`}
                  entering={
                    i >= pastedFromRef.current ? undefined : chipEnter()
                  }
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
                      backgroundColor: valid
                        ? colors.bgCanvas
                        : colors.bgDangerSubtle,
                      borderWidth: valid ? 0 : 1,
                      borderColor: colors.borderDanger,
                    }}
                  >
                    <Text style={{ color: colors.fgMuted, fontSize: 12 }}>
                      {i + 1}
                    </Text>
                    <Text
                      style={{
                        color: valid ? colors.fgDefault : colors.fgDanger,
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
          {!ufvk && !full && (
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
                <Text style={{ opacity: 0 }}>{draft}</Text>
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
                }}
              />
            </Animated.View>
          )}
        </Pressable>
        {!!draftHint && (
          <Text
            testID={testID ? `${testID}.hint` : undefined}
            style={{
              marginTop: 14,
              color: colors.fgMuted,
              fontSize: 13,
            }}
          >
            {draftHint}
          </Text>
        )}
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
                  borderColor:
                    i === 0 ? colors.borderAccent : colors.bottomSheetBorder,
                  backgroundColor:
                    i === 0 ? colors.bgAccentSubtle : colors.bgCanvas,
                }}
              >
                <Text
                  style={{
                    color: i === 0 ? colors.fgAccent : colors.fgMuted,
                    fontSize: 13,
                  }}
                >
                  <Text
                    style={{
                      color: i === 0 ? colors.fgAccent : colors.fgDefault,
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
                ? colors.fgDanger
                : complete
                  ? colors.fgAccent
                  : colors.fgMuted,
              fontSize: 12,
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
            color: colors.fgDanger,
            fontSize: 12,
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
