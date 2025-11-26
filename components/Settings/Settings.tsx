/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';

import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  IconDefinition,
  faChevronLeft,
  faDotCircle,
} from '@fortawesome/free-solid-svg-icons';
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import { checkServerURI, parseServerURI, serverUris } from '../../app/uris';
import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';

import {
  LanguageEnum,
  SecurityType,
  ServerType,
  ServerUrisType,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  ButtonTypeEnum,
  GlobalConst,
  RouteEnum,
  ScreenEnum,
} from '../../app/AppState';
import { isEqual } from 'lodash';
import ChainTypeToggle from '../Components/ChainTypeToggle';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import RNPickerSelect from 'react-native-picker-select';
import { hasRecoveryWalletInfo } from '../../app/recoveryWalletInfov10';
import { ToastProvider } from 'react-native-toastier';
import Snackbars from '../Components/Snackbars';
import { RPCPerformanceLevelEnum } from '../../app/rpc/enums/RPCPerformanceLevelEnum';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { createAlert } from '../../app/createAlert';
import { sendEmail } from '../../app/sendEmail';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SettingsProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.Settings
> & {
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
  setCurrencyOption: (value: CurrencyEnum) => Promise<void>;
  setLanguageOption: (value: LanguageEnum, reset: boolean) => Promise<void>;
  setSendAllOption: (value: boolean) => Promise<void>;
  setDonationOption: (value: boolean) => Promise<void>;
  setModeOption: (value: string) => Promise<void>;
  setSecurityOption: (value: SecurityType) => Promise<void>;
  setSelectServerOption: (value: string) => Promise<void>;
  setRescanMenuOption: (value: boolean) => Promise<void>;
  setRecoveryWalletInfoOnDeviceOption: (value: boolean) => Promise<void>;
  setPerformanceLevelOption: (value: RPCPerformanceLevelEnum) => Promise<void>;
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
  setModeOption,
  setSecurityOption,
  setSelectServerOption,
  setRescanMenuOption,
  setRecoveryWalletInfoOnDeviceOption,
  setPerformanceLevelOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    indexerServer: indexerServerContext,
    currency: currencyContext,
    language: languageContext,
    sendAll: sendAllContext,
    donation: donationContext,
    privacy: privacyContext,
    mode: modeContext,
    netInfo,
    addLastSnackbar,
    security: securityContext,
    selectIndexerServer: selectIndexerServerContext,
    rescanMenu: rescanMenuContext,
    recoveryWalletInfoOnDevice: recoveryWalletInfoOnDeviceContext,
    performanceLevel: performanceLevelContext,
    readOnly,
    snackbars,
    removeFirstSnackbar,
    setPrivacyOption,
    setBackgroundError,
    zingolibVersion,
    lastError,
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

  const sendAllsArray = translate('settings.sendalls');
  let SENDALLS: Options[] = [];
  if (typeof sendAllsArray === 'object') {
    SENDALLS = sendAllsArray as Options[];
  }

  const donationsArray = translate('settings.donations');
  let DONATIONS: Options[] = [];
  if (typeof donationsArray === 'object') {
    DONATIONS = donationsArray as Options[];
  }

  const privacysArray = translate('settings.privacys');
  let PRIVACYS: Options[] = [];
  if (typeof privacysArray === 'object') {
    PRIVACYS = privacysArray as Options[];
  }

  const modesArray = translate('settings.modes');
  let MODES: Options[] = [];
  if (typeof modesArray === 'object') {
    MODES = modesArray as Options[];
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

  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Settings;

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
  const [mode, setMode] = useState<string>(modeContext);
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
  const [selectServer, setSelectServer] = useState<SelectServerEnum>(
    selectIndexerServerContext,
  );
  const [rescanMenu, setRescanMenu] = useState<boolean>(rescanMenuContext);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] =
    useState<boolean>(recoveryWalletInfoOnDeviceContext);
  const [performanceLevel, setPerformanceLevel] =
    useState<RPCPerformanceLevelEnum>(performanceLevelContext);

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
  const [kbOpen, setKbOpen] = React.useState(false);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
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
      }
    })();
  }, [translate]);

  const setServer = () => {
    if (selectIndexerServerContext === SelectServerEnum.auto) {
      setAutoIcon(faDotCircle); // ->
      setListIcon(farCircle);
      setCustomIcon(farCircle);
      setOfflineIcon(farCircle);
      setAutoServerUri(indexerServerContext.uri);
      setAutoServerChainName(indexerServerContext.chainName);
    } else if (selectIndexerServerContext === SelectServerEnum.list) {
      setAutoIcon(farCircle);
      setListIcon(faDotCircle); // ->
      setCustomIcon(farCircle);
      setOfflineIcon(farCircle);
      setListServerUri(indexerServerContext.uri);
      setListServerChainName(indexerServerContext.chainName);
      // I have to update them in auto as well
      // with the same server
      setAutoServerUri(indexerServerContext.uri);
      setAutoServerChainName(indexerServerContext.chainName);
    } else if (selectIndexerServerContext === SelectServerEnum.custom) {
      setAutoIcon(farCircle);
      setListIcon(farCircle);
      setCustomIcon(faDotCircle); // ->
      setOfflineIcon(farCircle);
      setCustomServerUri(indexerServerContext.uri);
      setCustomServerChainName(indexerServerContext.chainName);
      // I have to update them in auto as well
      // with the first of the list
      setAutoServerUri(
        serverUris(translate).filter(
          (s: ServerUrisType) => s.chainName === ChainNameEnum.testChainName,
        )[0].uri,
      );
      setAutoServerChainName(
        serverUris(translate).filter(
          (s: ServerUrisType) => s.chainName === ChainNameEnum.testChainName,
        )[0].chainName,
      );
    } else if (selectIndexerServerContext === SelectServerEnum.offline) {
      setAutoIcon(farCircle);
      setListIcon(farCircle);
      setCustomIcon(farCircle);
      setOfflineIcon(faDotCircle); // ->
      // I have to update them in auto as well
      // with the first of the list
      setAutoServerUri(
        serverUris(translate).filter(
          (s: ServerUrisType) => s.chainName === ChainNameEnum.testChainName,
        )[0].uri,
      );
      setAutoServerChainName(
        serverUris(translate).filter(
          (s: ServerUrisType) => s.chainName === ChainNameEnum.testChainName,
        )[0].chainName,
      );
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
      indexerServerContext.uri === serverUriParsed &&
      indexerServerContext.chainName === chainNameParsed &&
      currencyContext === currency &&
      languageContext === language &&
      sendAllContext === sendAll &&
      donationContext === donation &&
      privacyContext === privacy &&
      modeContext === mode &&
      isEqual(securityContext, securityObject()) &&
      selectIndexerServerContext === selectServer &&
      rescanMenuContext === rescanMenu &&
      recoveryWalletInfoOnDeviceContext === recoveryWalletInfoOnDevice &&
      performanceLevelContext === performanceLevel
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
    mode,
    modeContext,
    privacy,
    privacyContext,
    recoveryWalletInfoOnDevice,
    recoveryWalletInfoOnDeviceContext,
    rescanMenu,
    rescanMenuContext,
    performanceLevel,
    performanceLevelContext,
    securityContext,
    selectServer,
    selectIndexerServerContext,
    sendAll,
    sendAllContext,
    indexerServerContext.chainName,
    indexerServerContext.uri,
    securityObject,
  ]);

  const saveSettings = async () => {
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
    let sameServerChainName = true;
    const chainName = indexerServerContext.chainName;
    if (
      indexerServerContext.uri === serverUriParsed &&
      indexerServerContext.chainName === chainNameParsed &&
      currencyContext === currency &&
      languageContext === language &&
      sendAllContext === sendAll &&
      donationContext === donation &&
      privacyContext === privacy &&
      modeContext === mode &&
      isEqual(securityContext, securityObject()) &&
      selectIndexerServerContext === selectServer &&
      rescanMenuContext === rescanMenu &&
      recoveryWalletInfoOnDeviceContext === recoveryWalletInfoOnDevice &&
      performanceLevelContext === performanceLevel
    ) {
      addLastSnackbar({
        message: translate('settings.nochanges') as string,
        screenName: [screenName],
      });
      return;
    }
    if (
      (!serverUriParsed || !chainNameParsed) &&
      selectServer !== SelectServerEnum.offline
    ) {
      addLastSnackbar({
        message: translate('settings.isserver') as string,
        screenName: [screenName],
      });
      return;
    }
    if (!language) {
      addLastSnackbar({
        message: translate('settings.islanguage') as string,
        screenName: [screenName],
      });
      return;
    }

    if (
      indexerServerContext.uri !== serverUriParsed &&
      selectServer !== SelectServerEnum.offline
    ) {
      const resultUri = parseServerURI(serverUriParsed, translate);
      if (resultUri && resultUri.toLowerCase().startsWith(GlobalConst.error)) {
        addLastSnackbar({
          message: translate('settings.isuri') as string,
          screenName: [screenName],
        });
        return;
      } else {
        // url-parse sometimes is too wise, and if you put:
        // server: `http:/zec-server.com:9067` the parser understand this. Good.
        // but this value will be store in the settings and the value is wrong.
        // so, this function if everything is OK return the URI well formatted.
        // and I save it in the state ASAP.
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
    }

    if (
      (indexerServerContext.uri !== serverUriParsed ||
        selectIndexerServerContext !== selectServer) &&
      !serverUriParsed &&
      selectServer !== SelectServerEnum.offline
    ) {
      addLastSnackbar({
        message: translate('settings.isuri') as string,
        screenName: [screenName],
      });
      return;
    }

    if (
      indexerServerContext.uri !== serverUriParsed ||
      indexerServerContext.chainName !== chainNameParsed
    ) {
      // if the user is changing -> to Offline mode.
      // doesn't matter is the device have or not internet connection.
      if (
        !netInfo.isConnected &&
        !(
          selectIndexerServerContext !== SelectServerEnum.offline &&
          selectServer === SelectServerEnum.offline
        )
      ) {
        addLastSnackbar({
          message: translate('loadedapp.connection-error') as string,
          screenName: [screenName],
        });
        return;
      }
      setDisabled(true);
      if (serverUriParsed) {
        addLastSnackbar({
          message: translate('loadedapp.tryingnewserver') as string,
          screenName: [screenName],
        });
      }
      const { result, timeout, newChainName } = await checkServerURI(
        serverUriParsed,
        indexerServerContext.uri,
      );
      if (!result) {
        // if the server checking takes more then 30 seconds.
        if (timeout === true) {
          addLastSnackbar({
            message: translate('loadedapp.tryingnewserver-error') as string,
            screenName: [screenName],
          });
        } else {
          addLastSnackbar({
            message:
              (translate('loadedapp.changeservernew-error') as string) +
              serverUriParsed,
            screenName: [screenName],
          });
        }
        // in this point the sync process is blocked, who knows why.
        // if I save the actual server before the customization... is going to work.
        setServerOption(
          indexerServerContext,
          selectIndexerServerContext,
          false,
          sameServerChainName,
        );
        setDisabled(false);
        return;
      } else {
        if (newChainName && newChainName !== chainName) {
          sameServerChainName = false;
          addLastSnackbar({
            message: translate('loadedapp.differentchain-error') as string,
            screenName: [screenName],
          });
        }
      }
    }

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
    if (modeContext !== mode) {
      await setModeOption(mode);
    }
    if (!isEqual(securityContext, securityObject())) {
      await setSecurityOption(securityObject());
    }
    if (rescanMenuContext !== rescanMenu) {
      await setRescanMenuOption(rescanMenu);
    }
    if (recoveryWalletInfoOnDeviceContext !== recoveryWalletInfoOnDevice) {
      await setRecoveryWalletInfoOnDeviceOption(recoveryWalletInfoOnDevice);
    }
    if (performanceLevelContext !== performanceLevel) {
      await setPerformanceLevelOption(performanceLevel);
    }

    // I need a little time in this modal because maybe the wallet cannot be open with the new server
    let ms = 100;
    if (
      indexerServerContext.uri !== serverUriParsed ||
      indexerServerContext.chainName !== chainNameParsed
    ) {
      if (languageContext !== language) {
        await setLanguageOption(language, false);
      }
      setServerOption(
        { uri: serverUriParsed, chainName: chainNameParsed } as ServerType,
        selectServer,
        true,
        sameServerChainName,
      );
      ms = 1500;
    } else {
      if (selectIndexerServerContext !== selectServer) {
        await setSelectServerOption(selectServer);
      }
      if (languageContext !== language) {
        await setLanguageOption(language, true);
      }
    }

    setDisabled(false);
    setTimeout(() => {
      navigateToHome(false);
    }, ms);
  };

  const navigateToHome = (reset: boolean) => {
    if (reset) {
      // reset all settings - no save changes
      setMode(modeContext);
      setCurrency(currencyContext);
      setLanguage(languageContext);
      setDonation(donationContext);
      setPrivacy(privacyContext);
      setSendAll(sendAllContext);
      setRescanMenu(rescanMenuContext);
      setSelectServer(selectIndexerServerContext);
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
    }
    navigation.goBack();
  };

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
              size={20}
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
      [screenName],
      'Last Error',
      error,
      false,
      translate,
      sendEmail,
      zingolibVersion,
    );
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? insets.top : kbOpen ? insets.top : 0
        }
      >
        <View
          style={{
            position: 'absolute',
            width: 75,
            top: 10,
            left: 10,
            zIndex: 999,
          }}
        >
          <View
            style={{
              borderRadius: 25,
              borderColor: colors.text,
              borderWidth: 1,
              padding: 10,
              margin: 10,
              backgroundColor: colors.background,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                if (!disabled) {
                  navigateToHome(true);
                }
              }}
            >
              <FontAwesomeIcon
                size={30}
                icon={faChevronLeft}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexGrow: 1,
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <RegText
              color={colors.text}
              style={{ fontSize: 25, alignSelf: 'center' }}
            >
              Settings
            </RegText>

            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>{translate('settings.mode-title') as string}</BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {optionsRadio(
                MODES,
                setMode as React.Dispatch<
                  React.SetStateAction<string | boolean>
                >,
                String,
                mode,
                'mode',
              )}
            </View>

            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>
                {translate('settings.currency-title') as string}
              </BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {optionsRadio(
                CURRENCIES,
                setCurrency as React.Dispatch<
                  React.SetStateAction<string | boolean>
                >,
                String,
                currency,
                'currency',
              )}
            </View>

            <View style={{ display: 'flex', margin: 10 }}>
              <BoldText>
                {translate('settings.language-title') as string}
              </BoldText>
            </View>

            <View style={{ display: 'flex', marginLeft: 25 }}>
              {optionsRadio(
                LANGUAGES,
                setLanguage as React.Dispatch<
                  React.SetStateAction<string | boolean>
                >,
                String,
                language,
                'language',
              )}
            </View>

            {modeContext !== ModeEnum.basic && (
              <>
                {!readOnly && (
                  <>
                    <View style={{ display: 'flex', margin: 10 }}>
                      <BoldText>
                        {translate('settings.donation-title') as string}
                      </BoldText>
                    </View>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      {optionsRadio(
                        DONATIONS,
                        setDonation as React.Dispatch<
                          React.SetStateAction<string | boolean>
                        >,
                        Boolean,
                        donation,
                        'donation',
                      )}
                    </View>
                  </>
                )}

                <View style={{ display: 'flex', margin: 10 }}>
                  <BoldText>
                    {translate('settings.privacy-title') as string}
                  </BoldText>
                </View>

                <View style={{ display: 'flex', marginLeft: 25 }}>
                  {optionsRadio(
                    PRIVACYS,
                    setPrivacy as React.Dispatch<
                      React.SetStateAction<string | boolean>
                    >,
                    Boolean,
                    privacy,
                    'privacy',
                  )}
                </View>

                {!readOnly && (
                  <>
                    <View style={{ display: 'flex', margin: 10 }}>
                      <BoldText>
                        {translate('settings.sendall-title') as string}
                      </BoldText>
                    </View>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      {optionsRadio(
                        SENDALLS,
                        setSendAll as React.Dispatch<
                          React.SetStateAction<string | boolean>
                        >,
                        Boolean,
                        sendAll,
                        'sendall',
                      )}
                    </View>
                  </>
                )}

                <View style={{ display: 'flex', margin: 10 }}>
                  <BoldText>
                    {translate('settings.rescanmenu-title') as string}
                  </BoldText>
                </View>

                <View style={{ display: 'flex', marginLeft: 25 }}>
                  {optionsRadio(
                    RESCANMENU,
                    setRescanMenu as React.Dispatch<
                      React.SetStateAction<string | boolean>
                    >,
                    Boolean,
                    rescanMenu,
                    'rescanmenu',
                  )}
                </View>

                <View style={{ display: 'flex', margin: 10 }}>
                  <BoldText>
                    {translate('settings.server-title') as string}
                  </BoldText>
                </View>

                <View style={{ display: 'flex', marginLeft: 25 }}>
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
                            size={20}
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
                            size={20}
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
                      <RNPickerSelect
                        style={{
                          modalViewBottom: {
                            minHeight: 300,
                          },
                        }}
                        pickerProps={{
                          mode: 'dialog',
                          itemStyle: {
                            color: colors.background,
                          },
                        }}
                        fixAndroidTouchableBug={true}
                        value={listServerUri ?? ' '}
                        items={itemsPicker}
                        placeholder={{
                          label: translate(
                            'settings.select-placeholder',
                          ) as string,
                          value: null,
                          color: colors.primary,
                        }}
                        useNativeAndroidPickerStyle={false}
                        onValueChange={(itemValue: string) => {
                          //console.log(JSON.stringify(item));
                          if (itemValue) {
                            setOfflineIcon(farCircle);
                            setAutoIcon(farCircle);
                            setListIcon(faDotCircle);
                            setCustomIcon(farCircle);
                            setSelectServer(SelectServerEnum.list);
                            setListServerUri(itemValue);
                            setAutoServerUri(itemValue);
                            // avoiding obsolete ones
                            const cnItem = serverUris(translate).find(
                              (s: ServerUrisType) =>
                                s.uri === itemValue && !s.obsolete,
                            );
                            if (cnItem) {
                              setListServerChainName(cnItem.chainName);
                            } else {
                              console.log('chain name not found');
                            }
                          }
                        }}
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
                              size={20}
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
                      </RNPickerSelect>
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
                            size={20}
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
                            size={20}
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
                            onChangeText={(text: string) =>
                              setCustomServerUri(text)
                            }
                            editable={!disabled}
                            maxLength={100}
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
                </View>

                <View style={{ display: 'flex', margin: 10 }}>
                  <BoldText testID="settings.securitytitle">
                    {translate('settings.security-title') as string}
                  </BoldText>
                </View>

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
                  translate(
                    'settings.security-restorewalletbackupscreen',
                  ) as string,
                )}

                <View style={{ display: 'flex', margin: 10 }}>
                  <BoldText>
                    {
                      translate(
                        'settings.recoverywalletinfoondevice-title',
                      ) as string
                    }
                  </BoldText>
                </View>

                <View style={{ display: 'flex', marginLeft: 25 }}>
                  {optionsRadio(
                    RECOVERYWALLETINFOONDEVICE,
                    setRecoveryWalletInfoOnDevice as React.Dispatch<
                      React.SetStateAction<string | boolean>
                    >,
                    Boolean,
                    recoveryWalletInfoOnDevice,
                    'recoverywalletinfoondevice',
                  )}
                </View>

                {hasRecoveryWalletInfoSaved && (
                  <View style={{ display: 'flex' }}>
                    <FadeText
                      style={{
                        color: colors.primary,
                        textAlign: 'center',
                        marginTop: 10,
                        padding: 5,
                      }}
                    >
                      {(translate('settings.walletkeyssaved') as string) +
                        (storageRecoveryWalletInfo
                          ? ' [' + storageRecoveryWalletInfo + ']'
                          : '')}
                    </FadeText>
                  </View>
                )}

                <View style={{ display: 'flex', margin: 10 }}>
                  <TouchableOpacity
                    onLongPress={() => setShowDeveloperOptions(true)}
                  >
                    <FadeText
                      style={{
                        color: colors.primary,
                        textAlign: 'center',
                        marginVertical: 10,
                        padding: 5,
                        borderColor: 'red',
                        borderWidth: 1,
                      }}
                    >
                      {translate('settings.walletkeyswarning') as string}
                    </FadeText>
                  </TouchableOpacity>
                </View>

                {showDeveloperOptions && (
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
                )}
              </>
            )}
          </View>
        </ScrollView>
        <View
          style={{
            marginTop: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 20,
          }}
        >
          <Button
            testID="settings.button.save"
            disabled={disabled || disabledButton}
            type={ButtonTypeEnum.Primary}
            title={translate('settings.save') as string}
            onPress={() => {
              // waiting while closing the keyboard, just in case.
              setTimeout(async () => {
                await saveSettings();
                Keyboard.dismiss();
              }, 100);
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default Settings;
