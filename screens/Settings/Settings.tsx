/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Pressable from '@ui/primitives/Pressable';
import {
  View,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
  Pressable as RNPressable,
  ScrollView,
} from 'react-native';

import {
  iconSizeMd,
  rowMinHeight,
  space4,
  space8,
  space12,
  space16,
  space20,
  space24,
  useTheme,
} from '@app/theme';

import Text from '@ui/primitives/Text';
import Card from '@ui/widgets/Card';
import Button from '@ui/primitives/Button';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';

import Header from '@ui/widgets/Header';
import {
  LanguageEnum,
  GlobalConst,
  Route,
  BlockExplorerEnum,
  ChainNameEnum,
} from '@app/AppState';
import { fetchWallet, walletBackupExists } from '@app/walletBackend';
import {
  DeviceSecurityProbe,
  probeDeviceSecurity,
} from '@app/services/gateController';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import SelectBottomSheet from '@ui/widgets/SelectBottomSheet';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import {
  RecoveryInfoSaveResult,
  hasRecoveryWalletInfo,
  saveRecoveryWalletInfo,
} from '@app/services/recoveryWalletInfo';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CommonActions,
  NavigationAction,
  usePreventRemove,
} from '@react-navigation/native';
import { createAlert } from '@app/services/createAlert';
import { showConfirm } from '@app/services/showConfirm';
import { sendEmail } from '@app/services/sendEmail';
import SaveSheet from '@ui/widgets/SaveSheet';
import Switch from '@ui/primitives/Switch';
import { ChevronRight } from '@ui/primitives/Icons/Chevron';
import { RadioOffIcon } from '@ui/primitives/Icons/RadioOffIcon';
import { RadioOnIcon } from '@ui/primitives/Icons/RadioOnIcon';

type Options = {
  value: string;
  text: string;
};

type SettingName =
  'language' | 'privacy' | 'biometrics' | 'performance' | 'blockexplorer';

const fill = (text: string, values: Record<string, string>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), text);

type SettingsProps = NativeStackScreenProps<AppDrawerParamList, 'Settings'>;

const Settings: React.FunctionComponent<SettingsProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const {
    setLanguageOption,
    setBiometricsOption,
    setPerformanceLevelOption,
    setBlockExplorerOption,
    restoreBackup,
    translate,
    language: languageContext,
    privacy: privacyContext,
    addLastSnackbar,
    biometrics: biometricsContext,
    mixnetView,
    performanceLevel: performanceLevelContext,
    blockExplorer: blockExplorerContext,
    readOnly,
    server,
    walletChainName,
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
  // Backups only ever held mainnet wallets, and only a mainnet wallet is
  // backed up: any other wallet is replaced by the backup and lost.
  const openNet =
    walletChainName !== ChainNameEnum.noneChainName
      ? walletChainName
      : server.chainName;
  const backupReplaces = openNet !== ChainNameEnum.mainChainName;
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
  // wallet change. Swapping it back in stays here for whoever has one.
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

  // Each local value against the one the context holds. A saved change
  // drops out, and the guard below lets the screen go.
  const edited: SettingName[] = (
    [
      ['language', languageContext !== language],
      ['privacy', privacyContext !== privacy],
      ['biometrics', biometricsContext !== biometrics],
      ['performance', performanceLevelContext !== performanceLevel],
      ['blockexplorer', blockExplorerContext !== blockExplorer],
    ] as const
  )
    .filter(([, changed]) => changed)
    .map(([name]) => name);
  const unsaved = edited.length > 0;

  // Names one or two edits and counts more, then says what leaving keeps.
  const unsavedBody = (): string => {
    const names = edited.map(
      name => translate(`settings.unsaved-name-${name}`) as string,
    );
    const changes =
      names.length === 1
        ? fill(translate('settings.unsaved-one') as string, { a: names[0] })
        : names.length === 2
          ? fill(translate('settings.unsaved-two') as string, {
              a: names[0],
              b: names[1],
            })
          : fill(translate('settings.unsaved-many') as string, {
              count: String(names.length),
            });
    return `${changes} ${translate('settings.unsaved-keeps') as string}`;
  };

  // Where leaving goes. Settings is always pushed over the home; the
  // fallback keeps a screen opened any other way from going nowhere.
  const exitAction = (): NavigationAction =>
    navigation.canGoBack()
      ? CommonActions.goBack()
      : CommonActions.navigate(Route.Home);

  // The exit the user has agreed to, dispatched by the effect below once
  // the guard is down. State rather than a ref: the render that lowers the
  // guard has to land before the action goes out, or `beforeRemove` holds
  // the same action back a second time and the question repeats.
  const [leaving, setLeaving] = useState<NavigationAction>();
  // The exit the guard held back while the sheet asks about it.
  const [held, setHeld] = useState<NavigationAction>();
  useEffect(() => {
    if (leaving) {
      navigation.dispatch(leaving);
    }
  }, [leaving, navigation]);

  // Writes the edits and says whether the screen may leave now. Kept apart
  // from the navigation so the guard can persist first and then dispatch
  // the very action it held back.
  const persistSettings = async (): Promise<boolean> => {
    // ───────────────────────────────────────────────────────────────
    // Phase 1: Validate up-front (no I/O yet — purely synchronous guards).
    // ───────────────────────────────────────────────────────────────
    if (!unsaved) {
      addLastSnackbar(translate('settings.nochanges') as string);
      return false;
    }
    if (!language) {
      addLastSnackbar(translate('settings.islanguage') as string);
      return false;
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
      return false;
    }
    setDisabled(false);
    return true;
  };

  // The Save button: write the edits, then pop back to the screen behind.
  const saveSettings = async () => {
    if (await persistSettings()) {
      setLeaving(exitAction());
    }
  };
  saveSettingsRef.current = saveSettings;

  // The back arrow, Android's back and iOS's edge swipe all end in the
  // save sheet while an edit is unsaved. A second back with the sheet up
  // closes it.
  usePreventRemove(unsaved && !leaving, ({ data }) => {
    setHeld(current => (current ? undefined : data.action));
  });

  const keepEditing = () => setHeld(undefined);

  const discardEdits = () => {
    setHeld(undefined);
    setLeaving(held);
  };

  // A failed save keeps the screen open with its error.
  const saveAndLeave = async () => {
    const exit = held;
    setHeld(undefined);
    if (await persistSettings()) {
      setLeaving(exit);
    }
  };

  // `goBack()` pops Settings off the stack — using `navigate(Home)`
  // would push Home on top while leaving the already-authenticated
  // Settings instance alive in the stack, allowing a back gesture to
  // bypass the biometric gate.
  const navigateToHome = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Route.Home);
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
        <View key={'view-' + item.value}>
          <View style={{ justifyContent: 'center', minHeight: rowMinHeight }}>
            <InfoTooltip
              testID={`settings.${infoSection}-info`}
              label={
                translate(`settings.value-${label}-${item.value}`) as string
              }
              text={item.text}
              open={openInfoSection === infoSection}
              onToggle={open => setOpenInfoSection(open ? infoSection : null)}
              alignStart
            >
              <Pressable
                kind="row"
                testID={`settings.${label}-${item.value}`}
                disabled={disabled}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => setOption(typeOption(item.value))}
              >
                {typeOption(item.value) === valueOption ? (
                  <RadioOnIcon size={iconSizeMd} color={colors.fgAccent} />
                ) : (
                  <RadioOffIcon size={iconSizeMd} color={colors.fgMuted} />
                )}
                <Text variant="body" style={{ marginLeft: space12 }}>
                  {translate(`settings.value-${label}-${item.value}`) as string}
                </Text>
              </Pressable>
            </InfoTooltip>
          </View>
        </View>
      );
    });
  };

  const languageSelectRef = useRef<BottomSheetModal>(null);
  const blockExplorerSelectRef = useRef<BottomSheetModal>(null);
  useDismissSheetsOnBlur();

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

  /** A section: its label over one card that holds its rows. */
  const section = (key: string, rows: React.ReactNode) => (
    <View style={{ marginHorizontal: space20, marginTop: space24 }}>
      <Text
        variant="caption"
        tone="muted"
        style={{
          fontWeight: '600',
          textTransform: 'uppercase',
          marginBottom: space8,
        }}
      >
        {translate(key) as string}
      </Text>
      <Card flush>{rows}</Card>
    </View>
  );
  /** A row of a section's card: 56 tall, the hairline above all but the first. */
  const rowStyle = (first: boolean) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    minHeight: rowMinHeight,
    paddingHorizontal: space16,
    paddingVertical: space8,
    borderTopWidth: first ? 0 : 1,
    borderTopColor: colors.borderSubtle,
  });

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
          paddingTop: 4,
        }}
      >
        <Header
          title={translate('settings.title') as string}
          closeScreen={() => {
            if (!disabled) {
              navigateToHome();
            }
          }}
          backTestID="settings.back"
          backAccessibilityLabel={translate('settings.back-acc') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
        />
        <ScrollView
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
            paddingBottom: space20,
          }}
          onScrollBeginDrag={() => setOpenInfoSection(null)}
        >
          {/* An open tip closes on a tap anywhere else. */}
          {!!openInfoSection && (
            <RNPressable
              onPress={() => setOpenInfoSection(null)}
              style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
            />
          )}
          {/* SECTION: Preferences */}
          {section(
            'settings.section-preferences',
            <Pressable
              kind="row"
              disabled={disabled}
              onPress={() => languageSelectRef.current?.present()}
              style={rowStyle(true)}
            >
              <Text variant="bodyStrong">
                {translate('settings.language-title') as string}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  variant="body"
                  tone="muted"
                  style={{ marginRight: space4 }}
                >
                  {translate(`settings.value-language-${language}`) as string}
                </Text>
                <ChevronRight size={iconSizeMd} color={colors.fgMuted} />
              </View>
            </Pressable>,
          )}

          {/* SECTION: Privacy & Security */}
          {section(
            'settings.section-privacysecurity',
            <>
              <View style={rowStyle(true)}>
                <View style={{ flex: 1 }}>
                  <InfoTooltip
                    testID="settings.privacy-info"
                    label={translate('settings.privacy-title') as string}
                    text={
                      PRIVACYS.find(d => String(d.value) === 'true')?.text ?? ''
                    }
                    open={openInfoSection === 'privacy'}
                    onToggle={open =>
                      setOpenInfoSection(open ? 'privacy' : null)
                    }
                    alignStart
                  >
                    {/* A long press on the title opens the developer
                          options. */}
                    <Pressable
                      kind="row"
                      onLongPress={() => setShowDeveloperOptions(true)}
                    >
                      <Text variant="bodyStrong">
                        {translate('settings.privacy-title') as string}
                      </Text>
                    </Pressable>
                  </InfoTooltip>
                </View>
                <Switch
                  testID="settings.privacy"
                  value={privacy}
                  onValueChange={next => setPrivacy(next)}
                  accessibilityLabel={
                    translate('settings.privacy-title') as string
                  }
                />
              </View>

              <View
                style={[
                  rowStyle(false),
                  {
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'center',
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text variant="bodyStrong" testID="settings.securitytitle">
                    {translate('settings.security-title') as string}
                  </Text>
                  <Switch
                    testID="settings.biometrics"
                    value={biometrics}
                    disabled={disabled}
                    onValueChange={next => setBiometrics(next)}
                    accessibilityLabel={
                      translate('settings.security-title') as string
                    }
                  />
                </View>
                {deviceSecurity.kind === 'insecure' && (
                  <Text
                    variant="bodySmall"
                    tone="muted"
                    style={{ marginTop: space4 }}
                  >
                    {
                      translate(
                        'settings.security-device-locked-hint',
                      ) as string
                    }
                  </Text>
                )}
              </View>
            </>,
          )}

          {/* SECTION: Network & Advanced */}
          {section(
            'settings.section-networkadvanced',
            <>
              {/* Nym is no longer a choice: every transmission travels the
                  mixnet. The row is left as the way into the diagnostics,
                  and its green says the network is the one carrying the
                  wallet's traffic. */}
              {mixnetView.kind === 'transport' && (
                <Pressable
                  kind="row"
                  testID="settings.mixnet"
                  onPress={() => navigation.navigate(Route.MixnetDoctor)}
                  style={rowStyle(true)}
                >
                  <Text variant="bodyStrong" color={colors.fgNym}>
                    {translate('settings.nym-network') as string}
                  </Text>
                  <ChevronRight size={iconSizeMd} color={colors.fgMuted} />
                </Pressable>
              )}

              <Pressable
                kind="row"
                disabled={disabled}
                onPress={() => blockExplorerSelectRef.current?.present()}
                style={rowStyle(mixnetView.kind !== 'transport')}
              >
                <Text variant="bodyStrong">
                  {translate('settings.blockexplorer-title') as string}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    variant="body"
                    tone="muted"
                    style={{ marginRight: space4 }}
                  >
                    {
                      translate(
                        `settings.value-blockexplorer-${blockExplorer}`,
                      ) as string
                    }
                  </Text>
                  <ChevronRight size={iconSizeMd} color={colors.fgMuted} />
                </View>
              </Pressable>
            </>,
          )}

          {/* SECTION: Other */}
          {section(
            'settings.section-other',
            <Pressable
              kind="row"
              testID="settings.about"
              disabled={disabled}
              onPress={() => navigation.navigate(Route.About)}
              style={rowStyle(true)}
            >
              <Text variant="bodyStrong">
                {translate('loadedapp.about') as string}
              </Text>
              <ChevronRight size={iconSizeMd} color={colors.fgMuted} />
            </Pressable>,
          )}

          {(!recoveryInfoStored || recoveryInfoSave) && (
            <View style={{ marginHorizontal: space20, marginTop: space16 }}>
              {!recoveryInfoStored && (
                <Pressable
                  kind="link"
                  testID="settings.recoveryinfo.save"
                  disabled={savingRecoveryInfo}
                  onPress={saveRecoveryInfoNow}
                  accessibilityRole="button"
                >
                  <Text
                    variant="caption"
                    tone="warning"
                    style={{
                      textAlign: 'center',
                      fontWeight: '700',
                      textDecorationLine: 'underline',
                    }}
                  >
                    {
                      translate(
                        `settings.recoveryinfo-notstored-${keyKind}`,
                      ) as string
                    }
                  </Text>
                </Pressable>
              )}
              {(savingRecoveryInfo || recoveryInfoSave) && (
                <Text
                  testID="settings.recoveryinfo.result"
                  variant="bodySmall"
                  selectable
                  style={{
                    marginTop: recoveryInfoStored ? 0 : space8,
                    textAlign: 'center',
                    color: savingRecoveryInfo
                      ? colors.fgMuted
                      : recoveryInfoSave?.kind === 'saved'
                        ? colors.fgAccent
                        : colors.fgDanger,
                  }}
                >
                  {recoveryInfoSaveText()}
                </Text>
              )}
            </View>
          )}

          {/* SECTION: Developer */}
          {showDeveloperOptions && (
            <>
              {section(
                'settings.section-developer',
                <View
                  style={{ paddingHorizontal: space16, paddingTop: space12 }}
                >
                  <Text variant="bodyStrong">
                    {translate('settings.performancelevel-title') as string}
                  </Text>
                  {optionsRadio(
                    PERFORMANCELEVELMENU,
                    setPerformanceLevel as React.Dispatch<
                      React.SetStateAction<string | boolean>
                    >,
                    String,
                    performanceLevel,
                    'performancelevel',
                  )}
                </View>,
              )}
              <View
                style={{ marginHorizontal: space20, marginBottom: space20 }}
              >
                {!!lastError && (
                  <>
                    <Text
                      variant="bodyStrong"
                      style={{ marginTop: space16, marginBottom: space8 }}
                    >
                      {'LAST ERROR'}
                    </Text>

                    <View>
                      <Button
                        variant="primary"
                        title={translate('view-error') as string}
                        onPress={() => {
                          reportError(lastError);
                        }}
                      />
                    </View>
                  </>
                )}
                {hasWalletBackup && (
                  <>
                    <Text
                      variant="bodyStrong"
                      style={{ marginTop: space16, marginBottom: space8 }}
                    >
                      {translate('loadedapp.restorebackupwallet') as string}
                    </Text>

                    <View>
                      <Button
                        testID="settings.restorebackupwallet"
                        variant="text"
                        title={translate('settings.restorebackup') as string}
                        onPress={() =>
                          showConfirm({
                            title: translate(
                              'loadedapp.restorebackupwallet',
                            ) as string,
                            message: backupReplaces
                              ? (
                                  translate(
                                    readOnly
                                      ? 'settings.restorebackup-replace-vo'
                                      : 'settings.restorebackup-replace',
                                  ) as string
                                ).replace(
                                  '{net}',
                                  translate(
                                    `settings.value-chainname-${openNet}`,
                                  ) as string,
                                )
                              : (translate(
                                  'settings.restorebackup-warning',
                                ) as string),
                            buttons: [
                              {
                                text: translate(
                                  backupReplaces
                                    ? 'settings.restorebackup-switch'
                                    : 'confirm',
                                ) as string,
                                onPress: restoreBackup,
                              },
                              {
                                text: translate('cancel') as string,
                                style: 'cancel',
                              },
                            ],
                          })
                        }
                      />
                    </View>
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
        <View
          style={{
            paddingHorizontal: space20,
            paddingTop: space12,
            paddingBottom: space24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            testID="settings.button.save"
            disabled={disabled || disabledButton}
            variant="primary"
            title={translate('settings.save') as string}
            onPress={() => {
              setTimeout(async () => {
                await saveSettingsRef.current();
                Keyboard.dismiss();
              }, 100);
            }}
          />
        </View>
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
      {held && (
        <SaveSheet
          testID="settings.unsaved"
          title={translate('settings.unsaved-title') as string}
          body={unsavedBody()}
          saveLabel={translate('server.save') as string}
          discardLabel={translate('server.dont-save') as string}
          keepLabel={translate('server.keep-editing') as string}
          onSave={saveAndLeave}
          onDiscard={discardEdits}
          onKeep={keepEditing}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default Settings;
