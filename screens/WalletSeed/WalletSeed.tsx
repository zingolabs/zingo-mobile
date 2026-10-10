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
import { AppDrawerParamList, WalletSeedAction } from '@app/types';
import { showConfirm } from '@app/services/showConfirm';
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
import KeyCard from '@screens/ViewingKey/components/KeyCard';

type WalletSeedProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.WalletSeed
> & {
  // Leaves this wallet or its server once the user confirms.
  onConfirm: () => Promise<void>;
  // Runs when the user backs out without leaving.
  onCancel: () => Promise<void>;
};

const PUSHED_SHIFT = 0.28;
const PUSHED_DIM = 0.55;
const PUSH_IN_MS = 380;
const PUSH_OUT_MS = 320;
const VK_HEAD = 10;
const VK_TAIL = 6;
const KEY_QR = 190;

const STRIP = {
  ok: { border: '#0E4A12', bg: '#04160B', tile: '#052520' },
  no: { border: '#5A3A12', bg: '#17120B', tile: '#2A1F10' },
};

type Tip = 'none' | 'birthday' | 'vk';

const TITLE: Record<WalletSeedAction, string> = {
  change: 'loadedapp.changewallet',
  server: 'walletseed.title-server',
};

const WARNING: Record<WalletSeedAction, string> = {
  change: 'seed.change-warning',
  server: 'seed.server-warning',
};

// A view-only wallet only gets here through Switch Wallet: its server
// change shows the viewing key screen instead.
const WARNING_VIEW_ONLY = 'walletseed.change-warning-vo';

// The seed phrase with its backup status, birthday and viewing key. With an
// action, the last look at them before leaving this wallet or its server.
// A view-only wallet shows its viewing key in place of the words.
const WalletSeed: React.FunctionComponent<WalletSeedProps> = ({
  navigation,
  route,
  onConfirm,
  onCancel,
}) => {
  const action = route.params?.action;
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    biometrics,
    addLastSnackbar,
    seedBackedUp,
    seedBackedUpAt,
    language,
    birthday: walletBirthday,
    readOnly,
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
    onCancel: () => leave(),
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
      if (readOnly) {
        const viewOnly = stored.ufvk ? stored : await fetchWallet(true);
        setBirthday(viewOnly?.birthday || walletBirthday);
        setVk(viewOnly?.ufvk || '');
        return;
      }
      const wallet = stored.seed ? stored : await fetchWallet(false);
      setWords((wallet?.seed || '').split(' ').filter(w => !!w));
      setBirthday(wallet?.birthday || walletBirthday);
      setVk((await fetchWallet(true))?.ufvk || '');
    })();
  }, [passed, walletBirthday, readOnly]);

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
      `${readOnly ? vk : words.join(' ')}\n${translate('seedbackup.birthday') as string}: ${birthday}`,
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

  const leave = async () => {
    await onCancel();
    navigation.goBack();
  };

  const confirm = (to: WalletSeedAction) =>
    showConfirm({
      title: translate('walletseed.confirm-title') as string,
      message: translate(readOnly ? WARNING_VIEW_ONLY : WARNING[to]) as string,
      buttons: [
        {
          text: translate('confirm') as string,
          onPress: async () => {
            await onConfirm();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          },
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });

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
  const ready = readOnly ? !!vk : words.length > 0;
  const veiled = hidden || shot !== 'none' || captured;
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
            onPress={leave}
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
            <ChevronLeft size={22} color={colors.fgAccent} strokeWidth={2.2} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{ color: colors.fgDefault, fontSize: 18, fontWeight: '700' }}
          >
            {
              translate(
                action ? TITLE[action] : 'loadedapp.walletseed',
              ) as string
            }
          </Text>
        </View>

        {action && (
          <Text
            testID="walletseed.leaving"
            style={{
              marginHorizontal: SIDE,
              marginBottom: 16,
              textAlign: 'center',
              color: colors.fgMuted,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {
              translate(
                `walletseed.sub-${action}${readOnly ? '-vo' : ''}`,
              ) as string
            }
          </Text>
        )}
        {!action && (
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
                    seedBackedUp
                      ? 'walletseed.ok-title'
                      : 'walletseed.no-title',
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
        )}

        {readOnly ? (
          <KeyCard
            testID="walletseed.vkcard"
            value={vk}
            hidden={veiled}
            qrSize={KEY_QR}
          />
        ) : (
          <WordGrid testID="walletseed.words" words={words} veiled={veiled} />
        )}
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
        {!readOnly && (
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
        )}
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
          {action ? (
            <Pressable
              testID="walletseed.go"
              accessibilityRole="button"
              disabled={!ready}
              onPress={() => confirm(action)}
              style={({ pressed }) => ({
                height: 44,
                marginHorizontal: 52,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: ready
                  ? colors.bgAccent
                  : colors.bgAccentDisabled,
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
                {translate(`walletseed.go-${action}`) as string}
              </Text>
            </Pressable>
          ) : seedBackedUp ? (
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
