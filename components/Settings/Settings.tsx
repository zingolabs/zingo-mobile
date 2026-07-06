/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useOptionsPanelSheetSlide } from '../../app/hooks/useOptionsPanelSheetSlide';

import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  IconDefinition,
  faDotCircle,
  faChevronLeft,
  faChevronRight,
  faInfoCircle,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import { checkServerURI, parseServerURI, serverUris } from '../../app/uris';
import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';

import Header from '../Header';
import {
  LanguageEnum,
  SecurityType,
  SeedActionEnum,
  ServerType,
  ServerUrisType,
  SetServerResult,
  UfvkActionEnum,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  ButtonTypeEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
  BlockExplorerEnum,
} from '../../app/AppState';
import { isEqual } from 'lodash';
import ChainTypeToggle from '../Components/ChainTypeToggle';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import { hasDeviceSecurity } from '../../app/simpleBiometrics';
import { useBiometricGate } from '../../app/hooks/useBiometricGate';
import SelectBottomSheet from '../Components/SelectBottomSheet';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { hasRecoveryWalletInfo } from '../../app/recoveryWalletInfo';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';
import { useKeyboardHeight } from '../../app/hooks/useKeyboardHeight';
import { useDismissSheetsOnBlur } from '../../app/hooks/useDismissSheetsOnBlur';
import { RPCPerformanceLevelEnum } from '../../app/walletBackend/enums/RPCPerformanceLevelEnum';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createAlert } from '../../app/createAlert';
import { sendEmail } from '../../app/sendEmail';
import NymOn from '../../assets/img/nym-on.svg';
import NymOff from '../../assets/img/nym-off.svg';
import NymSwitchOn from '../../assets/img/nym-switch-on.svg';
import SwitchOff from '../../assets/img/switch-off.svg';
import SettingSwitchOn from '../../assets/img/setting-switch-on.svg';

type SettingsProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Settings
> & {
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<SetServerResult>;
  setCurrencyOption: (value: CurrencyEnum) => Promise<void>;
  setLanguageOption: (value: LanguageEnum) => Promise<void>;
  setSendAllOption: (value: boolean) => Promise<void>;
  setDonationOption: (value: boolean) => Promise<void>;
  setSecurityOption: (value: SecurityType) => Promise<void>;
  setSelectServerOption: (value: string) => Promise<void>;
  setRescanMenuOption: (value: boolean) => Promise<void>;
  setRecoveryWalletInfoOnDeviceOption: (value: boolean) => Promise<void>;
  setPerformanceLevelOption: (value: RPCPerformanceLevelEnum) => Promise<void>;
  setBlockExplorerOption: (value: BlockExplorerEnum) => Promise<void>;
  setNymOption: (value: boolean) => Promise<void>;
  toggleMenuDrawer: () => void;
};

type Options = {
  value: string;
  text: string;
};

const Settings: React.FunctionComponent<SettingsProps> = ({
  navigation,
  setServerOption,
  setCurrencyOption,
  setLanguageOption,
  setSendAllOption,
  setDonationOption,
  setSecurityOption,
  setSelectServerOption,
  setRescanMenuOption,
  setRecoveryWalletInfoOnDeviceOption,
  setPerformanceLevelOption,
  setBlockExplorerOption,
  setNymOption,
  toggleMenuDrawer,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    info,
    server: serverContext,
    currency: currencyContext,
    language: languageContext,
    sendAll: sendAllContext,
    donation: donationContext,
    privacy: privacyContext,
    mode,
    netInfo,
    addLastSnackbar,
    security: securityContext,
    selectServer: selectServerContext,
    rescanMenu: rescanMenuContext,
    recoveryWalletInfoOnDevice: recoveryWalletInfoOnDeviceContext,
    performanceLevel: performanceLevelContext,
    blockExplorer: blockExplorerContext,
    nym: nymContext,
    foregroundEpoch,
    readOnly,
    setPrivacyOption,
    setBackgroundError,
    zingolibVersion,
    lastError,
    setLastError,
  } = context;

  const currenciesArray = translate('settings.currencies');
  let CURRENCIES: Options[] = [];
  if (typeof currenciesArray === 'object') {
    CURRENCIES = currenciesArray as Options[];
  }

  const languagesArray = translate('settings.languages');
  let LANGUAGES: Options[] = [];
  if (typeof languagesArray === 'object') {
    LANGUAGES = languagesArray as Options[];
  }

  const donationsArray = translate('settings.donations');
  let DONATIONS: Options[] = [];
  if (typeof donationsArray === 'object') {
    DONATIONS = donationsArray as Options[];
  }

  const sendAllsArray = translate('settings.sendalls');
  let SENDALLS: Options[] = [];
  if (typeof sendAllsArray === 'object') {
    SENDALLS = sendAllsArray as Options[];
  }

  const privacysArray = translate('settings.privacys');
  let PRIVACYS: Options[] = [];
  if (typeof privacysArray === 'object') {
    PRIVACYS = privacysArray as Options[];
  }

  const rescanMenusArray = translate('settings.rescanmenus');
  let RESCANMENU: Options[] = [];
  if (typeof rescanMenusArray === 'object') {
    RESCANMENU = rescanMenusArray as Options[];
  }

  const recoveryWalletInfoOnDevicesArray = translate(
    'settings.recoverywalletinfoondevices',
  );
  let RECOVERYWALLETINFOONDEVICE: Options[] = [];
  if (typeof recoveryWalletInfoOnDevicesArray === 'object') {
    RECOVERYWALLETINFOONDEVICE = recoveryWalletInfoOnDevicesArray as Options[];
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

  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Settings;

  // Audit Issue D — single source of truth for security.settingsScreen.
  const authPassed = useBiometricGate({
    needsAuth: !!securityContext.settingsScreen,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
    foregroundAppEnabled: !!securityContext.foregroundApp,
    foregroundEpoch,
  });

  const [autoServerUri, setAutoServerUri] = useState<string>('');
  const [autoServerChainName, setAutoServerChainName] = useState<string>('');
  const [listServerUri, setListServerUri] = useState<string>('');
  const [listServerChainName, setListServerChainName] = useState<string>('');
  const [customServerUri, setCustomServerUri] = useState<string>('');
  const [customServerChainName, setCustomServerChainName] =
    useState<string>('');
  const [itemsPicker, setItemsPicker] = useState<
    { label: string; value: string }[]
  >([]);
  const [currency, setCurrency] = useState<CurrencyEnum>(currencyContext);
  const [language, setLanguage] = useState<LanguageEnum>(languageContext);
  const [sendAll, setSendAll] = useState<boolean>(sendAllContext);
  const [donation, setDonation] = useState<boolean>(donationContext);
  const [privacy, setPrivacy] = useState<boolean>(privacyContext);
  // security checks box.
  const [startApp, setStartApp] = useState<boolean>(securityContext.startApp);
  const [foregroundApp, setForegroundApp] = useState<boolean>(
    securityContext.foregroundApp,
  );
  const [sendConfirm, setSendConfirm] = useState<boolean>(
    securityContext.sendConfirm,
  );
  const [seedUfvkScreen, setSeedUfvkScreen] = useState<boolean>(
    securityContext.seedUfvkScreen,
  );
  const [rescanScreen, setRescanScreen] = useState<boolean>(
    securityContext.rescanScreen,
  );
  const [settingsScreen, setSettingsScreen] = useState<boolean>(
    securityContext.settingsScreen,
  );
  const [changeWalletScreen, setChangeWalletScreen] = useState<boolean>(
    securityContext.changeWalletScreen,
  );
  const [restoreWalletBackupScreen, setRestoreWalletBackupScreen] =
    useState<boolean>(securityContext.restoreWalletBackupScreen);
  const [selectServer, setSelectServer] =
    useState<SelectServerEnum>(selectServerContext);
  const [rescanMenu, setRescanMenu] = useState<boolean>(rescanMenuContext);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] =
    useState<boolean>(recoveryWalletInfoOnDeviceContext);
  const [performanceLevel, setPerformanceLevel] =
    useState<RPCPerformanceLevelEnum>(performanceLevelContext);
  const [blockExplorer, setBlockExplorer] =
    useState<BlockExplorerEnum>(blockExplorerContext);
  const [nym, setNym] = useState<boolean>(nymContext);

  const [autoIcon, setAutoIcon] = useState<IconDefinition>(farCircle);
  const [listIcon, setListIcon] = useState<IconDefinition>(farCircle);
  const [customIcon, setCustomIcon] = useState<IconDefinition>(farCircle);
  const [offlineIcon, setOfflineIcon] = useState<IconDefinition>(farCircle);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [disabledButton, setDisabledButton] = useState<boolean>(false);
  const [hasRecoveryWalletInfoSaved, setHasRecoveryWalletInfoSaved] =
    useState<boolean>(false);
  const [storageRecoveryWalletInfo, setStorageRecoveryWalletInfo] =
    useState<string>('');
  const [showDeveloperOptions, setShowDeveloperOptions] =
    useState<boolean>(false);
  const [openInfoSection, setOpenInfoSection] = useState<string | null>(null);
  const [deviceHasSecurity, setDeviceHasSecurity] = useState<boolean>(true);

  // Bottom-sheet measurements — Settings has no balance area, so the sheet
  // uses a single snap at the maximum height (just below the screen Header).
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);

  // Label for the Server selector row — shows what the user currently has
  // configured (or "Offline"). The actual selection lives in a separate
  // BottomSheetModal so the row stays compact like other selectors.
  const currentServerLabel = useMemo(() => {
    switch (selectServer) {
      case SelectServerEnum.offline:
        return translate('settings.server-offline') as string;
      case SelectServerEnum.auto:
        return autoServerUri || (translate('settings.server-auto') as string);
      case SelectServerEnum.list:
        return listServerUri || (translate('settings.server-list') as string);
      case SelectServerEnum.custom:
        return (
          customServerUri || (translate('settings.server-custom') as string)
        );
      default:
        return translate('settings.server-offline') as string;
    }
  }, [selectServer, autoServerUri, listServerUri, customServerUri, translate]);

  // Selection mode (auto / list / custom / offline) shown on a small caption
  // line above the URL so the user can tell at a glance which mode is active
  // without opening the selector.
  const currentServerKindLabel = useMemo(() => {
    switch (selectServer) {
      case SelectServerEnum.offline:
        return translate('settings.server-offline') as string;
      case SelectServerEnum.auto:
        return translate('settings.server-auto') as string;
      case SelectServerEnum.list:
        return translate('settings.server-list') as string;
      case SelectServerEnum.custom:
        return translate('settings.server-custom') as string;
      default:
        return '';
    }
  }, [selectServer, translate]);

  // Custom server is the only selectable that requires user input — flag it
  // when either field is missing so the label can render red as a hint.
  const customServerIncomplete = useMemo(
    () =>
      selectServer === SelectServerEnum.custom &&
      (!customServerUri || !customServerChainName),
    [selectServer, customServerUri, customServerChainName],
  );

  const settingsSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  useEffect(() => {
    (async () => {
      setDeviceHasSecurity(await hasDeviceSecurity());
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (await hasRecoveryWalletInfo()) {
        setHasRecoveryWalletInfoSaved(true);
        setStorageRecoveryWalletInfo(
          Platform.OS === GlobalConst.platformOSios
            ? GlobalConst.keyChain
            : GlobalConst.keyStore,
        );
      } else {
        setHasRecoveryWalletInfoSaved(false);
      }
    })();
  }, [translate]);

  const setServer = () => {
    if (selectServerContext === SelectServerEnum.auto) {
      setAutoIcon(faDotCircle); // ->
      setListIcon(farCircle);
      setCustomIcon(farCircle);
      setOfflineIcon(farCircle);
      setAutoServerUri(serverContext.uri);
      setAutoServerChainName(serverContext.chainName);
    } else if (selectServerContext === SelectServerEnum.list) {
      setAutoIcon(farCircle);
      setListIcon(faDotCircle); // ->
      setCustomIcon(farCircle);
      setOfflineIcon(farCircle);
      setListServerUri(serverContext.uri);
      setListServerChainName(serverContext.chainName);
      // I have to update them in auto as well
      // with the same server
      setAutoServerUri(serverContext.uri);
      setAutoServerChainName(serverContext.chainName);
    } else if (selectServerContext === SelectServerEnum.custom) {
      setAutoIcon(farCircle);
      setListIcon(farCircle);
      setCustomIcon(faDotCircle); // ->
      setOfflineIcon(farCircle);
      setCustomServerUri(serverContext.uri);
      setCustomServerChainName(serverContext.chainName);
      // I have to update them in auto as well
      // with the first of the list
      setAutoServerUri(serverUris(translate)[0].uri);
      setAutoServerChainName(serverUris(translate)[0].chainName);
    } else if (selectServerContext === SelectServerEnum.offline) {
      setAutoIcon(farCircle);
      setListIcon(farCircle);
      setCustomIcon(farCircle);
      setOfflineIcon(faDotCircle); // ->
      // I have to update them in auto as well
      // with the first of the list
      setAutoServerUri(serverUris(translate)[0].uri);
      setAutoServerChainName(serverUris(translate)[0].chainName);
    }
  };

  useEffect(() => {
    setServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only the first time

  useEffect(() => {
    // avoiding obsolete ones
    const items = serverUris(translate)
      .filter((s: ServerUrisType) => !s.obsolete)
      .map((item: ServerUrisType) => ({
        label: (item.region ? item.region + ' ' : '') + item.uri,
        value: item.uri,
      }));
    setItemsPicker(items);
  }, [translate]);

  const securityObject: () => SecurityType = useCallback(() => {
    return {
      startApp,
      foregroundApp,
      sendConfirm,
      seedUfvkScreen,
      rescanScreen,
      settingsScreen,
      changeWalletScreen,
      restoreWalletBackupScreen,
    };
  }, [
    changeWalletScreen,
    foregroundApp,
    rescanScreen,
    restoreWalletBackupScreen,
    seedUfvkScreen,
    sendConfirm,
    settingsScreen,
    startApp,
  ]);

  useEffect(() => {
    let serverUriParsed = '';
    let chainNameParsed = '';
    if (selectServer === SelectServerEnum.auto) {
      serverUriParsed = autoServerUri;
      chainNameParsed = autoServerChainName;
    } else if (selectServer === SelectServerEnum.list) {
      serverUriParsed = listServerUri;
      chainNameParsed = listServerChainName;
    } else if (selectServer === SelectServerEnum.custom) {
      serverUriParsed = customServerUri;
      chainNameParsed = customServerChainName;
    } else if (selectServer === SelectServerEnum.offline) {
      serverUriParsed = '';
      chainNameParsed = ChainNameEnum.mainChainName;
    }
    if (
      serverContext.uri === serverUriParsed &&
      serverContext.chainName === chainNameParsed &&
      currencyContext === currency &&
      languageContext === language &&
      sendAllContext === sendAll &&
      donationContext === donation &&
      privacyContext === privacy &&
      isEqual(securityContext, securityObject()) &&
      selectServerContext === selectServer &&
      rescanMenuContext === rescanMenu &&
      recoveryWalletInfoOnDeviceContext === recoveryWalletInfoOnDevice &&
      performanceLevelContext === performanceLevel &&
      blockExplorerContext === blockExplorer &&
      nymContext === nym
    ) {
      setDisabledButton(true);
    } else {
      setDisabledButton(false);
    }
  }, [
    autoServerChainName,
    autoServerUri,
    currency,
    currencyContext,
    customServerChainName,
    customServerUri,
    donation,
    donationContext,
    language,
    languageContext,
    listServerChainName,
    listServerUri,
    privacy,
    privacyContext,
    recoveryWalletInfoOnDevice,
    recoveryWalletInfoOnDeviceContext,
    rescanMenu,
    rescanMenuContext,
    performanceLevel,
    performanceLevelContext,
    blockExplorer,
    blockExplorerContext,
    nym,
    nymContext,
    securityContext,
    selectServer,
    selectServerContext,
    sendAll,
    sendAllContext,
    serverContext.chainName,
    serverContext.uri,
    securityObject,
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
    // Phase 1: Resolve the target server URI/chain from the picker mode
    // and validate up-front (no I/O yet — purely synchronous guards).
    // ───────────────────────────────────────────────────────────────
    let serverUriParsed = '';
    let chainNameParsed = '';
    if (selectServer === SelectServerEnum.auto) {
      serverUriParsed = autoServerUri;
      chainNameParsed = autoServerChainName;
    } else if (selectServer === SelectServerEnum.list) {
      serverUriParsed = listServerUri;
      chainNameParsed = listServerChainName;
    } else if (selectServer === SelectServerEnum.custom) {
      serverUriParsed = customServerUri;
      chainNameParsed = customServerChainName;
    } else if (selectServer === SelectServerEnum.offline) {
      serverUriParsed = '';
      chainNameParsed = ChainNameEnum.mainChainName;
    }
    const chainName = serverContext.chainName;

    if (
      serverContext.uri === serverUriParsed &&
      serverContext.chainName === chainNameParsed &&
      currencyContext === currency &&
      languageContext === language &&
      sendAllContext === sendAll &&
      donationContext === donation &&
      privacyContext === privacy &&
      isEqual(securityContext, securityObject()) &&
      selectServerContext === selectServer &&
      rescanMenuContext === rescanMenu &&
      recoveryWalletInfoOnDeviceContext === recoveryWalletInfoOnDevice &&
      performanceLevelContext === performanceLevel &&
      blockExplorerContext === blockExplorer &&
      nymContext === nym
    ) {
      addLastSnackbar(translate('settings.nochanges') as string);
      return;
    }
    if (
      (!serverUriParsed || !chainNameParsed) &&
      selectServer !== SelectServerEnum.offline
    ) {
      addLastSnackbar(translate('settings.isserver') as string);
      return;
    }
    if (!language) {
      addLastSnackbar(translate('settings.islanguage') as string);
      return;
    }

    // ───────────────────────────────────────────────────────────────
    // Phase 2: If the URI changed, parse/canonicalize it. `parseServerURI`
    // also catches malformed strings (`http:/host` without the double
    // slash etc.) that url-parse silently accepts.
    // ───────────────────────────────────────────────────────────────
    if (
      serverContext.uri !== serverUriParsed &&
      selectServer !== SelectServerEnum.offline
    ) {
      const resultUri = parseServerURI(serverUriParsed, translate);
      if (resultUri && resultUri.toLowerCase().startsWith(GlobalConst.error)) {
        // Surface the parser's specific message (bad URI, plaintext
        // HTTP not allowed, etc.) instead of the generic "fill out a
        // valid Server URI" snackbar so the user can fix the input.
        addLastSnackbar(resultUri);
        return;
      }
      if (serverUriParsed !== resultUri) {
        serverUriParsed = resultUri;
        if (selectServer === SelectServerEnum.auto) {
          setAutoServerUri(serverUriParsed);
        } else if (selectServer === SelectServerEnum.list) {
          setListServerUri(serverUriParsed);
        } else if (selectServer === SelectServerEnum.custom) {
          setCustomServerUri(serverUriParsed);
        }
      }
    }
    if (
      (serverContext.uri !== serverUriParsed ||
        selectServerContext !== selectServer) &&
      !serverUriParsed &&
      selectServer !== SelectServerEnum.offline
    ) {
      addLastSnackbar(translate('settings.isuri') as string);
      return;
    }

    // ───────────────────────────────────────────────────────────────
    // Phase 3: If the server is changing, probe it via `checkServerURI`
    // first. We detect two distinct chain conditions:
    //   • newChainName ≠ chainNameParsed → user's toggle is lying about
    //     the chain. Abort the save, restore the previous server.
    //   • newChainName ≠ current chainName → the new server is on a
    //     different chain than the open wallet. We set
    //     `sameServerChainName = false`, which makes `setServerOption`
    //     return `chain-changed` so we can navigate to recovery.
    // ───────────────────────────────────────────────────────────────
    const serverChanged =
      serverContext.uri !== serverUriParsed ||
      serverContext.chainName !== chainNameParsed;
    let sameServerChainName = true;

    if (serverChanged) {
      if (
        !netInfo.isConnected &&
        !(
          selectServerContext !== SelectServerEnum.offline &&
          selectServer === SelectServerEnum.offline
        )
      ) {
        addLastSnackbar(translate('loadedapp.connection-error') as string);
        return;
      }
      setDisabled(true);
      if (serverUriParsed) {
        addLastSnackbar(translate('loadedapp.tryingnewserver') as string);
      }
      const { result, timeout, newChainName, errorDetail } =
        await checkServerURI(serverUriParsed, serverContext.uri);
      if (!result) {
        // Native/JS error string kept out of the user snackbar but logged so
        // it surfaces in `adb logcat` / Xcode console for diagnosis.
        console.log('checkServerURI failed:', errorDetail);
        if (timeout === true) {
          addLastSnackbar(
            translate('loadedapp.tryingnewserver-error') as string,
          );
        } else {
          addLastSnackbar(
            (translate('loadedapp.changeservernew-error') as string) +
              serverUriParsed,
          );
        }
        // Restore the previous server so the sync state stays consistent.
        await setServerOption(serverContext, selectServerContext, false, true);
        setDisabled(false);
        return;
      }
      if (newChainName && newChainName !== chainNameParsed) {
        addLastSnackbar(translate('loadedapp.serverchain-mismatch') as string);
        await setServerOption(serverContext, selectServerContext, false, true);
        setDisabled(false);
        return;
      }
      if (newChainName && newChainName !== chainName) {
        sameServerChainName = false;
        addLastSnackbar(translate('loadedapp.differentchain-error') as string);
      }
    }

    // ───────────────────────────────────────────────────────────────
    // Phase 4: Persist the "light" settings (AsyncStorage only, no
    // backend coordination). Wrapped in try/catch so a single failing
    // setter doesn't silently drop the rest.
    // ───────────────────────────────────────────────────────────────
    try {
      if (currencyContext !== currency) {
        await setCurrencyOption(currency);
      }
      if (sendAllContext !== sendAll) {
        await setSendAllOption(sendAll);
      }
      if (donationContext !== donation) {
        await setDonationOption(donation);
      }
      if (privacyContext !== privacy) {
        await setPrivacyOption(privacy);
      }
      if (!isEqual(securityContext, securityObject())) {
        await setSecurityOption(securityObject());
      }
      if (rescanMenuContext !== rescanMenu) {
        await setRescanMenuOption(rescanMenu);
      }
      if (recoveryWalletInfoOnDeviceContext !== recoveryWalletInfoOnDevice) {
        await setRecoveryWalletInfoOnDeviceOption(recoveryWalletInfoOnDevice);
        const saved = await hasRecoveryWalletInfo();
        setHasRecoveryWalletInfoSaved(saved);
        if (saved) {
          setStorageRecoveryWalletInfo(
            Platform.OS === GlobalConst.platformOSios
              ? GlobalConst.keyChain
              : GlobalConst.keyStore,
          );
        }
      }
      if (performanceLevelContext !== performanceLevel) {
        await setPerformanceLevelOption(performanceLevel);
      }
      if (blockExplorerContext !== blockExplorer) {
        await setBlockExplorerOption(blockExplorer);
      }
      if (nymContext !== nym) {
        await setNymOption(nym);
      }
      // Language: applied in place. Belongs with the light settings now
      // that the i18n update propagates without an app reset. Apply it
      // before phase 5 so any snackbar that surfaces during the server
      // switch already reads in the new locale.
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

    // ───────────────────────────────────────────────────────────────
    // Phase 5: Apply server / selectServer.
    //
    // If the server URI changed, `setServerOption` does the heavy lifting
    // (loadExistingWallet → writeSettings → state). It returns a tagged
    // result so we know whether to:
    //   • `ok`         → navigate back as usual.
    //   • `chain-changed` → navigate to Seed/Ufvk recovery. The library
    //     already restored the previous server and stashed the desired
    //     one in `newServer`/`newSelectServer` for the recovery screen.
    //   • `error`      → stay on Settings, snackbar already shown.
    // ───────────────────────────────────────────────────────────────
    try {
      if (serverChanged) {
        const result = await setServerOption(
          { uri: serverUriParsed, chainName: chainNameParsed } as ServerType,
          selectServer,
          true,
          sameServerChainName,
        );
        setDisabled(false);
        if (result.kind === 'error') {
          // Old server restored, snackbar already shown by setServerOption.
          return;
        }
        if (result.kind === 'chain-changed') {
          // The open wallet can't be used against the new chain — send the
          // user to Seed/Ufvk recovery so they can switch wallets or
          // cancel.
          if (readOnly) {
            navigation.navigate(RouteEnum.Ufvk, {
              action: UfvkActionEnum.server,
            });
          } else {
            navigation.navigate(RouteEnum.Seed, {
              action: SeedActionEnum.server,
            });
          }
          return;
        }
        // result.kind === 'ok' — fall through to the final goBack().
      } else {
        if (selectServerContext !== selectServer) {
          await setSelectServerOption(selectServer);
        }
        setDisabled(false);
      }
    } catch (e) {
      addLastSnackbar(
        `${translate('settings.save-error') as string}: ${(e as Error).message}`,
      );
      setDisabled(false);
      return;
    }

    // ───────────────────────────────────────────────────────────────
    // Phase 6: Done — pop back to the previous screen.
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
      setCurrency(currencyContext);
      setLanguage(languageContext);
      setDonation(donationContext);
      setPrivacy(privacyContext);
      setSendAll(sendAllContext);
      setRescanMenu(rescanMenuContext);
      setSelectServer(selectServerContext);
      setServer();
      setStartApp(securityContext.startApp);
      setForegroundApp(securityContext.foregroundApp);
      setSendConfirm(securityContext.sendConfirm);
      setSeedUfvkScreen(securityContext.seedUfvkScreen);
      setRescanScreen(securityContext.rescanScreen);
      setSettingsScreen(securityContext.settingsScreen);
      setChangeWalletScreen(securityContext.changeWalletScreen);
      setRestoreWalletBackupScreen(securityContext.restoreWalletBackupScreen);
      setRecoveryWalletInfoOnDevice(recoveryWalletInfoOnDeviceContext);
      setPerformanceLevel(performanceLevelContext);
      setBlockExplorer(blockExplorerContext);
      setNym(nymContext);
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
    return DATA.map(item => (
      <View key={'view-' + item.value}>
        <TouchableOpacity
          testID={`settings.${label}-${item.value}`}
          disabled={disabled}
          style={{
            marginRight: 10,
            marginBottom: 5,
            maxHeight: 50,
            minHeight: 48,
          }}
          onPress={() => setOption(typeOption(item.value))}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <FontAwesomeIcon
              icon={
                typeOption(item.value) === valueOption ? faDotCircle : farCircle
              }
              size={16}
              color={colors.border}
            />
            <RegText key={'text-' + item.value} style={{ marginLeft: 10 }}>
              {translate(`settings.value-${label}-${item.value}`) as string}
            </RegText>
          </View>
        </TouchableOpacity>
        <FadeText key={'fade-' + item.value}>{item.text}</FadeText>
      </View>
    ));
  };

  const onPressServerChainName = (chain: ChainNameEnum) => {
    setCustomServerChainName(chain);
  };

  const securityBottomSheetRef = useRef<BottomSheetModal>(null);
  const serverBottomSheetRef = useRef<BottomSheetModal>(null);
  const languageSelectRef = useRef<BottomSheetModal>(null);
  const blockExplorerSelectRef = useRef<BottomSheetModal>(null);
  const listServerSelectRef = useRef<BottomSheetModal>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const sheetSlideStyle = useOptionsPanelSheetSlide();
  const keyboardHeight = useKeyboardHeight();
  useDismissSheetsOnBlur();

  const renderSettingsHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
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
              color={colors.primary}
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
    ),
    [colors, disabled, navigateToHome, translate],
  );

  const renderSettingsFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bottomSheetBackground,
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

  const renderSecurityHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left spacer matches the X Pressable's width (14×2 + 20 = 48)
              so the title stays perfectly centered. The BoldText
              flex-fills the middle space so a long localized title can
              still ellipsize cleanly instead of being clipped. */}
          <View style={{ width: 48 }} />
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('settings.security-title') as string}
          </BoldText>
          <Pressable
            onPress={() => securityBottomSheetRef.current?.close()}
            hitSlop={8}
            style={{ paddingHorizontal: 14, paddingVertical: 4 }}
          >
            <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
          </Pressable>
        </View>
      </View>
    ),
    [colors, translate],
  );

  const renderServerHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left spacer matches the X Pressable's width (14×2 + 20 = 48)
              so the title stays perfectly centered. The BoldText
              flex-fills the middle space so a long localized title can
              still ellipsize cleanly instead of being clipped. */}
          <View style={{ width: 48 }} />
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('settings.server-title') as string}
          </BoldText>
          <Pressable
            onPress={() => serverBottomSheetRef.current?.close()}
            hitSlop={8}
            style={{ paddingHorizontal: 14, paddingVertical: 4 }}
          >
            <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
          </Pressable>
        </View>
      </View>
    ),
    [colors, translate],
  );

  const renderBackdropSecurity = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      pressBehavior="close"
    />
  );

  const allSecurityChecked =
    startApp &&
    foregroundApp &&
    sendConfirm &&
    seedUfvkScreen &&
    rescanScreen &&
    settingsScreen &&
    changeWalletScreen &&
    restoreWalletBackupScreen;
  const noneSecurityChecked =
    !startApp &&
    !foregroundApp &&
    !sendConfirm &&
    !seedUfvkScreen &&
    !rescanScreen &&
    !settingsScreen &&
    !changeWalletScreen &&
    !restoreWalletBackupScreen;
  const securityLabel = allSecurityChecked
    ? (translate('settings.security-all') as string)
    : noneSecurityChecked
      ? (translate('settings.security-none') as string)
      : (translate('settings.security-some') as string);

  const securityCheckBox = (
    value: boolean,
    setValue: React.Dispatch<React.SetStateAction<string | boolean>>,
    label: string,
  ) => {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: 20,
          marginRight: 10,
          marginBottom: 5,
          maxHeight: 50,
          minHeight: 48,
        }}
      >
        <BouncyCheckbox
          disabled={disabled}
          disableText
          isChecked={value}
          useBuiltInState={false}
          onPress={() => setValue(!value)}
          unFillColor={colors.card}
          fillColor={colors.primary}
          style={{
            marginRight: 10,
          }}
          innerIconStyle={{
            borderRadius: 5,
          }}
          iconStyle={{
            borderRadius: 5,
          }}
        />
        <RegText
          style={{
            marginTop: Platform.OS === GlobalConst.platformOSios ? 5 : 3,
          }}
        >
          {label}
        </RegText>
      </View>
    );
  };

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
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
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
        backgroundColor: colors.background,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
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
          <BottomSheet
            ref={settingsSheetRef}
            accessible={false}
            snapPoints={settingsSnapPoints}
            index={0}
            enableDynamicSizing={false}
            enablePanDownToClose={false}
            enableContentPanningGesture={false}
            keyboardBehavior={'interactive'}
            keyboardBlurBehavior={'restore'}
            android_keyboardInputMode={'adjustResize'}
            backgroundStyle={{
              backgroundColor: colors.bottomSheetBackground,
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
            }}
            handleComponent={renderSettingsHandle}
            footerComponent={renderSettingsFooter}
          >
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              testID="settings.scroll-view"
              bounces={false}
              alwaysBounceVertical={false}
              style={{
                flex: 1,
                backgroundColor: colors.bottomSheetBackground,
              }}
              contentContainerStyle={{
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                paddingBottom: 100,
              }}
            >
              {/* NYM feature hidden for now — will be enabled in the future */}
              {false && (
                <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                  <BoldText>
                    {translate('settings.nym-privacy-network') as string}
                  </BoldText>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 5,
                    }}
                  >
                    {nym ? (
                      <NymOn width={22} height={22} />
                    ) : (
                      <NymOff width={22} height={22} />
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <BoldText
                        style={{ color: nym ? '#07FF94' : colors.text }}
                      >
                        {translate('settings.nym-network') as string}
                      </BoldText>
                      <FadeText>
                        {translate('settings.nym-enhanced-privacy') as string}
                      </FadeText>
                    </View>
                    <TouchableOpacity onPress={() => setNym(!nym)}>
                      {nym ? (
                        <NymSwitchOn width={40} height={19} />
                      ) : (
                        <SwitchOff width={40} height={19} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

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
                        color: colors.zingo,
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
                      color={colors.zingo}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <BoldText>
                    {translate('settings.currency-title') as string}
                  </BoldText>
                  <TouchableOpacity
                    onPress={() =>
                      setOpenInfoSection(
                        openInfoSection === 'currency' ? null : 'currency',
                      )
                    }
                    style={{ marginLeft: 6 }}
                  >
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      size={14}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: 8,
                  }}
                >
                  {CURRENCIES.map(c => {
                    const selected = String(currency) === String(c.value);
                    return (
                      <TouchableOpacity
                        key={String(c.value)}
                        onPress={() =>
                          setCurrency(c.value as unknown as CurrencyEnum)
                        }
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          alignItems: 'center',
                          backgroundColor: selected
                            ? colors.primary
                            : 'transparent',
                          borderRadius: 8,
                          borderWidth: selected ? 1 : 0,
                          borderColor: colors.primary,
                        }}
                      >
                        <RegText
                          style={{
                            color: selected
                              ? colors.background
                              : colors.primary,
                            fontSize: 12,
                          }}
                        >
                          {
                            translate(
                              `settings.value-currency-${c.value}`,
                            ) as string
                          }
                        </RegText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {openInfoSection === 'currency' && (
                  <View
                    style={{
                      backgroundColor: '#040E1D',
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 8,
                    }}
                  >
                    <FadeText style={{ textAlign: 'center' }}>
                      {CURRENCIES.find(
                        d => String(d.value) === CurrencyEnum.USDCurrency,
                      )?.text ?? ''}
                    </FadeText>
                  </View>
                )}
              </View>

              {/* SECTION: Privacy & Security */}
              {mode !== ModeEnum.basic &&
                sectionHeader('settings.section-privacysecurity')}

              {mode !== ModeEnum.basic && (
                <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <BoldText>
                        {translate('settings.privacy-title') as string}
                      </BoldText>
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
                          color={colors.text}
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
              )}

              {mode !== ModeEnum.basic && (
                <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <TouchableOpacity
                        onLongPress={() => setShowDeveloperOptions(true)}
                      >
                        <BoldText>
                          {
                            translate(
                              'settings.recoverywalletinfoondevice-title',
                            ) as string
                          }
                        </BoldText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setOpenInfoSection(
                            openInfoSection === 'recovery' ? null : 'recovery',
                          )
                        }
                        style={{ marginLeft: 6 }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={14}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setRecoveryWalletInfoOnDevice(
                          !recoveryWalletInfoOnDevice,
                        )
                      }
                    >
                      {recoveryWalletInfoOnDevice ? (
                        <SettingSwitchOn width={40} height={19} />
                      ) : (
                        <SwitchOff width={40} height={19} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {openInfoSection === 'recovery' && (
                    <View
                      style={{
                        backgroundColor: '#040E1D',
                        borderRadius: 8,
                        padding: 10,
                        marginTop: 8,
                      }}
                    >
                      <FadeText style={{ textAlign: 'center' }}>
                        {RECOVERYWALLETINFOONDEVICE.find(
                          d => String(d.value) === 'true',
                        )?.text ?? ''}
                      </FadeText>
                      {hasRecoveryWalletInfoSaved && (
                        <FadeText
                          style={{
                            color: colors.primary,
                            textAlign: 'center',
                            marginTop: 6,
                          }}
                        >
                          {(translate('settings.walletkeyssaved') as string) +
                            (storageRecoveryWalletInfo
                              ? ' [' + storageRecoveryWalletInfo + ']'
                              : '')}
                        </FadeText>
                      )}
                    </View>
                  )}
                </View>
              )}

              {mode !== ModeEnum.basic && (
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
                      onPress={() => securityBottomSheetRef.current?.present()}
                    >
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <RegText
                          style={{
                            marginRight: 5,
                            fontWeight: '400',
                            color: colors.zingo,
                          }}
                        >
                          {securityLabel}
                        </RegText>
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          size={12}
                          color={colors.zingo}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                  {!deviceHasSecurity && (
                    <FadeText style={{ marginTop: 6 }}>
                      {
                        translate(
                          'settings.security-device-locked-hint',
                        ) as string
                      }
                    </FadeText>
                  )}
                </View>
              )}

              {/* SECTION: Network & Advanced */}
              {mode !== ModeEnum.basic &&
                sectionHeader('settings.section-networkadvanced')}

              {mode !== ModeEnum.basic && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: 25,
                    marginRight: 25,
                    marginVertical: 15,
                  }}
                >
                  <BoldText>
                    {translate('settings.server-title') as string}
                  </BoldText>
                  <TouchableOpacity
                    disabled={disabled}
                    onPress={() => serverBottomSheetRef.current?.present()}
                    style={{ flex: 1, marginLeft: 12 }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          alignItems: 'flex-end',
                          marginRight: 8,
                        }}
                      >
                        {selectServer !== SelectServerEnum.offline && (
                          <FadeText
                            numberOfLines={1}
                            style={{
                              fontSize: 11,
                              lineHeight: 13,
                              color: customServerIncomplete
                                ? colors.danger.primary
                                : colors.zingo,
                            }}
                          >
                            {currentServerKindLabel}
                          </FadeText>
                        )}
                        <RegText
                          numberOfLines={1}
                          ellipsizeMode="middle"
                          style={{
                            fontWeight: '400',
                            color: customServerIncomplete
                              ? colors.danger.primary
                              : colors.zingo,
                          }}
                        >
                          {currentServerLabel}
                        </RegText>
                      </View>
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        size={16}
                        color={
                          customServerIncomplete
                            ? colors.danger.primary
                            : colors.zingo
                        }
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {mode !== ModeEnum.basic && (
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
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <RegText
                        style={{
                          marginRight: 5,
                          fontWeight: '400',
                          color: colors.zingo,
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
                        color={colors.zingo}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {mode !== ModeEnum.basic && !readOnly && (
                <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <BoldText>
                        {translate('settings.sendall-title') as string}
                      </BoldText>
                      <TouchableOpacity
                        onPress={() =>
                          setOpenInfoSection(
                            openInfoSection === 'sendall' ? null : 'sendall',
                          )
                        }
                        style={{ marginLeft: 6 }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={14}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setSendAll(!sendAll)}>
                      {sendAll ? (
                        <SettingSwitchOn width={40} height={19} />
                      ) : (
                        <SwitchOff width={40} height={19} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {openInfoSection === 'sendall' && (
                    <View
                      style={{
                        backgroundColor: '#040E1D',
                        borderRadius: 8,
                        padding: 10,
                        marginTop: 8,
                      }}
                    >
                      <FadeText style={{ textAlign: 'center' }}>
                        {SENDALLS.find(d => String(d.value) === 'true')?.text ??
                          ''}
                      </FadeText>
                    </View>
                  )}
                </View>
              )}

              {mode !== ModeEnum.basic && (
                <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <BoldText>
                        {translate('settings.rescanmenu-title') as string}
                      </BoldText>
                      <TouchableOpacity
                        onPress={() =>
                          setOpenInfoSection(
                            openInfoSection === 'rescan' ? null : 'rescan',
                          )
                        }
                        style={{ marginLeft: 6 }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={14}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => setRescanMenu(!rescanMenu)}
                    >
                      {rescanMenu ? (
                        <SettingSwitchOn width={40} height={19} />
                      ) : (
                        <SwitchOff width={40} height={19} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {openInfoSection === 'rescan' && (
                    <View
                      style={{
                        backgroundColor: '#040E1D',
                        borderRadius: 8,
                        padding: 10,
                        marginTop: 8,
                      }}
                    >
                      <FadeText style={{ textAlign: 'center' }}>
                        {RESCANMENU.find(d => String(d.value) === 'true')
                          ?.text ?? ''}
                      </FadeText>
                    </View>
                  )}
                </View>
              )}

              {/* SECTION: Other */}
              {sectionHeader('settings.section-other')}

              {!readOnly && (
                <View style={{ marginHorizontal: 25, marginVertical: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <BoldText>
                        {translate('settings.donation-title') as string}
                      </BoldText>
                      <TouchableOpacity
                        onPress={() =>
                          setOpenInfoSection(
                            openInfoSection === 'donation' ? null : 'donation',
                          )
                        }
                        style={{ marginLeft: 6 }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={14}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setDonation(!donation)}>
                      {donation ? (
                        <SettingSwitchOn width={40} height={19} />
                      ) : (
                        <SwitchOff width={40} height={19} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {openInfoSection === 'donation' && (
                    <View
                      style={{
                        backgroundColor: '#040E1D',
                        borderRadius: 8,
                        padding: 10,
                        marginTop: 8,
                      }}
                    >
                      <FadeText style={{ textAlign: 'center' }}>
                        {DONATIONS.find(d => String(d.value) === 'true')
                          ?.text ?? ''}
                      </FadeText>
                    </View>
                  )}
                </View>
              )}

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
                  color={colors.zingo}
                />
              </TouchableOpacity>

              {/* SECTION: Developer */}
              {mode !== ModeEnum.basic && showDeveloperOptions && (
                <>
                  {sectionHeader('settings.section-developer')}
                  <View style={{ width: '100%', marginBottom: 20 }}>
                    <View style={{ display: 'flex', margin: 10 }}>
                      <BoldText>
                        {translate('settings.performancelevel-title') as string}
                      </BoldText>
                    </View>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
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
                        <View style={{ display: 'flex', margin: 10 }}>
                          <BoldText>{'LAST ERROR'}</BoldText>
                        </View>

                        <View style={{ display: 'flex', marginLeft: 25 }}>
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
                  </View>
                </>
              )}
            </BottomSheetScrollView>
          </BottomSheet>
        </Animated.View>
      </View>
      <BottomSheetModal
        ref={securityBottomSheetRef}
        enableDynamicSizing={true}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting a keyboard the sheet itself focuses later.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        handleComponent={renderSecurityHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdropSecurity}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingBottom: 30,
          }}
        >
          {securityCheckBox(
            startApp,
            setStartApp as React.Dispatch<
              React.SetStateAction<string | boolean>
            >,
            translate('settings.security-startapp') as string,
          )}
          {securityCheckBox(
            foregroundApp,
            setForegroundApp as React.Dispatch<
              React.SetStateAction<string | boolean>
            >,
            translate('settings.security-foregroundapp') as string,
          )}
          {securityCheckBox(
            sendConfirm,
            setSendConfirm as React.Dispatch<
              React.SetStateAction<string | boolean>
            >,
            translate('settings.security-sendconfirm') as string,
          )}
          {securityCheckBox(
            seedUfvkScreen,
            setSeedUfvkScreen as React.Dispatch<
              React.SetStateAction<string | boolean>
            >,
            readOnly
              ? (translate('settings.security-ufvkscreen') as string)
              : (translate('settings.security-seedscreen') as string),
          )}
          {securityCheckBox(
            rescanScreen,
            setRescanScreen as React.Dispatch<
              React.SetStateAction<string | boolean>
            >,
            translate('settings.security-rescanscreen') as string,
          )}
          {securityCheckBox(
            settingsScreen,
            setSettingsScreen as React.Dispatch<
              React.SetStateAction<string | boolean>
            >,
            translate('settings.security-settingsscreen') as string,
          )}
          {securityCheckBox(
            changeWalletScreen,
            setChangeWalletScreen as React.Dispatch<
              React.SetStateAction<string | boolean>
            >,
            translate('settings.security-changewalletscreen') as string,
          )}
          {securityCheckBox(
            restoreWalletBackupScreen,
            setRestoreWalletBackupScreen as React.Dispatch<
              React.SetStateAction<string | boolean>
            >,
            translate('settings.security-restorewalletbackupscreen') as string,
          )}
        </BottomSheetView>
      </BottomSheetModal>
      <BottomSheetModal
        ref={serverBottomSheetRef}
        enableDynamicSizing={true}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting the server field's own keyboard.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        handleComponent={renderServerHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdropSecurity}
      >
        <BottomSheetScrollView
          bounces={false}
          alwaysBounceVertical={false}
          style={{ backgroundColor: colors.bottomSheetBackground }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 10,
              backgroundColor: '#031124',
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: translate('info.serverversion') as string,
                value: info.version ? info.version : '-',
              },
              {
                label: translate('info.zainod') as string,
                value: info.serverUri ? info.serverUri : '-',
              },
              {
                label: translate('info.network') as string,
                value: !info.chainName
                  ? '-'
                  : info.chainName === ChainNameEnum.mainChainName
                    ? 'Mainnet'
                    : info.chainName === ChainNameEnum.testChainName
                      ? 'Testnet'
                      : info.chainName === ChainNameEnum.regtestChainName
                        ? 'Regtest'
                        : (translate('info.unknown') as string) +
                          ' (' +
                          info.chainName +
                          ')',
              },
              {
                label: translate('info.serverblock') as string,
                value: info.latestBlock ? info.latestBlock.toString() : '-',
              },
            ].map(row => (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 6,
                  gap: 12,
                }}
              >
                <FadeText>{row.label}</FadeText>
                <RegText
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  style={{ flexShrink: 1, textAlign: 'right' }}
                >
                  {row.value}
                </RegText>
              </View>
            ))}
          </View>

          <View>
            <TouchableOpacity
              testID="settings.offline-server"
              disabled={disabled}
              style={{
                marginRight: 10,
                marginBottom: 0,
                maxHeight: 50,
                minHeight: 48,
              }}
              onPress={() => {
                setOfflineIcon(faDotCircle);
                setAutoIcon(farCircle);
                setListIcon(farCircle);
                setCustomIcon(farCircle);
                setSelectServer(SelectServerEnum.offline);
              }}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                {offlineIcon && (
                  <FontAwesomeIcon
                    icon={offlineIcon}
                    size={16}
                    color={colors.border}
                  />
                )}
                <RegText style={{ marginLeft: 10 }}>
                  {translate('settings.server-offline') as string}
                </RegText>
                {offlineIcon === faDotCircle && (
                  <FadeText style={{ marginLeft: 10 }}>{''}</FadeText>
                )}
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ display: 'flex' }}>
            <FadeText>
              {translate('settings.server-offline-text') as string}
            </FadeText>
          </View>

          <View>
            <TouchableOpacity
              testID="settings.auto-server"
              disabled={disabled}
              style={{
                marginRight: 10,
                marginBottom: 0,
                maxHeight: 50,
                minHeight: 48,
              }}
              onPress={() => {
                setOfflineIcon(farCircle);
                setAutoIcon(faDotCircle);
                setListIcon(farCircle);
                setCustomIcon(farCircle);
                setSelectServer(SelectServerEnum.auto);
              }}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                {autoIcon && (
                  <FontAwesomeIcon
                    icon={autoIcon}
                    size={16}
                    color={colors.border}
                  />
                )}
                <RegText style={{ marginLeft: 10 }}>
                  {translate('settings.server-auto') as string}
                </RegText>
                {autoIcon === faDotCircle && (
                  <FadeText style={{ marginLeft: 10 }}>
                    {autoServerUri}
                  </FadeText>
                )}
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ display: 'flex' }}>
            <FadeText>
              {translate('settings.server-auto-text') as string}
            </FadeText>
          </View>

          <View>
            {!disabled && itemsPicker.length > 0 ? (
              <TouchableOpacity
                onPress={() => listServerSelectRef.current?.present()}
              >
                <View
                  style={{
                    marginRight: 10,
                    marginBottom: 5,
                    maxHeight: 50,
                    minHeight: 48,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {listIcon && (
                    <FontAwesomeIcon
                      icon={listIcon}
                      size={16}
                      color={colors.border}
                    />
                  )}
                  <RegText
                    testID="settings.list-server"
                    style={{ marginLeft: 10 }}
                  >
                    {translate('settings.server-list') as string}
                  </RegText>
                  {listIcon === faDotCircle && (
                    <FadeText style={{ marginLeft: 10 }}>
                      {listServerUri}
                    </FadeText>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  marginRight: 10,
                  marginBottom: 5,
                  maxHeight: 50,
                  minHeight: 48,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {listIcon && (
                  <FontAwesomeIcon
                    icon={listIcon}
                    size={16}
                    color={colors.border}
                  />
                )}
                <RegText style={{ marginLeft: 10 }}>
                  {translate('settings.server-list') as string}
                </RegText>
                {listIcon === faDotCircle && (
                  <FadeText style={{ marginLeft: 10 }}>
                    {listServerUri}
                  </FadeText>
                )}
              </View>
            )}
          </View>
          <View style={{ display: 'flex' }}>
            <FadeText>
              {translate('settings.server-list-text') as string}
            </FadeText>
          </View>

          <View>
            <TouchableOpacity
              testID="settings.custom-server"
              disabled={disabled}
              style={{
                marginRight: 10,
                marginBottom: 5,
                maxHeight: 50,
                minHeight: 48,
              }}
              onPress={() => {
                setAutoIcon(farCircle);
                setListIcon(farCircle);
                setCustomIcon(faDotCircle);
                setSelectServer(SelectServerEnum.custom);
              }}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                {customIcon && (
                  <FontAwesomeIcon
                    icon={customIcon}
                    size={16}
                    color={colors.border}
                  />
                )}
                <RegText style={{ marginLeft: 10 }}>
                  {translate('settings.server-custom') as string}
                </RegText>
              </View>
            </TouchableOpacity>
            {customIcon === farCircle && (
              <View style={{ display: 'flex' }}>
                <FadeText>
                  {translate('settings.server-custom-text') as string}
                </FadeText>
              </View>
            )}

            {customIcon === faDotCircle && (
              <View>
                <View
                  accessible={true}
                  accessibilityLabel={
                    translate('settings.server-acc') as string
                  }
                  style={{
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    marginLeft: 5,
                    width: 'auto',
                    maxWidth: '90%',
                    minWidth: '50%',
                    minHeight: 48,
                  }}
                >
                  <TextInput
                    testID="settings.custom-server-field"
                    placeholder={GlobalConst.serverPlaceHolder}
                    placeholderTextColor={colors.placeholder}
                    style={{
                      color: colors.text,
                      fontWeight: '600',
                      fontSize: 18,
                      minWidth: '50%',
                      maxWidth: '90%',
                      minHeight: 48,
                      marginLeft: 5,
                      backgroundColor: 'transparent',
                    }}
                    value={customServerUri}
                    onChangeText={(text: string) => setCustomServerUri(text)}
                    editable={!disabled}
                    maxLength={100}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="URL"
                  />
                </View>
                <View
                  accessible={true}
                  accessibilityLabel={
                    translate('settings.server-acc') as string
                  }
                  style={{
                    marginLeft: 5,
                    width: 'auto',
                    maxWidth: '90%',
                    minWidth: '50%',
                    minHeight: 48,
                  }}
                >
                  <View
                    style={{
                      paddingTop: 10,
                      paddingLeft: 10,
                      paddingRight: 10,
                      marginBottom: 5,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <ChainTypeToggle
                      customServerChainName={customServerChainName}
                      onPress={onPressServerChainName}
                      translate={translate}
                      disabled={disabled}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
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
      <SelectBottomSheet
        ref={listServerSelectRef}
        title={translate('settings.select-placeholder') as string}
        items={itemsPicker}
        value={listServerUri ?? ''}
        onChange={itemValue => {
          if (itemValue) {
            setOfflineIcon(farCircle);
            setAutoIcon(farCircle);
            setListIcon(faDotCircle);
            setCustomIcon(farCircle);
            setSelectServer(SelectServerEnum.list);
            setListServerUri(itemValue);
            setAutoServerUri(itemValue);
            const cnItem = serverUris(translate).find(
              (s: ServerUrisType) => s.uri === itemValue && !s.obsolete,
            );
            if (cnItem) {
              setListServerChainName(cnItem.chainName);
            } else {
              console.log('chain name not found');
            }
          }
        }}
      />
    </KeyboardAvoidingView>
  );
};

export default Settings;
