/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useOptionsPanelSheetSlide } from '@app/hooks/useOptionsPanelSheetSlide';

import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faDotCircle,
  faChevronLeft,
  faChevronRight,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';

import RegText from '@ui/primitives/RegText';
import FadeText from '@ui/primitives/FadeText';
import BoldText from '@ui/primitives/BoldText';
import AppSheet from '@ui/primitives/AppSheet';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';

import Header from '@ui/widgets/Header';
import {
  LanguageEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  BlockExplorerEnum,
  UfvkActionEnum,
} from '@app/AppState';
import { fetchWallet, walletBackupExists } from '@app/walletBackend';
import {
  DeviceSecurityProbe,
  probeDeviceSecurity,
} from '@app/services/gateController';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import SelectBottomSheet from '@ui/widgets/SelectBottomSheet';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useFullSheetSnapPoints } from '@app/hooks/useFullSheetSnapPoints';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import {
  RecoveryInfoSaveResult,
  hasRecoveryWalletInfo,
  saveRecoveryWalletInfo,
} from '@app/services/recoveryWalletInfo';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createAlert } from '@app/services/createAlert';
import { sendEmail } from '@app/services/sendEmail';
import SwitchOff from '../../assets/img/switch-off.svg';
import SettingSwitchOn from '../../assets/img/setting-switch-on.svg';

type SettingsProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Settings
> & {
  setLanguageOption: (value: LanguageEnum) => Promise<void>;
  setBiometricsOption: (value: boolean) => Promise<void>;
  setPerformanceLevelOption: (value: RPCPerformanceLevelEnum) => Promise<void>;
  setBlockExplorerOption: (value: BlockExplorerEnum) => Promise<void>;
  toggleMenuDrawer: () => void;
};

type Options = {
  value: string;
  text: string;
};

const Settings: React.FunctionComponent<SettingsProps> = ({
  navigation,
  setLanguageOption,
  setBiometricsOption,
  setPerformanceLevelOption,
  setBlockExplorerOption,
  toggleMenuDrawer,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language: languageContext,
    privacy: privacyContext,
    addLastSnackbar,
    biometrics: biometricsContext,
    mixnetView,
    performanceLevel: performanceLevelContext,
    blockExplorer: blockExplorerContext,
    readOnly,
    setPrivacyOption,
    setBackgroundError,
    zingolibVersion,
    lastError,
    setLastError,
  } = context;

  const languagesArray = translate('settings.languages');
  let LANGUAGES: Options[] = [];
  if (typeof languagesArray === 'object') {
    LANGUAGES = languagesArray as Options[];
  }

  const privacysArray = translate('settings.privacys');
  let PRIVACYS: Options[] = [];
  if (typeof privacysArray === 'object') {
    PRIVACYS = privacysArray as Options[];
  }

  const performanceLevelsArray = translate('settings.performancelevels');
  let PERFORMANCELEVELMENU: Options[] = [];
  if (typeof performanceLevelsArray === 'object') {
    PERFORMANCELEVELMENU = performanceLevelsArray as Options[];
  }

  const blockExplorersArray = translate('settings.blockexplorers');
  let BLOCKEXPLORERMENU: Options[] = [];
  if (typeof blockExplorersArray === 'object') {
    BLOCKEXPLORERMENU = blockExplorersArray as Options[];
  }

  const { colors } = useTheme();
  const screenName = ScreenEnum.Settings;

  // The requirement is read once, at mount: this screen's own save
  // flips the switch, and that must not re-gate the open screen.
  const [needsAuth] = useState<boolean>(biometricsContext);
  const screenGate = useBiometricGate({
    needsAuth,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
  });
  const authPassed = screenGate.kind === 'passed';

  const [language, setLanguage] = useState<LanguageEnum>(languageContext);
  const [privacy, setPrivacy] = useState<boolean>(privacyContext);
  const [biometrics, setBiometrics] = useState<boolean>(biometricsContext);
  const [performanceLevel, setPerformanceLevel] =
    useState<RPCPerformanceLevelEnum>(performanceLevelContext);
  const [blockExplorer, setBlockExplorer] =
    useState<BlockExplorerEnum>(blockExplorerContext);

  const [disabled, setDisabled] = useState<boolean>(false);
  const [disabledButton, setDisabledButton] = useState<boolean>(false);
  const [showDeveloperOptions, setShowDeveloperOptions] =
    useState<boolean>(false);
  const [hasWalletBackup, setHasWalletBackup] = useState<boolean>(false);
  // Assumed stored until checked, so the warning doesn't flash on open.
  const [recoveryInfoStored, setRecoveryInfoStored] = useState<boolean>(true);
  const [savingRecoveryInfo, setSavingRecoveryInfo] = useState<boolean>(false);
  const [recoveryInfoSave, setRecoveryInfoSave] =
    useState<RecoveryInfoSaveResult | null>(null);
  const [openInfoSection, setOpenInfoSection] = useState<string | null>(null);
  // Seeded optimistically. The union names the probe's answer instead of
  // collapsing it to a bit at this edge.
  const [deviceSecurity, setDeviceSecurity] = useState<DeviceSecurityProbe>({
    kind: 'secured',
  });

  // Bottom-sheet measurements — Settings has no balance area, so the sheet
  // uses a single snap at the maximum height (just below the screen Header).
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);

  const settingsSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  // The system store that keeps the recovery info, by its platform name.
  const secureStore = Platform.OS === 'ios' ? 'Keychain' : 'Keystore';
  // A watch-only wallet keeps its viewing key; any other, its seed phrase.
  const keyKind = readOnly ? 'ufvk' : 'seed';

  // Writes this wallet's seed (or viewing key) to the secure store now and
  // reports how it went right under the warning.
  const saveRecoveryInfoNow = async () => {
    setSavingRecoveryInfo(true);
    setRecoveryInfoSave(null);
    const result = await saveRecoveryWalletInfo(await fetchWallet(readOnly));
    setRecoveryInfoSave(result);
    setRecoveryInfoStored(result.kind === 'saved');
    setSavingRecoveryInfo(false);
  };

  const recoveryInfoSaveText = (): string => {
    const key = savingRecoveryInfo
      ? 'settings.recoveryinfo-saving'
      : recoveryInfoSave?.kind === 'saved'
        ? 'settings.recoveryinfo-saved'
        : recoveryInfoSave?.kind === 'no-keys'
          ? `settings.recoveryinfo-nokeys-${keyKind}`
          : 'settings.recoveryinfo-failed';
    const error =
      recoveryInfoSave?.kind === 'write-failed' ? recoveryInfoSave.error : '';
    return (translate(key) as string)
      .replace('{store}', secureStore)
      .replace('{error}', error)
      .trim();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await hasRecoveryWalletInfo();
      if (!cancelled) {
        setRecoveryInfoStored(stored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Older builds kept a backup of the previous mainnet wallet on every
  // wallet change. Its restore stays here for whoever still has one.
  useEffect(() => {
    if (!showDeveloperOptions) {
      return;
    }
    let cancelled = false;
    (async () => {
      const exists = await walletBackupExists();
      if (!cancelled) {
        setHasWalletBackup(exists);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDeveloperOptions]);

  const probedRef = useRef<boolean>(false);
  useEffect(() => {
    // Probe once, after the gate first settles: the enrolled-lock answer
    // cannot change while the user stays in this app.
    if (!authPassed || probedRef.current) {
      return;
    }
    probedRef.current = true;
    let cancelled = false;
    (async () => {
      const probe = await probeDeviceSecurity();
      if (cancelled) {
        return;
      }
      setDeviceSecurity(probe);
    })();
    return () => {
      cancelled = true;
    };
  }, [authPassed]);

  useEffect(() => {
    if (
      languageContext === language &&
      privacyContext === privacy &&
      biometricsContext === biometrics &&
      performanceLevelContext === performanceLevel &&
      blockExplorerContext === blockExplorer
    ) {
      setDisabledButton(true);
    } else {
      setDisabledButton(false);
    }
  }, [
    language,
    languageContext,
    privacy,
    privacyContext,
    performanceLevel,
    performanceLevelContext,
    blockExplorer,
    blockExplorerContext,
    biometrics,
    biometricsContext,
  ]);

  // Ref that always points to the latest `saveSettings`. The footer's
  // `useCallback` only rebuilds when its declared deps change — which left
  // its captured `saveSettings` (and the local state inside it) stuck on
  // the first render that flipped `disabledButton`. Subsequent toggles
  // didn't refresh the closure, so only the change that flipped
  // disabledButton actually persisted on save. Reading through a ref makes
  // the footer's onPress always invoke the current closure.
  const saveSettingsRef = useRef<() => Promise<void>>(async () => {});

  const saveSettings = async () => {
    // ───────────────────────────────────────────────────────────────
    // Phase 1: Validate up-front (no I/O yet — purely synchronous guards).
    // ───────────────────────────────────────────────────────────────
    if (
      languageContext === language &&
      privacyContext === privacy &&
      biometricsContext === biometrics &&
      performanceLevelContext === performanceLevel &&
      blockExplorerContext === blockExplorer
    ) {
      addLastSnackbar(translate('settings.nochanges') as string);
      return;
    }
    if (!language) {
      addLastSnackbar(translate('settings.islanguage') as string);
      return;
    }

    // ───────────────────────────────────────────────────────────────
    // Phase 2: Persist the settings (AsyncStorage only, no backend
    // coordination). Wrapped in try/catch so a single failing setter
    // doesn't silently drop the rest.
    // ───────────────────────────────────────────────────────────────
    setDisabled(true);
    try {
      if (privacyContext !== privacy) {
        await setPrivacyOption(privacy);
      }
      if (biometricsContext !== biometrics) {
        await setBiometricsOption(biometrics);
      }
      if (performanceLevelContext !== performanceLevel) {
        await setPerformanceLevelOption(performanceLevel);
      }
      if (blockExplorerContext !== blockExplorer) {
        await setBlockExplorerOption(blockExplorer);
      }
      // Language: applied in place — the i18n update propagates without
      // an app reset.
      if (languageContext !== language) {
        await setLanguageOption(language);
      }
    } catch (e) {
      addLastSnackbar(
        `${translate('settings.save-error') as string}: ${(e as Error).message}`,
      );
      setDisabled(false);
      return;
    }
    setDisabled(false);

    // ───────────────────────────────────────────────────────────────
    // Phase 3: Done — pop back to the previous screen.
    // ───────────────────────────────────────────────────────────────
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(RouteEnum.HomeStack);
    }
  };
  saveSettingsRef.current = saveSettings;

  const navigateToHome = useCallback((reset: boolean) => {
    if (reset) {
      // reset all settings - no save changes
      setLanguage(languageContext);
      setPrivacy(privacyContext);
      setBiometrics(biometricsContext);
      setPerformanceLevel(performanceLevelContext);
      setBlockExplorer(blockExplorerContext);
    }
    // `goBack()` pops Settings off the stack — using `navigate(HomeStack)`
    // would push HomeStack on top while leaving the already-authenticated
    // Settings instance alive in the stack, allowing a back gesture to
    // bypass the biometric gate.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(RouteEnum.HomeStack);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const optionsRadio = (
    DATA: Options[],
    setOption: React.Dispatch<React.SetStateAction<string | boolean>>,
    typeOption: StringConstructor | BooleanConstructor,
    valueOption: string | boolean,
    label: string, // in lowercase to match with the translation json files.
  ) => {
    return DATA.map(item => {
      const infoSection = `${label}-${item.value}`;
      return (
        <View key={'view-' + item.value} style={{ marginBottom: 5 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
              minHeight: 48,
            }}
          >
            <TouchableOpacity
              testID={`settings.${label}-${item.value}`}
              disabled={disabled}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={() => setOption(typeOption(item.value))}
            >
              <FontAwesomeIcon
                icon={
                  typeOption(item.value) === valueOption
                    ? faDotCircle
                    : farCircle
                }
                size={16}
                color={colors.fgMuted}
              />
              <RegText style={{ marginLeft: 10 }}>
                {translate(`settings.value-${label}-${item.value}`) as string}
              </RegText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setOpenInfoSection(
                  openInfoSection === infoSection ? null : infoSection,
                )
              }
              hitSlop={8}
              style={{ marginLeft: 6 }}
            >
              <FontAwesomeIcon
                icon={faInfoCircle}
                size={14}
                color={colors.fgDefault}
              />
            </TouchableOpacity>
          </View>
          {openInfoSection === infoSection && (
            <View
              style={{
                backgroundColor: '#040E1D',
                borderRadius: 8,
                padding: 10,
              }}
            >
              <FadeText style={{ textAlign: 'center' }}>{item.text}</FadeText>
            </View>
          )}
        </View>
      );
    });
  };

  const languageSelectRef = useRef<BottomSheetModal>(null);
  const blockExplorerSelectRef = useRef<BottomSheetModal>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const sheetSlideStyle = useOptionsPanelSheetSlide();
  useDismissSheetsOnBlur();

  const settingsHeader = (
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
          onPress={() => {
            if (!disabled) {
              navigateToHome(true);
            }
          }}
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
          {translate('settings.title') as string}
        </BoldText>
        <View style={{ width: 28 }} />
      </View>
    </View>
  );

  const renderSettingsFooter = useCallback(
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
            testID="settings.button.save"
            disabled={disabled || disabledButton}
            type={ButtonTypeEnum.Primary}
            title={translate('settings.save') as string}
            onPress={() => {
              setTimeout(async () => {
                await saveSettingsRef.current();
                Keyboard.dismiss();
              }, 100);
            }}
          />
        </View>
      </BottomSheetFooter>
    ),

    [colors, disabled, disabledButton, translate],
  );

  const reportError = (error: string) => {
    createAlert(
      setBackgroundError,
      addLastSnackbar,
      'Last Error',
      error,
      false,
      translate,
      sendEmail,
      zingolibVersion,
    );
    setLastError('');
  };

  const sectionHeader = (key: string) => (
    <FadeText
      style={{
        marginLeft: 25,
        marginRight: 25,
        marginTop: 24,
        marginBottom: 4,
        fontSize: 12,
        letterSpacing: 0.5,
      }}
    >
      {(translate(key) as string).toUpperCase()}
    </FadeText>
  );

  if (!authPassed) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === GlobalConst.platformOSios ? 'padding' : 'height'
      }
      keyboardVerticalOffset={
        Platform.OS === GlobalConst.platformOSios ? 10 : 0
      }
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
    >
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
            toggleMenuDrawer={toggleMenuDrawer}
            noPrivacy={true}
          />
        </View>
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, sheetSlideStyle]}
        >
          <AppSheet
            ref={settingsSheetRef}
            snapPoints={settingsSnapPoints}
            header={settingsHeader}
            renderFooter={renderSettingsFooter}
          >
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              testID="settings.scroll-view"
              bounces={false}
              alwaysBounceVertical={false}
              style={{
                flex: 1,
              }}
              contentContainerStyle={{
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                paddingBottom: 100,
              }}
            >
              {/* SECTION: Preferences */}
              {sectionHeader('settings.section-preferences')}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginHorizontal: 25,
                  marginVertical: 15,
                }}
              >
                <BoldText>
                  {translate('settings.language-title') as string}
                </BoldText>
                <TouchableOpacity
                  disabled={disabled}
                  onPress={() => languageSelectRef.current?.present()}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RegText
                      style={{
                        marginRight: 5,
                        fontWeight: '400',
                        color: colors.fgMuted,
                      }}
                    >
                      {
                        translate(
                          `settings.value-language-${language}`,
                        ) as string
                      }
                    </RegText>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      size={12}
                      color={colors.fgMuted}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* SECTION: Privacy & Security */}
              {sectionHeader('settings.section-privacysecurity')}

              <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                    }}
                  >
                    {/* A long press on the title opens the developer
                          options. */}
                    <TouchableOpacity
                      onLongPress={() => setShowDeveloperOptions(true)}
                    >
                      <BoldText>
                        {translate('settings.privacy-title') as string}
                      </BoldText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setOpenInfoSection(
                          openInfoSection === 'privacy' ? null : 'privacy',
                        )
                      }
                      style={{ marginLeft: 6 }}
                    >
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        size={14}
                        color={colors.fgDefault}
                      />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setPrivacy(!privacy)}>
                    {privacy ? (
                      <SettingSwitchOn width={40} height={19} />
                    ) : (
                      <SwitchOff width={40} height={19} />
                    )}
                  </TouchableOpacity>
                </View>
                {openInfoSection === 'privacy' && (
                  <View
                    style={{
                      backgroundColor: '#040E1D',
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 8,
                    }}
                  >
                    <FadeText style={{ textAlign: 'center' }}>
                      {PRIVACYS.find(d => String(d.value) === 'true')?.text ??
                        ''}
                    </FadeText>
                  </View>
                )}
              </View>

              <View
                style={{
                  marginLeft: 25,
                  marginRight: 25,
                  marginVertical: 15,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <BoldText testID="settings.securitytitle">
                    {translate('settings.security-title') as string}
                  </BoldText>
                  <TouchableOpacity
                    testID="settings.biometrics"
                    disabled={disabled}
                    onPress={() => setBiometrics(!biometrics)}
                  >
                    {biometrics ? (
                      <SettingSwitchOn width={40} height={19} />
                    ) : (
                      <SwitchOff width={40} height={19} />
                    )}
                  </TouchableOpacity>
                </View>
                {deviceSecurity.kind === 'insecure' && (
                  <FadeText style={{ marginTop: 6 }}>
                    {
                      translate(
                        'settings.security-device-locked-hint',
                      ) as string
                    }
                  </FadeText>
                )}
              </View>

              {/* SECTION: Network & Advanced */}
              {sectionHeader('settings.section-networkadvanced')}

              {/* Nym is no longer a choice: every transmission travels the
                  mixnet. The row is left as the way into the diagnostics,
                  and its green says the network is the one carrying the
                  wallet's traffic. */}
              {mixnetView.kind === 'transport' && (
                <TouchableOpacity
                  testID="settings.mixnet"
                  onPress={() => navigation.navigate(RouteEnum.MixnetDoctor)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginHorizontal: 25,
                    marginVertical: 15,
                  }}
                >
                  <BoldText style={{ color: '#07FF94' }}>
                    {translate('settings.nym-network') as string}
                  </BoldText>
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    size={12}
                    color={colors.fgMuted}
                  />
                </TouchableOpacity>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginLeft: 25,
                  marginRight: 25,
                  marginVertical: 15,
                }}
              >
                <BoldText>
                  {translate('settings.blockexplorer-title') as string}
                </BoldText>
                <TouchableOpacity
                  disabled={disabled}
                  onPress={() => blockExplorerSelectRef.current?.present()}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RegText
                      style={{
                        marginRight: 5,
                        fontWeight: '400',
                        color: colors.fgMuted,
                      }}
                    >
                      {
                        translate(
                          `settings.value-blockexplorer-${blockExplorer}`,
                        ) as string
                      }
                    </RegText>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      size={12}
                      color={colors.fgMuted}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* SECTION: Other */}
              {sectionHeader('settings.section-other')}

              <TouchableOpacity
                testID="settings.about"
                disabled={disabled}
                onPress={() => navigation.navigate(RouteEnum.About)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginHorizontal: 25,
                  marginVertical: 15,
                }}
              >
                <BoldText>{translate('loadedapp.about') as string}</BoldText>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  size={12}
                  color={colors.fgMuted}
                />
              </TouchableOpacity>

              {(!recoveryInfoStored || recoveryInfoSave) && (
                <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                  {!recoveryInfoStored && (
                    <TouchableOpacity
                      testID="settings.recoveryinfo.save"
                      disabled={savingRecoveryInfo}
                      onPress={saveRecoveryInfoNow}
                      accessibilityRole="button"
                    >
                      <FadeText
                        style={{
                          color: colors.fgWarning,
                          textAlign: 'center',
                          textDecorationLine: 'underline',
                        }}
                      >
                        {
                          translate(
                            `settings.recoveryinfo-notstored-${keyKind}`,
                          ) as string
                        }
                      </FadeText>
                    </TouchableOpacity>
                  )}
                  {(savingRecoveryInfo || recoveryInfoSave) && (
                    <FadeText
                      testID="settings.recoveryinfo.result"
                      selectable
                      style={{
                        marginTop: recoveryInfoStored ? 0 : 8,
                        textAlign: 'center',
                        opacity: 1,
                        color: savingRecoveryInfo
                          ? colors.fgMuted
                          : recoveryInfoSave?.kind === 'saved'
                            ? colors.fgAccent
                            : colors.fgDanger,
                      }}
                    >
                      {recoveryInfoSaveText()}
                    </FadeText>
                  )}
                </View>
              )}

              {/* SECTION: Developer */}
              {showDeveloperOptions && (
                <>
                  {sectionHeader('settings.section-developer')}
                  <View style={{ width: '100%', marginBottom: 20 }}>
                    <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                      <BoldText>
                        {translate('settings.performancelevel-title') as string}
                      </BoldText>
                    </View>

                    <View style={{ marginLeft: 40, marginRight: 25 }}>
                      {optionsRadio(
                        PERFORMANCELEVELMENU,
                        setPerformanceLevel as React.Dispatch<
                          React.SetStateAction<string | boolean>
                        >,
                        String,
                        performanceLevel,
                        'performancelevel',
                      )}
                    </View>
                    {!!lastError && (
                      <>
                        <View
                          style={{ marginHorizontal: 25, marginVertical: 15 }}
                        >
                          <BoldText>{'LAST ERROR'}</BoldText>
                        </View>

                        <View style={{ marginLeft: 40, marginRight: 25 }}>
                          <Button
                            type={ButtonTypeEnum.Primary}
                            title={translate('view-error') as string}
                            onPress={() => {
                              reportError(lastError);
                            }}
                            twoButtons={true}
                          />
                        </View>
                      </>
                    )}
                    {hasWalletBackup && (
                      <>
                        <View
                          style={{ marginHorizontal: 25, marginVertical: 15 }}
                        >
                          <BoldText>
                            {
                              translate(
                                'loadedapp.restorebackupwallet',
                              ) as string
                            }
                          </BoldText>
                        </View>

                        <View style={{ marginLeft: 40, marginRight: 25 }}>
                          <Button
                            testID="settings.restorebackupwallet"
                            type={ButtonTypeEnum.Secondary}
                            title={translate('walletseed.go-backup') as string}
                            onPress={() => {
                              if (readOnly) {
                                navigation.navigate(RouteEnum.Ufvk, {
                                  action: UfvkActionEnum.backup,
                                });
                              } else {
                                navigation.navigate(RouteEnum.WalletSeed, {
                                  action: 'backup',
                                });
                              }
                            }}
                            twoButtons={true}
                          />
                        </View>
                      </>
                    )}
                  </View>
                </>
              )}
            </BottomSheetScrollView>
          </AppSheet>
        </Animated.View>
      </View>
      <SelectBottomSheet
        ref={languageSelectRef}
        title={translate('settings.select-language-placeholder') as string}
        items={LANGUAGES.map(l => ({
          label: translate(`settings.value-language-${l.value}`) as string,
          value: l.value,
        }))}
        value={language}
        onChange={v => setLanguage(v as LanguageEnum)}
      />
      <SelectBottomSheet
        ref={blockExplorerSelectRef}
        title={translate('settings.select-blockexplorer-placeholder') as string}
        items={BLOCKEXPLORERMENU.map(b => ({
          label: translate(`settings.value-blockexplorer-${b.value}`) as string,
          value: b.value,
        }))}
        value={blockExplorer}
        onChange={v => setBlockExplorer(v as BlockExplorerEnum)}
      />
    </KeyboardAvoidingView>
  );
};

export default Settings;
