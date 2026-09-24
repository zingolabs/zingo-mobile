/* eslint-disable react-native/no-inline-styles */
import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { showConfirm } from '@app/services/showConfirm';

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import Clipboard from '@react-native-clipboard/clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import RegText from '@ui/primitives/RegText';
import FadeText from '@ui/primitives/FadeText';
import BoldText from '@ui/primitives/BoldText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import AppSheet from '@ui/primitives/AppSheet';
import { useFullSheetSnapPoints } from '@app/hooks/useFullSheetSnapPoints';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import { useSecureScreen } from '@app/hooks/useSecureScreen';
import {
  ChainNameEnum,
  SnackbarDurationEnum,
  SeedActionEnum,
  SettingsNameEnum,
  ScreenEnum,
  RouteEnum,
} from '@app/AppState';
import Header from '@ui/widgets/Header';
import Utils from '@app/utils';
import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  createUpdateRecoveryWalletInfo,
  getRecoveryWalletInfo,
} from '@app/services/recoveryWalletInfo';
import WalletType from '@app/AppState/types/WalletType';
import { fetchWallet } from '@app/walletBackend';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type SeedProps = NativeStackScreenProps<AppDrawerParamList, RouteEnum.Seed> & {
  onClickOK: (seedPhrase: string, birthdayNumber: number) => void;
  onClickCancel: () => void;
  keepAwake?: (v: boolean) => void;
  setSeedReminderShowing?: (v: boolean) => void;
};
const Seed: React.FunctionComponent<SeedProps> = ({
  route,
  onClickOK,
  onClickCancel,
  keepAwake,
  setSeedReminderShowing,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    birthday: birthdayFromContext,
    translate,
    server,
    netInfo,
    privacy,
    addLastSnackbar,
    setPrivacyOption,
    security,
    foregroundEpoch,
  } = context;
  const { colors } = useTheme();
  // when this screen is open from LoadingApp (new wallet)
  // is using the standard modal from react-native
  const screenName = ScreenEnum.Seed;

  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed phrase, birthday and UFVK are on screen here — the only place in
  // the app where FLAG_SECURE is warranted.
  const secured = useSecureScreen();

  // Audit Issue D — single source of truth for the seed/UFVK biometric
  // gate. Lives inside Seed.tsx so every navigation path (header, menu,
  // chain-mismatch recovery, future callers) is funnelled through the same
  // check.
  //
  // The "change" and "backup" actions render the seed AND perform their
  // respective destructive operation. Each respects BOTH the per-action
  // toggle (changeWalletScreen / restoreWalletBackupScreen) and the
  // generic seedUfvkScreen toggle — if the user has asked for bio in
  // either of the two contexts, the gate fires.
  const initialAction: SeedActionEnum =
    !!route.params && route.params.action !== undefined
      ? route.params.action
      : SeedActionEnum.view;
  const needsAuth: boolean =
    (initialAction === SeedActionEnum.view && !!security?.seedUfvkScreen) ||
    (initialAction === SeedActionEnum.change &&
      (!!security?.seedUfvkScreen || !!security?.changeWalletScreen)) ||
    (initialAction === SeedActionEnum.backup &&
      (!!security?.seedUfvkScreen || !!security?.restoreWalletBackupScreen)) ||
    (initialAction === SeedActionEnum.server && !!security?.seedUfvkScreen);
  const screenGate = useBiometricGate({
    needsAuth,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
    foregroundAppEnabled: !!security?.foregroundApp,
    foregroundEpoch,
  });
  const authPassed = screenGate.kind === 'passed';

  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);
  const [action, setAction] = useState<SeedActionEnum>(
    !!route.params && route.params.action !== undefined
      ? route.params.action
      : SeedActionEnum.view,
  );
  const [fetchedWallet, setFetchedWallet] = useState<WalletType>(
    {} as WalletType,
  );
  const [loadingSeed, setLoadingSeed] = useState<boolean>(true);
  // Tracks where the seed actually came from so the loading legend can
  // change mid-flight (keychain → wallet on fallback) and the post-load
  // line under "tap to copy" can show its origin to the user.
  const [seedSource, setSeedSource] = useState<'keychain' | 'wallet' | null>(
    null,
  );
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const seedSheetRef = useRef<BottomSheet>(null);
  // True when the App opened this screen by itself, on the wallet's first
  // funds. The screen then belongs to that errand: it keeps the phone awake
  // while the words are copied, says so on its button, and spends the flag on
  // the way out.
  const [remindingSeed, setRemindingSeed] = useState<boolean>(false);

  useEffect(() => {
    // Only the App's own errand counts. The flag says a reminder is owed, not
    // that this visit is it: reaching the screen through Change Wallet or
    // Restore Backup while it is armed would otherwise relabel a destructive
    // button, spend the flag, and leave by a route the user never asked for.
    //
    // And not before the gate passes: cancelling it leaves by `goBack`, and
    // nothing should have been claimed on the way in.
    if (initialAction !== SeedActionEnum.view || !authPassed) {
      return;
    }
    let cancelled = false;
    (async () => {
      const { seedReminderPending } = await SettingsFileImpl.readSettings();
      if (cancelled || !seedReminderPending) {
        return;
      }
      setRemindingSeed(true);
      // twenty four words take a while to write down by hand
      keepAwake && keepAwake(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialAction, authPassed, keepAwake]);

  // What the screen turned out to be, where the unmount cleanup can read it:
  // that cleanup keeps the closure it was created with, and at mount time the
  // errand is not known yet.
  const remindingSeedRef = useRef<boolean>(false);
  remindingSeedRef.current = remindingSeed;

  useEffect(
    () => () => {
      // Whatever the screen claimed, it gives back on the way out. `hiding`
      // does this itself, but it is not the only exit: the gate's own cancel
      // leaves by `goBack`, and without this the phone would stay awake for
      // the rest of the session and the reminder guard would stay raised.
      keepAwake && keepAwake(false);
      setSeedReminderShowing && setSeedReminderShowing(false);
      if (remindingSeedRef.current) {
        // And the errand is spent by leaving, however the user left. Lowering
        // the guard without spending it would hand the next sync tick a
        // reminder that is still owed and no screen showing it, and the App
        // would open this one again — on a back gesture, over and over. The
        // App asked; asking again for the same funds is nagging.
        SettingsFileImpl.writeSettings(
          SettingsNameEnum.seedReminderPending,
          false,
        ).catch(e => console.log('seed reminder not spent on the way out', e));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    // Wait for the on-mount biometric gate to pass before touching the
    // keychain. Otherwise both prompts (ours + the keychain accessControl)
    // fire in parallel, and cancelling the gate's prompt cannot prevent
    // the second one.
    if (!authPassed) {
      return;
    }
    (async () => {
      setLoadingSeed(true);
      try {
        // The wallet is asked first, and the keychain entry is only the
        // fallback. The entry carries no idea of which wallet it belongs to,
        // so when its write failed — the one case the Settings warning is
        // about — it still holds the seed of the wallet used before this one.
        // Showing those words here would hand the user a backup of somebody
        // else's wallet, which is worse than showing none. The wallet always
        // knows whose seed it is holding.
        //
        // The keychain still answers when the wallet does not (a read error,
        // a user-cancel of its own prompt): that is what the entry is for, and
        // the legend says where the words came from. seedSource is updated as
        // we go so the loading legend follows.
        setSeedSource('wallet');
        const walletInfo = await fetchWallet(false);
        if (walletInfo?.seed) {
          // Keep the device's copy in step with the wallet. The write looks
          // before it leaps on its own — an entry that already holds these
          // words is left alone — so there is nothing to decide here.
          // Fire-and-forget so a save failure doesn't block the render.
          createUpdateRecoveryWalletInfo(walletInfo).catch(e =>
            console.log('Self-heal save failed', e),
          );
          // This wallet's UFVK belongs beside its own seed, and only there.
          // When the words come from the device's copy below, they may be the
          // ones saved for the wallet used before this one, and attaching the
          // current wallet's key to them would present two wallets as one.
          const ufvkInfo = await fetchWallet(true);
          setFetchedWallet({ ...walletInfo, ufvk: ufvkInfo?.ufvk });
        } else {
          setSeedSource('keychain');
          // Whatever the device saved, whole: its seed and the UFVK stored
          // with it are the same wallet's.
          setFetchedWallet(await getRecoveryWalletInfo());
        }
      } catch (e) {
        console.log('Error fetching wallet info for seed screen', e);
      } finally {
        setLoadingSeed(false);
      }
    })();
  }, [authPassed]);

  const seedPhrase = fetchedWallet.seed || '';
  const ufvk = fetchedWallet.ufvk || '';
  const birthdayNumber =
    (birthdayFromContext && birthdayFromContext.toString()) || '';

  useEffect(() => {
    return () => {
      // Only wipe the clipboard if WE have a pending auto-clear timer —
      // i.e. the user copied something from this screen and the 60s
      // expiry hasn't fired yet. Otherwise we'd be wiping clipboard
      // content the user copied from somewhere else (e.g. their seed
      // from another app, ready to paste into restore-wallet).
      if (clipboardTimer.current) {
        clearTimeout(clipboardTimer.current);
        Clipboard.setString('');
        clipboardTimer.current = null;
      }
    };
  }, []);

  const copySeedToClipboard = (expandOnCopy?: boolean) => {
    if (!seedPhrase) return;
    // Audit Suggestion 5 — explicit user consent before exposing recovery
    // material to the system clipboard. The 60-second auto-clear is kept
    // as defense-in-depth; this dialog adds the human-in-the-loop step
    // the audit asked for.
    showConfirm({
      title: translate('seed.clipboard-confirm-title') as string,
      message: translate(
        Platform.OS === 'ios'
          ? 'seed.clipboard-confirm-message-ios'
          : 'seed.clipboard-confirm-message-android',
      ) as string,
      buttons: [
        {
          text: translate('copy') as string,
          onPress: () => {
            if (clipboardTimer.current) {
              clearTimeout(clipboardTimer.current);
            }
            Clipboard.setString(seedPhrase);
            if (addLastSnackbar) {
              addLastSnackbar(
                translate('seed.tapcopy-seed-message') as string,
                SnackbarDurationEnum.longer,
              );
            }
            if (expandOnCopy) {
              setExpandSeed(true);
              if (privacy) {
                setTimeout(() => setExpandSeed(false), 5 * 1000);
              }
            }
            clipboardTimer.current = setTimeout(() => {
              Clipboard.setString('');
              clipboardTimer.current = null;
              if (addLastSnackbar) {
                addLastSnackbar(
                  translate('seed.clipboard-cleared') as string,
                  SnackbarDurationEnum.long,
                );
              }
            }, 60 * 1000);
          },
        },
        {
          text: translate('cancel') as string,
          style: 'cancel',
        },
      ],
    });
  };

  useEffect(() => {
    const _action =
      !!route.params && route.params.action !== undefined
        ? route.params.action
        : SeedActionEnum.view;
    setAction(_action);
  }, [route, route.params, route.params?.action]);

  useEffect(() => {
    if (privacy) {
      setExpandSeed(false);
      setExpandBithday(false);
    } else {
      setExpandSeed(true);
      setExpandBithday(true);
    }
  }, [privacy]);

  useEffect(() => {
    if (!expandSeed && !privacy) {
      setExpandSeed(true);
    }
  }, [expandSeed, privacy]);

  useEffect(() => {
    if (!expandBirthday && !privacy) {
      setExpandBithday(true);
    }
  }, [expandBirthday, privacy]);

  useEffect(() => {
    const buttonTextsArray = translate('seed.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setTimes(
      action === SeedActionEnum.change ||
        action === SeedActionEnum.backup ||
        action === SeedActionEnum.server
        ? 1
        : 0,
    );
  }, [action, translate]);

  const onPressOK = () => {
    showConfirm({
      title: !!texts && !!texts[action] ? texts[action][3] : '',
      message:
        (action === SeedActionEnum.change
          ? (translate('seed.change-warning') as string)
          : action === SeedActionEnum.backup
            ? (translate('seed.backup-warning') as string)
            : action === SeedActionEnum.server
              ? (translate('seed.server-warning') as string)
              : '') +
        (server.chainName !== ChainNameEnum.mainChainName &&
        (action === SeedActionEnum.change || action === SeedActionEnum.server)
          ? '\n' + (translate('seed.mainnet-warning') as string)
          : ''),
      buttons: [
        {
          text: translate('confirm') as string,
          onPress: () => {
            onClickOKHide(seedPhrase, Number(birthdayNumber));
          },
        },
        {
          text: translate('cancel') as string,
          onPress: () => onClickCancelHide(),
          style: 'cancel',
        },
      ],
    });
  };

  const onClickCancelHide = () => {
    onClickCancel();
    hiding();
  };

  const onClickOKHide = (
    seedPhraseParm: string,
    birthdayNumberParm: number,
  ) => {
    onClickOK(seedPhraseParm, birthdayNumberParm);
    hiding();
  };

  const hiding = async () => {
    if (remindingSeed) {
      // The errand is done, whether or not the user wrote anything down: the
      // App asked, and asking twice for the same funds would be nagging.
      //
      // The flag goes to disk before the guard comes down, and in that order:
      // the poller in LoadedApp re-opens this screen when it finds the flag
      // set and the guard clear, so dropping the guard first leaves a window
      // where a sync tick reopens the screen the user has just dismissed.
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.seedReminderPending,
        false,
      );
      setSeedReminderShowing && setSeedReminderShowing(false);
      setRemindingSeed(false);
      keepAwake && keepAwake(false);
      // The App brought the user here, so there is nothing behind this screen
      // to go back to. `reset` also puts the authenticated seed screen out of
      // reach of a back gesture.
      navigation.reset({
        index: 0,
        routes: [
          {
            name: RouteEnum.HomeStack,
            params: { screen: RouteEnum.History },
          },
        ],
      });
      return;
    }
    setSeedReminderShowing && setSeedReminderShowing(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const seedSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const seedTitle = useMemo(
    () => translate('seed.title') + ' (' + translate(`seed.${action}`) + ')',
    [action, translate],
  );

  const seedHeader = (
    <View
      style={{
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity
          onPress={onClickCancelHide}
          hitSlop={8}
          style={{ paddingHorizontal: 4, paddingVertical: 4 }}
        >
          <FontAwesomeIcon
            icon={faChevronLeft}
            size={20}
            color={colors.fgAccent}
          />
        </TouchableOpacity>
        <BoldText
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 28,
            textAlign: 'center',
          }}
        >
          {seedTitle}
        </BoldText>
        <View style={{ width: 28 }} />
      </View>
    </View>
  );

  const renderSeedFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bgSurface,
            paddingTop: 10,
            paddingBottom: 24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            testID="seed.button.ok"
            type={ButtonTypeEnum.Primary}
            // The button drives the seed-dependent confirm/change/backup/server
            // flow; without the seed phrase it has nothing to act on, so
            // disable it instead of silently ignoring presses.
            disabled={!seedPhrase}
            title={
              remindingSeed
                ? (translate('seed.showtransactions') as string)
                : !!texts && !!texts[action]
                  ? texts[action][times]
                  : ''
            }
            onPress={async () => {
              if (!seedPhrase) {
                return;
              }
              if (times === 0) {
                onClickOKHide(seedPhrase, Number(birthdayNumber));
              } else if (times === 1) {
                onPressOK();
              }
            }}
          />
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      colors,
      texts,
      action,
      times,
      seedPhrase,
      birthdayNumber,
      translate,
      remindingSeed,
    ],
  );

  if (!authPassed || !secured) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          translate={translate}
          netInfo={netInfo}
          privacy={privacy}
          receivedLegend={action === SeedActionEnum.view && remindingSeed}
        />
      </View>
      <AppSheet
        ref={seedSheetRef}
        snapPoints={seedSnapPoints}
        header={seedHeader}
        renderFooter={loadingSeed ? undefined : renderSeedFooter}
      >
        {loadingSeed ? (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginVertical: 20,
            }}
          >
            <ActivityIndicator size="large" color={colors.fgAccent} />
            {seedSource !== null && (
              <RegText style={{ marginTop: 12, textAlign: 'center' }}>
                {
                  translate(
                    seedSource === 'keychain'
                      ? 'seed.recovering-from-keychain'
                      : 'seed.recovering-from-wallet',
                  ) as string
                }
              </RegText>
            )}
          </View>
        ) : (
          <>
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              alwaysBounceVertical={false}
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                paddingBottom: 80,
              }}
            >
              <RegText
                style={{
                  marginTop: 0,
                  padding: 20,
                  textAlign: 'center',
                  fontWeight: '900',
                }}
              >
                {action === SeedActionEnum.backup ||
                action === SeedActionEnum.change ||
                action === SeedActionEnum.server
                  ? (translate(`seed.text-readonly-${action}`) as string)
                  : (translate('seed.text-readonly') as string)}
              </RegText>
              <View
                style={{
                  margin: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: colors.fgDefault,
                  maxHeight: '45%',
                }}
              >
                <TouchableOpacity onPress={() => copySeedToClipboard(true)}>
                  <RegText
                    color={colors.fgDefault}
                    style={{
                      textAlign: 'center',
                    }}
                  >
                    {!expandSeed
                      ? Utils.trimToSmall(seedPhrase, 5)
                      : seedPhrase}
                  </RegText>
                </TouchableOpacity>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <View />
                  <TouchableOpacity onPress={() => copySeedToClipboard(false)}>
                    <Text
                      style={{
                        color: colors.fgDefault,
                        textDecorationLine: 'underline',
                        padding: 10,
                        marginTop: 0,
                        textAlign: 'center',
                        minHeight: 48,
                      }}
                    >
                      {translate('seed.tapcopy') as string}
                    </Text>
                  </TouchableOpacity>
                  <View />
                </View>
                {seedSource !== null && (
                  <FadeText
                    style={{
                      textAlign: 'right',
                      fontSize: 11,
                      paddingHorizontal: 10,
                      marginTop: -12,
                    }}
                  >
                    {
                      translate(
                        seedSource === 'keychain'
                          ? 'seed.from-keychain'
                          : 'seed.from-wallet',
                      ) as string
                    }
                  </FadeText>
                )}
              </View>

              <View style={{ marginTop: 10, alignItems: 'center' }}>
                <FadeText style={{ textAlign: 'center' }}>
                  {translate('seed.birthday-readonly') as string}
                </FadeText>
                <TouchableOpacity
                  onPress={() => {
                    if (birthdayNumber) {
                      Clipboard.setString(birthdayNumber);
                      if (addLastSnackbar) {
                        addLastSnackbar(
                          translate('seed.tapcopy-birthday-message') as string,
                          SnackbarDurationEnum.short,
                        );
                      }
                      setExpandBithday(true);
                      if (privacy) {
                        setTimeout(() => {
                          setExpandBithday(false);
                        }, 5 * 1000);
                      }
                    }
                  }}
                >
                  <RegText
                    color={colors.fgDefault}
                    style={{ textAlign: 'center' }}
                  >
                    {!expandBirthday
                      ? Utils.trimToSmall(birthdayNumber, 1)
                      : birthdayNumber}
                  </RegText>
                </TouchableOpacity>
              </View>
              {!!ufvk && (
                <View style={{ marginTop: 10, alignItems: 'center' }}>
                  <FadeText style={{ textAlign: 'center' }}>
                    {translate('ufvk.viewkey') as string}
                  </FadeText>
                  <TouchableOpacity
                    onPress={() => {
                      // Audit Suggestion 5 — explicit consent before
                      // exposing the viewing key to the system clipboard.
                      showConfirm({
                        title: translate(
                          'seed.clipboard-confirm-title',
                        ) as string,
                        message: translate(
                          Platform.OS === 'ios'
                            ? 'seed.clipboard-confirm-message-ios'
                            : 'seed.clipboard-confirm-message-android',
                        ) as string,
                        buttons: [
                          {
                            text: translate('copy') as string,
                            onPress: () => {
                              Clipboard.setString(ufvk);
                              if (addLastSnackbar) {
                                addLastSnackbar(
                                  translate('ufvk.tapcopy-message') as string,
                                  SnackbarDurationEnum.short,
                                );
                              }
                            },
                          },
                          {
                            text: translate('cancel') as string,
                            style: 'cancel',
                          },
                        ],
                      });
                    }}
                  >
                    <RegText
                      color={colors.fgDefault}
                      style={{ textAlign: 'center' }}
                    >
                      {Utils.trimToSmall(ufvk, 8)}
                    </RegText>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ marginBottom: 30 }} />
            </BottomSheetScrollView>
          </>
        )}
      </AppSheet>
    </View>
  );
};

export default React.memo(Seed);
