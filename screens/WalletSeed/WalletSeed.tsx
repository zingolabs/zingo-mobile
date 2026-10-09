/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { RouteEnum, SnackbarDurationEnum } from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import { useSecureScreen } from '@app/hooks/useSecureScreen';
import { useScreenCapture } from '@app/hooks/useScreenCapture';
import { getRecoveryWalletInfo } from '@app/services/recoveryWalletInfo';
import { fetchWallet } from '@app/walletBackend';
import { copySensitive } from '@app/utils/sensitiveClipboard';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { ShieldCheckIcon } from '@ui/primitives/Icons/ShieldCheckIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import {
  CopyShowButtons,
  InfoRow,
  WordGrid,
} from '@screens/SeedBackup/components/SeedParts';
import { SIDE, StepActions } from '@screens/SeedBackup/components/StepParts';
import ScreenshotSheet from '@screens/SeedBackup/components/ScreenshotSheet';

type WalletSeedProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.WalletSeed
>;

const PUSHED_SHIFT = 0.28;
const PUSHED_DIM = 0.55;
const PUSH_IN_MS = 380;
const PUSH_OUT_MS = 320;
const VK_HEAD = 10;
const VK_TAIL = 6;

const STRIP = {
  ok: { border: '#0E4A12', bg: '#04160B', tile: '#052520' },
  no: { border: '#5A3A12', bg: '#17120B', tile: '#2A1F10' },
};

type Tip = 'none' | 'birthday' | 'vk';

// The seed phrase with its backup status, birthday and viewing key.
const WalletSeed: React.FunctionComponent<WalletSeedProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    biometrics,
    addLastSnackbar,
    seedBackedUp,
    seedBackedUpAt,
    language,
    birthday: walletBirthday,
  } = context;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const focused = useIsFocused();
  const secured = useSecureScreen();
  const gate = useBiometricGate({
    needsAuth: biometrics,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
  });
  const passed = gate.kind === 'passed';

  const [words, setWords] = useState<string[]>([]);
  const [birthday, setBirthday] = useState(0);
  const [vk, setVk] = useState('');
  const [hidden, setHidden] = useState(true);
  const [tip, setTip] = useState<Tip>('none');
  const [backingUp, setBackingUp] = useState(false);
  const [shot, setShot] = useState<'none' | 'on' | 'leaving'>('none');
  const shotGone = useCallback(() => setShot('none'), []);

  useEffect(() => {
    if (!passed) {
      return;
    }
    (async () => {
      const stored = await getRecoveryWalletInfo();
      const wallet = stored.seed ? stored : await fetchWallet(false);
      setWords((wallet?.seed || '').split(' ').filter(w => !!w));
      setBirthday(wallet?.birthday || walletBirthday);
      setVk((await fetchWallet(true))?.ufvk || '');
    })();
  }, [passed, walletBirthday]);

  useEffect(() => {
    if (focused) {
      setBackingUp(false);
      setHidden(true);
    }
  }, [focused]);

  const captured = useScreenCapture(passed && focused, () =>
    setShot(s => (s === 'none' ? 'on' : s)),
  );

  const covered = backingUp && !focused;
  const behind = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(covered ? -window.width * PUSHED_SHIFT : 0, {
          duration: covered ? PUSH_IN_MS : PUSH_OUT_MS,
          easing: ease.emphasized,
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));
  const dim = useAnimatedStyle(() => ({
    opacity: withTiming(covered ? PUSHED_DIM : 0, {
      duration: covered ? PUSH_IN_MS : PUSH_OUT_MS,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    }),
  }));

  const openFlow = (kind: 'push' | 'verify') => {
    setTip('none');
    setBackingUp(true);
    navigation.navigate(RouteEnum.SeedBackup, { entry: { kind } });
  };

  const copyWords = () => {
    copySensitive(
      `${words.join(' ')}\n${translate('seedbackup.birthday') as string}: ${birthday}`,
      () =>
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

  const copyVk = () => {
    copySensitive(vk, () => {});
    addLastSnackbar(
      translate('walletseed.vk-copied') as string,
      SnackbarDurationEnum.short,
    );
  };

  const toggle = (which: Tip) => (open: boolean) =>
    setTip(open ? which : 'none');

  const backedUpOn = seedBackedUpAt
    ? (translate('walletseed.ok-sub') as string).replace(
        '{date}',
        new Date(seedBackedUpAt).toLocaleDateString(language, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      )
    : (translate('walletseed.ok-restored') as string);
  const strip = seedBackedUp ? STRIP.ok : STRIP.no;
  const vkShort =
    vk.length > VK_HEAD + VK_TAIL
      ? `${vk.slice(0, VK_HEAD)}…${vk.slice(-VK_TAIL)}`
      : vk;

  if (!passed || !secured) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      <Animated.View
        testID="walletseed"
        onTouchStart={() => tip !== 'none' && setTip('none')}
        style={[{ flex: 1, paddingTop: insets.top + 6 }, behind]}
      >
        <View
          style={{
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Pressable
            testID="walletseed.back"
            accessibilityRole="button"
            accessibilityLabel={translate('walletseed.back-acc') as string}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              position: 'absolute',
              left: 10,
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : undefined,
            })}
          >
            <ChevronLeft size={22} color={colors.fgDefault} strokeWidth={2.2} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{ color: colors.fgDefault, fontSize: 18, fontWeight: '700' }}
          >
            {translate('loadedapp.walletseed') as string}
          </Text>
        </View>

        <View
          testID={seedBackedUp ? 'walletseed.ok' : 'walletseed.no'}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            height: 58,
            marginHorizontal: SIDE,
            marginBottom: 14,
            paddingLeft: 13,
            paddingRight: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: strip.border,
            backgroundColor: strip.bg,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: strip.tile,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {seedBackedUp ? (
              <ShieldCheckIcon
                size={17}
                color={colors.fgAccent}
                strokeWidth={1.9}
              />
            ) : (
              <TriangleAlert size={17} color={colors.fgWarning} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: seedBackedUp ? colors.fgAccent : colors.fgWarning,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              {
                translate(
                  seedBackedUp ? 'walletseed.ok-title' : 'walletseed.no-title',
                ) as string
              }
            </Text>
            <Text style={{ color: colors.fgMuted, fontSize: 12 }}>
              {seedBackedUp
                ? backedUpOn
                : (translate('walletseed.no-sub') as string)}
            </Text>
          </View>
          {!seedBackedUp && (
            <Pressable
              testID="walletseed.backup"
              accessibilityRole="button"
              onPress={() => openFlow('push')}
              style={({ pressed }) => ({
                height: 30,
                paddingHorizontal: 14,
                borderRadius: 15,
                justifyContent: 'center',
                backgroundColor: colors.bgAccent,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <Text
                style={{
                  color: colors.bgCanvas,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                {translate('seednotice.button') as string}
              </Text>
            </Pressable>
          )}
        </View>

        <WordGrid
          testID="walletseed.words"
          words={words}
          veiled={hidden || shot !== 'none' || captured}
        />
        <View style={{ marginTop: 12, zIndex: tip === 'birthday' ? 3 : 2 }}>
          <InfoRow
            testID="walletseed.birthday"
            label={translate('seedbackup.birthday') as string}
            tipTitle={translate('seedbackup.birthday-tip-title') as string}
            tipBody={translate('seedbackup.birthday-tip-body') as string}
            open={tip === 'birthday'}
            onToggle={toggle('birthday')}
            value={birthday.toLocaleString()}
          />
        </View>
        <View style={{ marginTop: 8, zIndex: tip === 'vk' ? 3 : 1 }}>
          <InfoRow
            testID="walletseed.vk"
            label={translate('walletseed.vk') as string}
            tipTitle={translate('walletseed.vk-tip-title') as string}
            tipBody={translate('walletseed.vk-tip-body') as string}
            open={tip === 'vk'}
            onToggle={toggle('vk')}
            value={vkShort}
            trailing={
              <Pressable
                testID="walletseed.vk-copy"
                accessibilityRole="button"
                accessibilityLabel={translate('walletseed.vk-copy') as string}
                onPress={copyVk}
                style={({ pressed }) => ({
                  width: 26,
                  height: 26,
                  marginLeft: 6,
                  marginRight: -6,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed
                    ? 'rgba(211,226,248,0.08)'
                    : undefined,
                })}
              >
                <CopyIcon size={15} color={colors.fgDefault} />
              </Pressable>
            }
          />
        </View>
        <View style={{ marginTop: 12 }}>
          <CopyShowButtons
            testID="walletseed"
            hidden={hidden}
            onToggleHide={() => setHidden(h => !h)}
            onCopy={copyWords}
          />
        </View>

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: insets.bottom + 16,
          }}
        >
          {seedBackedUp ? (
            <StepActions
              testID="walletseed.actions"
              link={translate('walletseed.verify') as string}
              onLink={() => openFlow('verify')}
              primary={translate('seedbackup.done') as string}
              onPrimary={() => navigation.goBack()}
            />
          ) : (
            <Pressable
              testID="walletseed.done"
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={({ pressed }) => ({
                height: 44,
                marginHorizontal: 52,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bgAccent,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text
                style={{
                  color: colors.bgCanvas,
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                {translate('seedbackup.done') as string}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dim]}
      />
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

export default WalletSeed;
