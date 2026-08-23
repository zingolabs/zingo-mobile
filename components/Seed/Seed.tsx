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
import { showConfirm } from '../../app/showConfirm';

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '../../app/theme';
import Clipboard from '@react-native-clipboard/clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import SheetRim from '../Components/SheetRim';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { useBiometricGate } from '../../app/hooks/useBiometricGate';
import {
  ModeEnum,
  ChainNameEnum,
  SnackbarDurationEnum,
  SeedActionEnum,
  SettingsNameEnum,
  ButtonTypeEnum,
  ScreenEnum,
  RouteEnum,
} from '../../app/AppState';
import Header from '../Header';
import Utils from '../../app/utils';
import SettingsFileImpl from '../Settings/SettingsFileImpl';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  getRecoveryWalletInfo,
  saveRecoveryWalletInfo,
} from '../../app/recoveryWalletInfo';
import WalletType from '../../app/AppState/types/WalletType';
import { fetchWallet } from '../../app/walletBackend';

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
  setIsSeedViewModalOpen?: (v: boolean) => void;
};
const Seed: React.FunctionComponent<SeedProps> = ({
  route,
  onClickOK,
  onClickCancel,
  keepAwake,
  setIsSeedViewModalOpen,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    birthday: birthdayFromContext,
    translate,
    server,
    netInfo,
    privacy,
    mode,
    addLastSnackbar,
    setPrivacyOption,
    recoveryWalletInfoOnDevice,
    security,
    foregroundEpoch,
  } = context;
  const { colors } = useTheme();
  // when this screen is open from LoadingApp (new wallet)
  // is using the standard modal from react-native
  const screenName = ScreenEnum.Seed;

  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audit Issue D — single source of truth for the seed/UFVK biometric
  // gate. Lives inside Seed.tsx so every navigation path (header, menu,
  // basic-mode auto-trigger, chain-mismatch recovery, future callers) is
  // funnelled through the same check.
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
  const authPassed = useBiometricGate({
    needsAuth,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
    foregroundAppEnabled: !!security?.foregroundApp,
    foregroundEpoch,
  });

  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);
  const [basicFirstViewSeed, setBasicFirstViewSeed] = useState<boolean>(true);
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
        // Prefer the recovery-info keychain entry when the user enabled
        // the on-device cache, but always fall back to fetching the seed
        // directly from the wallet if the keychain returns empty — that
        // happens on user-cancel of the keychain's own bio prompt as
        // well as on genuine read errors. Leaving the field empty would
        // surprise the user since they did not opt-in to the screen-
        // level seedUfvkScreen gate. seedSource is updated as we go so
        // the loading legend reflects what's actually being read at
        // each moment (keychain → wallet on fallback).
        let seedInfo: WalletType = {} as WalletType;
        if (recoveryWalletInfoOnDevice) {
          setSeedSource('keychain');
          seedInfo = await getRecoveryWalletInfo();
        }
        if (!seedInfo.seed) {
          setSeedSource('wallet');
          const walletInfo = await fetchWallet(false);
          if (walletInfo) {
            seedInfo = walletInfo;
            // Self-heal: the user opted into the on-device cache but the
            // keychain entry is missing (startup save likely failed or the
            // toggle was flipped without auth). Write it now while the
            // gate's recent bio auth window is still warm so subsequent
            // visits read from the keychain. Fire-and-forget so a save
            // failure doesn't block the render.
            if (recoveryWalletInfoOnDevice) {
              saveRecoveryWalletInfo(walletInfo).catch(e =>
                console.log('Self-heal save failed', e),
              );
            }
          }
        }
        const ufvkInfo = await fetchWallet(true);
        setFetchedWallet({ ...seedInfo, ufvk: ufvkInfo?.ufvk });
      } catch (e) {
        console.log('Error fetching wallet info for seed screen', e);
      } finally {
        setLoadingSeed(false);
      }
    })();
  }, [recoveryWalletInfoOnDevice, authPassed]);

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
    if (keepAwake) {
      (async () => {
        const bfvs: boolean = (await SettingsFileImpl.readSettings())
          .basicFirstViewSeed;
        setBasicFirstViewSeed(bfvs);
        if (!bfvs) {
          // keep the screen awake while the user is writting the seed
          keepAwake(true);
        }
      })();
    }
  }, [keepAwake]);

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
    // when this screen is open from LoadingApp (new wallet)
    // is using the standard modal from react-native
    setIsSeedViewModalOpen && setIsSeedViewModalOpen(false);
    // the user just see the seed for the first time.
    if (mode === ModeEnum.basic && !basicFirstViewSeed) {
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.basicFirstViewSeed,
        true,
      );
      setBasicFirstViewSeed(true);
      keepAwake && keepAwake(false);
      // Redirect to history screen — `reset` wipes the stack so the
      // (already-authenticated) Seed instance can't be reached via a back
      // gesture after onboarding.
      navigation.reset({
        index: 0,
        routes: [
          {
            name: RouteEnum.HomeStack,
            params: { screen: RouteEnum.History },
          },
        ],
      });
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }
  };

  const seedSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const seedTitle = useMemo(
    () => translate('seed.title') + ' (' + translate(`seed.${action}`) + ')',
    [action, translate],
  );

  const renderSeedHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
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
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, seedTitle],
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
            type={
              mode === ModeEnum.basic
                ? ButtonTypeEnum.Secondary
                : ButtonTypeEnum.Primary
            }
            // In advanced mode the button drives the seed-dependent
            // confirm/change/backup/server flow; without the seed phrase
            // it has nothing to act on, so disable it instead of silently
            // ignoring presses.
            disabled={mode !== ModeEnum.basic && !seedPhrase}
            title={
              mode === ModeEnum.basic
                ? !basicFirstViewSeed
                  ? (translate('seed.showtransactions') as string)
                  : (translate('cancel') as string)
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
      mode,
      basicFirstViewSeed,
      texts,
      action,
      times,
      seedPhrase,
      birthdayNumber,
      translate,
    ],
  );

  if (!authPassed) {
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
          mode={mode}
          privacy={privacy}
          receivedLegend={
            action === SeedActionEnum.view ? !basicFirstViewSeed : false
          }
        />
      </View>
      <BottomSheet
        ref={seedSheetRef}
        snapPoints={seedSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderSeedHandle}
        footerComponent={loadingSeed ? undefined : renderSeedFooter}
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
            {seedSource !== null && mode !== ModeEnum.basic && (
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
              style={{
                flex: 1,
                backgroundColor: colors.bgSurface,
              }}
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
                {seedSource !== null && mode !== ModeEnum.basic && (
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
      </BottomSheet>
    </View>
  );
};

export default React.memo(Seed);
