/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { RouteEnum, SnackbarDurationEnum } from '@app/AppState';
import { AppDrawerParamList, CardRect } from '@app/types';
import { useSecureScreen } from '@app/hooks/useSecureScreen';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import { useScreenCapture } from '@app/hooks/useScreenCapture';
import {
  enactGateAnswer,
  resolveTriggerGate,
} from '@app/services/gateController';
import {
  getRecoveryWalletInfo,
  hasRecoveryWalletInfo,
} from '@app/services/recoveryWalletInfo';
import { fetchWallet } from '@app/walletBackend';
import { copySensitive } from '@app/utils/sensitiveClipboard';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { axisEnter, axisExit } from '@ui/widgets/OnboardingStage';
import InfoStep from './components/InfoStep';
import WordsStep from './components/WordsStep';
import ConfirmStep, { useWordCheck } from './components/ConfirmStep';
import DoneStep from './components/DoneStep';
import ScreenshotSheet from './components/ScreenshotSheet';
import { SIDE, StepActions } from './components/StepParts';

type SeedBackupProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.SeedBackup
>;

type Step = 'info' | 'words' | 'confirm' | 'done';
type Move = { step: Step; dir: 1 | -1 };

const AXIS_PT = 30;
const OPEN_MS = 520;
const CLOSE_MS = 440;
const CONTENT_IN_MS = 220;
const CONTENT_IN_AT = 260;
const CONTENT_OUT_MS = 120;
const CLOSE_AT = 100;
const RADIUS = 14;

const motion = (ms: number, easing = ease.emphasized) => ({
  duration: ms,
  easing,
  reduceMotion: ReduceMotion.System,
});

const enterFor = (from: Step | null, move: Move) => {
  if (from === null) {
    return FadeIn.duration(CONTENT_IN_MS)
      .delay(CONTENT_IN_AT)
      .reduceMotion(ReduceMotion.System);
  }
  if (move.step === 'done') {
    return FadeIn.duration(260)
      .delay(200)
      .easing(ease.standard)
      .reduceMotion(ReduceMotion.System);
  }
  return axisEnter(AXIS_PT * move.dir);
};

const exitFor = (move: Move) =>
  move.step === 'done'
    ? FadeOut.duration(200)
        .easing(ease.standard)
        .reduceMotion(ReduceMotion.System)
    : axisExit(-AXIS_PT * move.dir);

// The confirm step and its actions, remounted for every new attempt.
const ConfirmPage: React.FunctionComponent<{
  words: string[];
  onPassed: () => void;
  onViewPhrase: () => void;
  bottom: number;
}> = ({ words, onPassed, onViewPhrase, bottom }) => {
  const { translate } = useContext(ContextAppLoaded);
  const check = useWordCheck(words, onPassed);
  const shake = useSharedValue(0);
  const nudge = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));
  return (
    <>
      <ConfirmStep check={check} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom }}>
        <StepActions
          testID="seedbackup.confirm"
          link={translate('seedbackup.view-phrase') as string}
          onLink={onViewPhrase}
          primary={translate('seedbackup.confirm') as string}
          off={!check.value}
          primaryStyle={nudge}
          onPrimary={() => {
            if (!check.value) {
              shake.value = withSequence(
                withTiming(-4, motion(60, ease.standard)),
                withTiming(4, motion(120, ease.standard)),
                withTiming(0, motion(60, ease.standard)),
              );
              return;
            }
            check.submit();
          }}
        />
      </View>
    </>
  );
};

// Back up the seed phrase: the flow grows out of the History notice card.
const SeedBackup: React.FunctionComponent<SeedBackupProps> = ({
  navigation,
  route,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, biometrics, addLastSnackbar, setSeedBackedUp } = context;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const root = useRef<View>(null);
  const [screen, setScreen] = useState<CardRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const keyboard = useKeyboardHeight();
  const secured = useSecureScreen();
  const [shot, setShot] = useState<'none' | 'on' | 'leaving'>('none');
  const shotGone = useCallback(() => setShot('none'), []);
  const from = route.params.from;

  const [move, setMove] = useState<Move>({ step: 'info', dir: 1 });
  const [shown, setShown] = useState<Move>(move);
  const previous = useRef<Step | null>(null);
  const [keychainNote, setKeychainNote] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [checked, setChecked] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const closing = useRef(false);

  const grow = useSharedValue(0);
  const content = useSharedValue(1);
  const savedShake = useSharedValue(0);

  const measured = screen.width > 0;
  useEffect(() => {
    if (measured) {
      grow.value = withTiming(1, motion(OPEN_MS));
    }
  }, [grow, measured]);

  useEffect(() => {
    hasRecoveryWalletInfo().then(setKeychainNote);
  }, []);

  useEffect(() => {
    if (shown.step !== move.step) {
      previous.current = shown.step;
      setShown(move);
    }
  }, [move, shown]);

  const step = shown.step;
  const captured = useScreenCapture(step === 'words', () =>
    setShot(s => (s === 'none' ? 'on' : s)),
  );

  const close = () => {
    if (closing.current) {
      return;
    }
    closing.current = true;
    content.value = withTiming(0, motion(CONTENT_OUT_MS, ease.standard));
    grow.value = withDelay(
      CLOSE_AT,
      withTiming(0, motion(CLOSE_MS), finished => {
        if (finished) {
          runOnJS(navigation.goBack)();
        }
      }),
    );
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  });

  const go = (to: Step, dir: 1 | -1) => setMove({ step: to, dir });

  const toWords = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    const answer = await resolveTriggerGate(undefined, biometrics, {
      translate,
    });
    const proceed = enactGateAnswer(
      answer,
      { lock: () => {}, notice: m => addLastSnackbar(m) },
      translate,
    );
    if (!proceed) {
      setLoading(false);
      return;
    }
    let phrase = words;
    if (phrase.length === 0) {
      const stored = await getRecoveryWalletInfo();
      const seed = stored.seed || (await fetchWallet(false))?.seed || '';
      phrase = seed.split(' ').filter(w => !!w);
      setWords(phrase);
    }
    setLoading(false);
    if (phrase.length === 0) {
      addLastSnackbar(translate('seedbackup.load-error') as string);
      return;
    }
    go('words', 1);
  };

  const saved = () => {
    if (!checked) {
      savedShake.value = withSequence(
        withTiming(-4, motion(60, ease.standard)),
        withTiming(4, motion(120, ease.standard)),
        withTiming(0, motion(60, ease.standard)),
      );
      setNudge(n => n + 1);
      addLastSnackbar(
        translate('seedbackup.check-first') as string,
        SnackbarDurationEnum.short,
      );
      return;
    }
    setAttempt(a => a + 1);
    go('confirm', 1);
  };

  const copy = () => {
    copySensitive(words.join(' '), () =>
      addLastSnackbar(
        translate('seed.clipboard-cleared') as string,
        SnackbarDurationEnum.long,
      ),
    );
    addLastSnackbar(
      translate('seedbackup.copied-toast') as string,
      SnackbarDurationEnum.short,
    );
  };

  const passed = () => {
    setSeedBackedUp(true);
    go('done', 1);
  };

  const shell = useAnimatedStyle(() => {
    const g = grow.value;
    return {
      left: (from.x - screen.x) * (1 - g),
      top: (from.y - screen.y) * (1 - g),
      width: from.width + (screen.width - from.width) * g,
      height: from.height + (screen.height - from.height) * g,
      borderRadius: RADIUS * (1 - g),
      backgroundColor: interpolateColor(
        g,
        [0, 0.12, 1],
        [`${colors.bgSurface}00`, colors.bgSurface, colors.bgCanvas],
      ),
    };
  });
  const layer = useAnimatedStyle(() => ({ opacity: content.value }));
  const savedNudge = useAnimatedStyle(() => ({
    transform: [{ translateX: savedShake.value }],
  }));

  const bottom = Math.max(insets.bottom + 16, keyboard + 12);

  const page = () => {
    switch (step) {
      case 'info':
        return (
          <>
            <InfoStep keychainNote={keychainNote} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom }}>
              <StepActions
                testID="seedbackup.info"
                link={translate('seedbackup.not-now') as string}
                onLink={close}
                primary={translate('seedbackup.continue') as string}
                off={loading}
                onPrimary={toWords}
              />
            </View>
          </>
        );
      case 'words':
        return (
          <>
            {secured && (
              <WordsStep
                words={words}
                hidden={hidden}
                veiled={hidden || shot !== 'none' || captured}
                onToggleHide={() => setHidden(h => !h)}
                onCopy={copy}
                checked={checked}
                onCheck={() => setChecked(c => !c)}
                nudge={nudge}
              />
            )}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom }}>
              <StepActions
                testID="seedbackup.words"
                link={translate('seedbackup.back') as string}
                onLink={() => go('info', -1)}
                primary={translate('seedbackup.saved') as string}
                off={!checked}
                primaryStyle={savedNudge}
                onPrimary={saved}
              />
            </View>
          </>
        );
      case 'confirm':
        return (
          <ConfirmPage
            key={attempt}
            words={words}
            onPassed={passed}
            onViewPhrase={() => go('words', -1)}
            bottom={bottom}
          />
        );
      case 'done':
        return (
          <>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <DoneStep />
            </View>
            <View
              style={{
                position: 'absolute',
                left: 52,
                right: 52,
                bottom: insets.bottom + 28,
              }}
            >
              <Pressable
                testID="seedbackup.done"
                accessibilityRole="button"
                onPress={close}
                style={({ pressed }) => ({
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.bgAccent,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Animated.Text
                  style={{
                    color: colors.bgCanvas,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  {translate('seedbackup.done') as string}
                </Animated.Text>
              </Pressable>
            </View>
          </>
        );
    }
  };

  return (
    <View
      ref={root}
      style={{ flex: 1 }}
      testID="seedbackup"
      onLayout={() =>
        root.current?.measureInWindow((x, y, width, height) =>
          setScreen({ x, y, width, height }),
        )
      }
    >
      <Animated.View style={[{ position: 'absolute' }, shell]} />
      <Animated.View style={[StyleSheet.absoluteFill, layer]}>
        <Animated.View
          key={step}
          entering={enterFor(previous.current, shown)}
          exiting={exitFor(move)}
          style={{ flex: 1, paddingTop: insets.top + 64 }}
        >
          {page()}
        </Animated.View>
        {step !== 'done' && (
          <Animated.View
            entering={FadeIn.duration(CONTENT_IN_MS)
              .delay(CONTENT_IN_AT)
              .reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
            style={{
              position: 'absolute',
              top: insets.top + 6,
              right: SIDE - 14,
            }}
          >
            <Pressable
              testID="seedbackup.close"
              accessibilityRole="button"
              accessibilityLabel={translate('seedbackup.close') as string}
              onPress={close}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : undefined,
              })}
            >
              <XIcon size={18} color={colors.fgMuted} strokeWidth={1.8} />
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
      {shot !== 'none' && (
        <ScreenshotSheet
          leaving={shot === 'leaving'}
          onGotIt={() => setShot('leaving')}
          onGone={shotGone}
        />
      )}
    </View>
  );
};

export default SeedBackup;
