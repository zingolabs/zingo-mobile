/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';

import {
  iconSizeSm,
  radiusMd,
  radiusPill,
  radiusXs,
  space4,
  rowMinHeight,
  slopFor,
  space8,
  space12,
  space16,
  useTheme,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import { duration } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { Route, SnackbarDurationEnum } from '@app/AppState';
import Header from '@ui/widgets/Header';
import { AppDrawerParamList, WalletSeedAction } from '@app/types';
import { showConfirm } from '@app/services/showConfirm';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import { useSecureScreen } from '@app/hooks/useSecureScreen';
import { useScreenCapture } from '@app/hooks/useScreenCapture';
import { getRecoveryWalletInfo } from '@app/services/recoveryWalletInfo';
import { fetchWallet } from '@app/walletBackend';
import { copySensitive } from '@app/utils/sensitiveClipboard';
import { formatInteger } from '@app/utils/formatAmount';
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

const PUSHED_DIM = 0.55;
const PUSH_IN_MS = duration.screen;
const PUSH_OUT_MS = duration.emphasized;
const VK_HEAD = 10;
const VK_TAIL = 6;
const KEY_QR = 190;

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
type WalletSeedProps = NativeStackScreenProps<AppDrawerParamList, 'WalletSeed'>;

const WalletSeed: React.FunctionComponent<WalletSeedProps> = ({
  navigation,
  route,
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
    changeWallet,
    applyPendingServer,
    cancelPendingServer,
  } = context;
  // What confirming or backing out does depends on why the seed is shown.
  const onConfirm = async () => {
    if (action === 'change') {
      await changeWallet();
    } else if (action === 'server') {
      await applyPendingServer();
    }
  };
  /** The pending action was confirmed or cancelled already. */
  const settled = useRef(false);
  const onCancel = async () => {
    settled.current = true;
    if (action === 'server') {
      await cancelPendingServer();
    }
  };
  /**
   * Any other way out (iOS's swipe, Android's back) cancels a pending server
   * change, as the back arrow does.
   */
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (!settled.current) {
          onCancel();
        }
      }),
    // onCancel reads only the route's action, fixed for this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigation],
  );
  const { colors } = useTheme();
  const bottomPad = useBottomActionPad();
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
  // The backup flow dims this screen in place: it never moves, so the flow
  // pops straight back onto it.
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
    navigation.navigate(Route.SeedBackup, { entry: { kind } });
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
            settled.current = true;
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
  const strip = seedBackedUp
    ? {
        border: colors.borderAccent,
        bg: colors.bgAccentSubtle,
        tile: colors.bgAccentSubtle,
      }
    : {
        border: colors.borderWarning,
        bg: colors.bgWarning,
        tile: colors.bgWarningSubtle,
      };
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
        style={{ flex: 1, paddingTop: 4 }}
      >
        <Header
          title={
            translate(action ? TITLE[action] : 'loadedapp.walletseed') as string
          }
          closeScreen={leave}
          backTestID="walletseed.back"
          backAccessibilityLabel={translate('walletseed.back-acc') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
        />
        {/** The content scrolls above the footer, never under it. */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: space16 }}
          keyboardShouldPersistTaps="handled"
        >
          {action && (
            <Text
              testID="walletseed.leaving"
              variant="body"
              tone="muted"
              style={{
                marginHorizontal: SIDE,
                marginBottom: space16,
                textAlign: 'center',
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
                gap: space12,
                minHeight: rowMinHeight,
                marginHorizontal: SIDE,
                marginBottom: space12,
                paddingHorizontal: space12,
                paddingVertical: space8,
                borderRadius: radiusMd,
                borderWidth: 1,
                borderColor: strip.border,
                backgroundColor: strip.bg,
              }}
            >
              <View style={{ flex: 1, gap: space4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    columnGap: space8,
                    rowGap: space4,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: radiusXs,
                      backgroundColor: strip.tile,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {seedBackedUp ? (
                      <ShieldCheckIcon
                        size={iconSizeSm}
                        color={colors.fgAccent}
                      />
                    ) : (
                      <TriangleAlert
                        size={iconSizeSm}
                        color={colors.fgWarning}
                      />
                    )}
                  </View>
                  <Text
                    variant="bodyStrong"
                    tone={seedBackedUp ? 'accent' : 'warning'}
                  >
                    {
                      translate(
                        seedBackedUp
                          ? 'walletseed.ok-title'
                          : 'walletseed.no-title',
                      ) as string
                    }
                  </Text>
                </View>
                <Text variant="caption" tone="muted">
                  {seedBackedUp
                    ? backedUpOn
                    : (translate('walletseed.no-sub') as string)}
                </Text>
              </View>
              {!seedBackedUp && (
                <Button
                  testID="walletseed.backup"
                  variant="primary"
                  size="small"
                  inline
                  title={translate('seednotice.button') as string}
                  onPress={() => openFlow('push')}
                />
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
          <View
            style={{ marginTop: space12, zIndex: tip === 'birthday' ? 3 : 2 }}
          >
            <InfoRow
              testID="walletseed.birthday"
              label={translate('seedbackup.birthday') as string}
              tipTitle={translate('seedbackup.birthday-tip-title') as string}
              tipBody={translate('seedbackup.birthday-tip-body') as string}
              open={tip === 'birthday'}
              onToggle={toggle('birthday')}
              value={formatInteger(birthday)}
            />
          </View>
          {!readOnly && (
            <View style={{ marginTop: space8, zIndex: tip === 'vk' ? 3 : 1 }}>
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
                    kind="icon"
                    hitSlop={slopFor(28)}
                    testID="walletseed.vk-copy"
                    accessibilityRole="button"
                    accessibilityLabel={
                      translate('walletseed.vk-copy') as string
                    }
                    onPress={copyVk}
                    style={{
                      width: 28,
                      height: 28,
                      marginLeft: space8,
                      marginRight: -space8,
                      borderRadius: radiusPill,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CopyIcon size={iconSizeSm} color={colors.fgDefault} />
                  </Pressable>
                }
              />
            </View>
          )}
        </ScrollView>

        {/**
         * Copy and Show stay in the footer: at the end of the scroll, a tall
         * seed on a short screen pushed them out of sight.
         */}
        <View
          style={{
            paddingTop: space8,
            paddingBottom: bottomPad,
          }}
        >
          <View style={{ marginBottom: space12 }}>
            <CopyShowButtons
              testID="walletseed"
              hidden={hidden}
              onToggleHide={() => setHidden(h => !h)}
              onCopy={copyWords}
            />
          </View>
          {action ? (
            <View style={{ marginHorizontal: SIDE }}>
              <Button
                testID="walletseed.go"
                variant="primary"
                disabled={!ready}
                title={translate(`walletseed.go-${action}`) as string}
                onPress={() => confirm(action)}
              />
            </View>
          ) : seedBackedUp ? (
            <StepActions
              testID="walletseed.actions"
              link={translate('walletseed.verify') as string}
              onLink={() => openFlow('verify')}
              primary={translate('seedbackup.done') as string}
              onPrimary={() => navigation.goBack()}
            />
          ) : (
            <View style={{ marginHorizontal: SIDE }}>
              <Button
                testID="walletseed.done"
                variant="primary"
                title={translate('seedbackup.done') as string}
                onPress={() => navigation.goBack()}
              />
            </View>
          )}
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.bgCanvas },
          dim,
        ]}
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
