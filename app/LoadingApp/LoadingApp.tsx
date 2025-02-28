/* eslint-disable react-native/no-inline-styles */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Alert, Modal, I18nManager, AppState, NativeEventSubscription, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '@react-navigation/native';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { StackScreenProps } from '@react-navigation/stack';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo/src/index';

import RPCModule from '../RPCModule';
import {
  AppStateLoading,
  BackgroundType,
  WalletType,
  TranslateType,
  NetInfoType,
  ServerType,
  SecurityType,
  ServerUrisType,
  CommandEnum,
  LanguageEnum,
  CurrencyEnum,
  ModeEnum,
  SelectServerEnum,
  ChainNameEnum,
  DownloadMemosEnum,
  SnackbarDurationEnum,
  SeedActionEnum,
  SettingsNameEnum,
  RouteEnums,
  WalletOptionEnum,
  SnackbarType,
  AppStateStatusEnum,
  GlobalConst,
  EventListenerEnum,
  AppContextLoading,
  InfoType,
  ZecPriceType,
  BackgroundErrorType,
} from '../AppState';
import { parseServerURI, serverUris } from '../uris';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import RPC from '../rpc';
import { ThemeType } from '../types';
import { ContextAppLoadingProvider } from '../context';
import BackgroundFileImpl from '../../components/Background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import { RPCWalletKindType } from '../rpc/types/RPCWalletKindType';
import Snackbars from '../../components/Components/Snackbars';
import { RPCSeedType } from '../rpc/types/RPCSeedType';
import Launching from './components/Launching';
import simpleBiometrics from '../simpleBiometrics';
import selectingServer from '../selectingServer';
import { isEqual } from 'lodash';
import { RestoreFromTypeEnum } from '../AppState';
import {
  createUpdateRecoveryWalletInfo,
  getRecoveryWalletInfo,
  hasRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfo';

// no lazy load because slowing down screens.
import Seed from '../../components/Seed';
import ImportUfvk from '../../components/Ufvk/ImportUfvk';
import { sendEmail } from '../sendEmail';
import { RPCWalletKindEnum } from '../rpc/enums/RPCWalletKindEnum';
import StartMenu from './components/StartMenu';

const en = require('../translations/en.json');
const es = require('../translations/es.json');
const pt = require('../translations/pt.json');
const ru = require('../translations/ru.json');

// for testing
//const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type LoadingAppProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  toggleTheme: (mode: ModeEnum) => void;
};

const SERVER_DEFAULT_0: ServerType = {
  uri: serverUris(() => {})[0].uri,
  chainName: serverUris(() => {})[0].chainName,
} as ServerType;

export default function LoadingApp(props: LoadingAppProps) {
  const theme = useTheme() as ThemeType;
  const [language, setLanguage] = useState<LanguageEnum>(LanguageEnum.en);
  const [currency, setCurrency] = useState<CurrencyEnum>(CurrencyEnum.noCurrency);
  const [server, setServer] = useState<ServerType>(SERVER_DEFAULT_0);
  const [sendAll, setSendAll] = useState<boolean>(false);
  const [donation, setDonation] = useState<boolean>(false);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [mode, setMode] = useState<ModeEnum.basic | ModeEnum.advanced>(ModeEnum.advanced); // by default advanced
  const [background, setBackground] = useState<BackgroundType>({ batches: 0, message: '', date: 0, dateEnd: 0 });
  const [firstLaunchingMessage, setFirstLaunchingMessage] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [security, setSecurity] = useState<SecurityType>({
    startApp: true,
    foregroundApp: true,
    sendConfirm: true,
    seedUfvkScreen: true,
    rescanScreen: true,
    settingsScreen: true,
    changeWalletScreen: true,
    restoreWalletBackupScreen: true,
  });
  const [selectServer, setSelectServer] = useState<SelectServerEnum>(SelectServerEnum.auto);
  const [donationAlert, setDonationAlert] = useState<boolean>(false);
  const [rescanMenu, setRescanMenu] = useState<boolean>(false);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] = useState<boolean>(false);
  const file = useMemo(
    () => ({
      en: en,
      es: es,
      pt: pt,
      ru: ru,
    }),
    [],
  );
  const i18n = useMemo(() => new I18n(file), [file]);

  const translate: (key: string) => TranslateType = (key: string) => i18n.t(key);

  // TODO: It may be useful to split this loading process into separate functions?
  // There are also too many state changes, maybe it's better to set state at the end only.
  // We could use a StackNavigator to move between screens.
  // Also, `LoadingApp` could be called something like `SettingsLoader`.
  useEffect(() => {
    (async () => {
      // Fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      const { languageTag, isRTL } = RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

      // Update layout direction
      I18nManager.forceRTL(isRTL);

      // Check what language and other settings are present
      const settings = await SettingsFileImpl.readSettings();

      // Checking the app version
      // If null, this is a fresh installq
      if (settings.version === null) {
        setFirstLaunchingMessage(false);
      } else if (settings.version === '' || settings.version !== (translate('version') as string)) {
        // Else, this is after un update
        setFirstLaunchingMessage(true);
      }

      // If first time opening after donation update, show alert
      if (settings.firstInstall || settings.firstUpdateWithDonation) {
        setDonationAlert(true);
      }

      // If firstInstall is true -> 100% is the first time.
      if (settings.firstInstall) {
        // Load basic mode
        setMode(ModeEnum.basic);

        // Set the theme
        props.toggleTheme(ModeEnum.basic);

        // Save to file
        await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, ModeEnum.basic);
      } else {
        // If firstInstall is false -> load the saved mode, or default to advanced if not saved
        if (settings.mode === ModeEnum.basic || settings.mode === ModeEnum.advanced) {
          setMode(settings.mode);
          props.toggleTheme(settings.mode);
        } else {
          // if it is not a fresh install -> advanced
          // Save to file, if it wasn't saved
          await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, mode);
          props.toggleTheme(mode);
        }
      }

      // If language in (en, es, pt, ru), load it into state
      if (
        settings.language === LanguageEnum.en ||
        settings.language === LanguageEnum.es ||
        settings.language === LanguageEnum.pt ||
        settings.language === LanguageEnum.ru
      ) {
        setLanguage(settings.language);
        i18n.locale = settings.language;
      } else {
        // Else, load languageTag or fallback, and save to file
        const lang =
          languageTag === LanguageEnum.en ||
          languageTag === LanguageEnum.es ||
          languageTag === LanguageEnum.pt ||
          languageTag === LanguageEnum.ru
            ? (languageTag as LanguageEnum)
            : (fallback.languageTag as LanguageEnum);

        setLanguage(lang);
        i18n.locale = lang;
        await SettingsFileImpl.writeSettings(SettingsNameEnum.language, lang);
      }
      if (settings.currency === CurrencyEnum.noCurrency || settings.currency === CurrencyEnum.USDCurrency) {
        setCurrency(settings.currency);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.currency, currency);
      }
      if (settings.server) {
        setServer(settings.server);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.server, server);
      }
      if (settings.sendAll === true || settings.sendAll === false) {
        setSendAll(settings.sendAll);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.sendAll, sendAll);
      }
      if (settings.donation === true || settings.donation === false) {
        setDonation(settings.donation);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.donation, donation);
      }
      if (settings.privacy === true || settings.privacy === false) {
        setPrivacy(settings.privacy);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, privacy);
      }
      if (settings.security) {
        setSecurity(settings.security);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.security, security);
      }
      if (
        settings.selectServer === SelectServerEnum.auto ||
        settings.selectServer === SelectServerEnum.custom ||
        settings.selectServer === SelectServerEnum.list ||
        settings.selectServer === SelectServerEnum.offline
      ) {
        setSelectServer(settings.selectServer);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, selectServer);
      }
      if (settings.rescanMenu === true || settings.rescanMenu === false) {
        setRescanMenu(settings.rescanMenu);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.rescanMenu, rescanMenu);
      }
      if (settings.recoveryWalletInfoOnDevice === true || settings.recoveryWalletInfoOnDevice === false) {
        setRecoveryWalletInfoOnDevice(settings.recoveryWalletInfoOnDevice);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.recoveryWalletInfoOnDevice, recoveryWalletInfoOnDevice);
      }

      // await delay(5000);

      // Reading background task info
      const backgroundJson = await BackgroundFileImpl.readBackground();
      if (backgroundJson) {
        setBackground(backgroundJson);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //console.log('render loadingApp - 2', translate('version'));

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}>
          <Launching translate={translate} firstLaunchingMessage={false} biometricsFailed={false} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  } else {
    return (
      <LoadingAppClass
        {...props}
        theme={theme}
        translate={translate}
        language={language}
        currency={currency}
        server={server}
        sendAll={sendAll}
        donation={donation}
        privacy={privacy}
        mode={mode}
        background={background}
        firstLaunchingMessage={firstLaunchingMessage}
        security={security}
        selectServer={selectServer}
        donationAlert={donationAlert}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
      />
    );
  }
}

type LoadingAppClassProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  toggleTheme: (mode: ModeEnum) => void;
  translate: (key: string) => TranslateType;
  theme: ThemeType;
  language: LanguageEnum;
  currency: CurrencyEnum;
  server: ServerType;
  sendAll: boolean;
  donation: boolean;
  privacy: boolean;
  mode: ModeEnum;
  background: BackgroundType;
  firstLaunchingMessage: boolean;
  security: SecurityType;
  selectServer: SelectServerEnum;
  donationAlert: boolean;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
};

type LoadingAppClassState = AppStateLoading & AppContextLoading;

export function LoadingAppClass(props: LoadingAppClassProps) {
  const dimRef = useRef<NativeEventSubscription | null>(null);
  const appStateRef = useRef<NativeEventSubscription | null>(null);
  const unsubscribeNetInfoRef = useRef<NetInfoSubscription | null>(null);

  const [state, setState] = useState<LoadingAppClassState>({
    // context
    navigation: props.navigation,
    netInfo: {} as NetInfoType,
    wallet: {} as WalletType,
    info: {} as InfoType,
    zecPrice: {} as ZecPriceType,
    background: props.background,
    translate: props.translate,
    backgroundError: {} as BackgroundErrorType,
    setBackgroundError: () => {}, // Placeholder; replace with actual logic
    readOnly: false,
    snackbars: [] as SnackbarType[],
    addLastSnackbar: () => {}, // Placeholder; replace with actual logic

    // context settings
    server: props.server,
    currency: props.currency,
    language: props.language,
    sendAll: props.sendAll,
    donation: props.donation,
    privacy: props.privacy,
    mode: props.mode,
    security: props.security,
    selectServer: props.selectServer,
    rescanMenu: props.rescanMenu,
    recoveryWalletInfoOnDevice: props.recoveryWalletInfoOnDevice,

    // state
    appStateStatus: AppState.currentState,
    screen: props.route?.params?.screen ?? 0,
    actionButtonsDisabled: false,
    walletExists: false,
    customServerShow: false,
    customServerUri: '',
    customServerChainName: ChainNameEnum.mainChainName,
    customServerOffline: false,
    biometricsFailed: props.route?.params?.biometricsFailed ?? false,
    startingApp: props.route?.params?.startingApp ?? true,
    serverErrorTries: 0,
    donationAlert: props.donationAlert,
    firstLaunchingMessage: props.firstLaunchingMessage,
    hasRecoveryWalletInfoSaved: false,
  });

  useEffect(() => {
    initializeApp();
    return () => {
      if (dimRef.current?.remove) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        dimRef.current.remove();
      }
      if (appStateRef.current?.remove) {
        appStateRef.current.remove();
      }
      if (unsubscribeNetInfoRef.current) {
        unsubscribeNetInfoRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initializeApp() {
    const netInfoState = await NetInfo.fetch();
    setState(prevState => ({
      ...prevState,
      netInfo: {
        isConnected: netInfoState.isConnected,
        type: netInfoState.type,
        isConnectionExpensive: netInfoState.details && netInfoState.details.isConnectionExpensive,
      },
    }));

    // to start the App the first time in this session
    // the user have to pass the security of the device
    if (state.startingApp) {
      if (!state.biometricsFailed) {
        // (PIN or TouchID or FaceID)
        setState(prevState => ({ ...prevState, biometricsFailed: false }));
        const resultBio = state.security.startApp ? await simpleBiometrics({ translate: state.translate }) : true;
        // can be:
        // - true      -> the user do pass the authentication
        // - false     -> the user do NOT pass the authentication
        // - undefined -> no biometric authentication available -> Passcode.
        //console.log('BIOMETRIC --------> ', resultBio);
        if (resultBio === false) {
          setState(prevState => ({ ...prevState, biometricsFailed: true }));
          return;
        } else {
          setState(prevState => ({ ...prevState, biometricsFailed: false }));
        }
      } else {
        // if there is a biometric Fail, likely from the foreground check
        // keep the App in the first screen because the user needs to try again.
        return;
      }
    }

    setState(prevState => ({ ...prevState, actionButtonsDisabled: true }));

    // The App needs to set the crypto Provider by default to ring
    // before anything...
    const r = await RPCModule.setCryptoDefaultProvider();
    console.log('crypto provider result', r);

    // Here the App ask about the new donation feature if needed.
    // only for Advance Users
    if (state.donationAlert && state.mode === ModeEnum.advanced) {
      await showDonationAlertAsync()
        .then(() => {
          setState(prevState => ({ ...prevState, donation: true }));
          SettingsFileImpl.writeSettings(SettingsNameEnum.donation, true);
        })
        .catch(() => {});
    }

    // has the device the Wallet Keys stored?
    const has = await hasRecoveryWalletInfo();
    setState(prevState => ({ ...prevState, hasRecoveryWalletInfoSaved: has }));

    // First, if it's server automatic
    // here I need to check the servers and select the best one
    // likely only when the user install or update the new version with this feature or
    // select automatic in settings.
    if (state.selectServer === SelectServerEnum.auto) {
      if (netInfoState.isConnected) {
        setTimeout(() => {
          addLastSnackbar({
            message: state.translate('loadedapp.selectingserver') as string,
            duration: SnackbarDurationEnum.longer,
          });
        }, 10);
        // not a different one, can be the same.
        const someServerIsWorking = await selectTheBestServer(false);
        console.log('some server is working?', someServerIsWorking);
      } else {
        // if NO internet then I have to chose a server (the first one)
        const s: ServerType = SERVER_DEFAULT_0;
        setState(prevState => ({ ...prevState, server: s }));
        await SettingsFileImpl.writeSettings(SettingsNameEnum.server, s);
      }
    }

    // Second, check if a wallet exists. Do it async so the basic screen has time to render
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    console.log('&&&&& background no in storage &&&&&');
    const exists = await RPCModule.walletExists();
    //console.log('Wallet Exists result', this.state.screen, exists);

    if (exists && exists !== GlobalConst.false) {
      setState(prevState => ({ ...prevState, walletExists: true }));
      let result: string = await RPCModule.loadExistingWallet(state.server.uri, state.server.chainName);
      //let result = 'Error: pepe es guapo';

      // for testing
      //await delay(5000);

      //console.log('Load Wallet Exists result', result);
      let error = false;
      let errorText = '';
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType = await JSON.parse(result);
          if (!resultJson.error || (resultJson.error && resultJson.error.startsWith('This wallet is watch-only'))) {
            // Load the wallet and navigate to the vts screen
            const walletKindStr: string = await RPCModule.execute(CommandEnum.walletKind, '');
            //console.log(walletKindStr);
            try {
              const walletKindJSON: RPCWalletKindType = await JSON.parse(walletKindStr);
              //console.log(walletKindJSON);
              // there are 4 kinds:
              // 1. seed
              // 2. USK
              // 3. UFVK - watch-only wallet
              // 4. No keys - watch-only wallet (possibly an error)

              let readOnly: boolean;
              if (
                walletKindJSON.kind === RPCWalletKindEnum.LoadedFromUnifiedFullViewingKey ||
                walletKindJSON.kind === RPCWalletKindEnum.NoKeysFound
              ) {
                readOnly = true;
              } else {
                readOnly = false;
              }
              // if the seed & birthday are not stored in Keychain/Keystore, do it now.
              if (state.recoveryWalletInfoOnDevice) {
                const wallet: WalletType = await RPC.rpcFetchWallet(readOnly);
                await createUpdateRecoveryWalletInfo(wallet);
              } else {
                // needs to delete the seed from the Keychain/Keystore, do it now.
                if (state.hasRecoveryWalletInfoSaved) {
                  await removeRecoveryWalletInfo();
                }
              }
              setState(prevState => ({ ...prevState, readOnly: readOnly, actionButtonsDisabled: false }));
            } catch (e) {
              //console.log(walletKindStr);
              setState(prevState => ({
                ...prevState,
                readOnly: false,
                actionButtonsDisabled: false,
              }));
              addLastSnackbar({ message: walletKindStr });
            }
            navigateToLoadedApp();
            //console.log('navigate to LoadedApp');
          } else {
            error = true;
            errorText = resultJson.error;
          }
        } catch (e) {
          error = true;
          errorText = JSON.stringify(e);
        }
      } else {
        error = true;
        errorText = result;
      }
      if (error) {
        await walletErrorHandle(errorText, state.translate('loadingapp.readingwallet-label') as string, 1, true);
      }
    } else {
      //console.log('Loading new wallet', state.screen, state.walletExists);
      if (state.mode === ModeEnum.basic) {
        // setting the prop basicFirstViewSeed to false.
        // this means when the user have funds, the seed screen will show up.
        await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, false);
        if (state.hasRecoveryWalletInfoSaved) {
          // but first we need to check if exists some key stored in the device from a previous installation (IOS)
          await recoverRecoveryWalletInfo(false);
          // go to the initial menu, giving the opportunity to the user
          // to use the seed & birthday recovered from the device.
          setState(prevState => ({
            ...prevState,
            screen: 1,
            walletExists: false,
            actionButtonsDisabled: false,
          }));
        } else {
          // if no wallet file & basic mode -> create a new wallet & go directly to history screen.
          // no seed screen.
          if (!netInfoState.isConnected || state.selectServer === SelectServerEnum.offline) {
            setState(prevState => ({
              ...prevState,
              screen: 1,
              walletExists: false,
              actionButtonsDisabled: false,
            }));
          } else {
            createNewWallet(false);
            setState(prevState => ({ ...prevState, actionButtonsDisabled: false }));
            navigateToLoadedApp();
            //console.log('navigate to LoadedApp');
          }
        }
      } else {
        // if no wallet file & advanced mode -> go to the initial menu.
        await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
        setState(prevState => ({
          ...prevState,
          screen: prevState.screen === 3 ? 3 : 1,
          walletExists: false,
          actionButtonsDisabled: false,
        }));
      }
    }

    appStateRef.current = AppState.addEventListener(EventListenerEnum.change, async nextAppState => {
      //console.log('LOADING', 'prior', state.appStateStatus, 'next', nextAppState);
      // let's catch the prior value
      const priorAppState = state.appStateStatus;
      setState(prevState => ({
        ...prevState,
        appStateStatus: nextAppState,
      }));
      if (
        (priorAppState === AppStateStatusEnum.inactive || priorAppState === AppStateStatusEnum.background) &&
        nextAppState === AppStateStatusEnum.active
      ) {
        //console.log('App LOADING has come to the foreground!');
        // reading background task info
        fetchBackgroundSyncing();
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
        console.log('&&&&& background no in storage &&&&&');
        if (state.backgroundError && (state.backgroundError.title || state.backgroundError.error)) {
          Alert.alert(state.backgroundError.title, state.backgroundError.error);
          setBackgroundError('', '');
        }
      }
      if (
        (nextAppState === AppStateStatusEnum.inactive || nextAppState === AppStateStatusEnum.background) &&
        priorAppState === AppStateStatusEnum.active
      ) {
        console.log('App LOADING is gone to the background!');
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
        console.log('&&&&& background yes in storage &&&&&');
      }
    });

    unsubscribeNetInfoRef.current = NetInfo.addEventListener((state: any) => {
      const { screen } = state;
      const { isConnected, type, isConnectionExpensive } = state.netInfo;
      if (
        isConnected !== state.isConnected ||
        type !== state.type ||
        isConnectionExpensive !== state.details?.isConnectionExpensive
      ) {
        setState(prevState => ({
          ...prevState,
          netInfo: {
            isConnected: state.isConnected,
            type: state.type,
            isConnectionExpensive: state.details && state.details.isConnectionExpensive,
          },
          screen: screen === 3 ? 3 : screen !== 0 ? 1 : 0,
          //actionButtonsDisabled: true,
        }));
        if (isConnected !== state.isConnected) {
          if (!state.isConnected) {
            //console.log('EVENT Loading: No internet connection.');
            setState(prevState => ({
              ...prevState,
              customServerShow: false,
            }));
          } else {
            //console.log('EVENT Loading: YESSSSS internet connection.');
            // if it is offline & there is no wallet file
            // the screen is going to be empty
            // show the custom server component
            if (state.selectServer === SelectServerEnum.offline && !state.walletExists) {
              setState(prevState => ({
                ...prevState,
                customServerShow: true,
              }));
            }
            if (screen !== 0) {
              setState(prevState => ({
                ...prevState,
                screen: screen === 3 ? 3 : screen !== 0 ? 1 : 0,
              }));
            }
          }
        }
      }
    });

    // if it is offline & there is no wallet file
    // the screen is going to be empty
    // show the custom server component
    if (netInfoState.isConnected && state.selectServer === SelectServerEnum.offline && !state.walletExists) {
      setState(prevState => ({
        ...prevState,
        customServerShow: true,
      }));
    }
  }

  async function showDonationAlertAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      Alert.alert(
        state.translate('loadingapp.alert-donation-title') as string,
        state.translate('loadingapp.alert-donation-body') as string,
        [
          {
            text: state.translate('confirm') as string,
            onPress: () => resolve(),
          },
          {
            text: state.translate('cancel') as string,
            style: 'cancel',
            onPress: () => reject(),
          },
        ],
        { cancelable: false },
      );
    });
  }

  async function selectTheBestServer(aDifferentOne: boolean): Promise<boolean> {
    // avoiding obsolete ones
    let someServerIsWorking: boolean = true;
    const actualServer = state.server;
    const server = await selectingServer(
      serverUris(state.translate).filter(
        (s: ServerUrisType) => !s.obsolete && s.uri !== (aDifferentOne ? actualServer.uri : ''),
      ),
    );
    let fasterServer: ServerType = {} as ServerType;
    if (server && server.latency) {
      fasterServer = { uri: server.uri, chainName: server.chainName };
    } else {
      fasterServer = actualServer;
      // likely here there is a internet/wifi conection problem
      // all of the servers return an error because they are unreachable probably.
      // the 30 seconds timout was fired.
      someServerIsWorking = false;
    }
    //console.log(server);
    console.log(fasterServer);
    setState(prevState => ({
      ...prevState,
      server: fasterServer,
      selectServer: SelectServerEnum.list,
    }));
    await SettingsFileImpl.writeSettings(SettingsNameEnum.server, fasterServer);
    await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, SelectServerEnum.list);
    // message with the result only for advanced users
    if (state.mode === ModeEnum.advanced && someServerIsWorking) {
      if (isEqual(actualServer, fasterServer)) {
        addLastSnackbar({
          message: state.translate('loadedapp.selectingserversame') as string,
          duration: SnackbarDurationEnum.long,
        });
      } else {
        addLastSnackbar({
          message: (state.translate('loadedapp.selectingserverbest') as string) + ' ' + fasterServer.uri,
          duration: SnackbarDurationEnum.long,
        });
      }
    }
    return someServerIsWorking;
  }

  async function checkServer(server: ServerType): Promise<boolean> {
    const s = {
      uri: server.uri,
      chainName: server.chainName,
      region: '',
      default: false,
      latency: null,
      obsolete: false,
    } as ServerUrisType;
    const serverChecked = await selectingServer([s]);
    if (serverChecked && serverChecked.latency) {
      return true;
    } else {
      return false;
    }
  }

  async function walletErrorHandle(result: string, title: string, screen: number, start: boolean) {
    // first check the actual server
    // if the server is not working properly sometimes can take more than one minute to fail.
    if (start && state.netInfo.isConnected && state.selectServer !== SelectServerEnum.offline) {
      addLastSnackbar({
        message: state.translate('restarting') as string,
        duration: SnackbarDurationEnum.long,
      });
    }
    // if no internet connection -> show the error.
    // if Offline mode -> show the error.
    if (!state.netInfo.isConnected || state.selectServer === SelectServerEnum.offline) {
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        title,
        result,
        false,
        state.translate,
        sendEmail,
        state.info.zingolib,
      );
      setState(prevState => ({
        ...prevState,
        actionButtonsDisabled: false,
        serverErrorTries: 0,
        screen,
      }));
    } else {
      const workingServer = await checkServer(state.server);
      if (workingServer) {
        // the server is working -> this error is something not related with the server availability
        createAlert(
          setBackgroundError,
          addLastSnackbar,
          title,
          result,
          false,
          state.translate,
          sendEmail,
          state.info.zingolib,
        );
        setState(prevState => ({ ...prevState, actionButtonsDisabled: false, serverErrorTries: 0, screen }));
      } else {
        // let's change to another server
        if (state.serverErrorTries === 0) {
          // first try
          setState(prevState => ({ ...prevState, screen, actionButtonsDisabled: true }));
          addLastSnackbar({
            message: state.translate('loadingapp.serverfirsttry') as string,
            duration: SnackbarDurationEnum.longer,
          });
          // a different server.
          const someServerIsWorking = await selectTheBestServer(true);
          if (someServerIsWorking) {
            if (start) {
              setState(prevState => ({
                ...prevState,
                startingApp: false,
                serverErrorTries: 1,
                screen,
              }));
              initializeApp();
            } else {
              createAlert(
                setBackgroundError,
                addLastSnackbar,
                title,
                result,
                false,
                state.translate,
                sendEmail,
                state.info.zingolib,
              );
              setState(prevState => ({ ...prevState, actionButtonsDisabled: false, serverErrorTries: 0, screen }));
            }
          } else {
            createAlert(
              setBackgroundError,
              addLastSnackbar,
              title,
              state.translate('loadingapp.noservers') as string,
              false,
              state.translate,
              sendEmail,
              state.info.zingolib,
            );
            setState(prevState => ({ ...prevState, actionButtonsDisabled: false, serverErrorTries: 0, screen }));
          }
        } else {
          // second try
          addLastSnackbar({
            message: state.translate('loadingapp.serversecondtry') as string,
            duration: SnackbarDurationEnum.longer,
          });
          setTimeout(() => {
            createAlert(
              setBackgroundError,
              addLastSnackbar,
              title,
              result,
              false,
              state.translate,
              sendEmail,
              state.info.zingolib,
            );
            setState(prevState => ({ ...prevState, actionButtonsDisabled: false, serverErrorTries: 0, screen }));
          }, 1000);
        }
      }
    }
  }

  async function fetchBackgroundSyncing() {
    const backgroundJson: BackgroundType = await BackgroundFileImpl.readBackground();
    if (backgroundJson) {
      setState(prevState => ({ ...prevState, background: backgroundJson }));
    }
  }

  function setCustomServerUri(customServerUri: string) {
    setState(prevState => ({
      ...prevState,
      customServerUri,
    }));
  }

  function setCustomServerShow(customServerShow: boolean) {
    setState(prevState => ({
      ...prevState,
      customServerShow,
    }));
  }

  async function usingCustomServer() {
    if (!state.customServerUri && !state.customServerOffline) {
      return;
    }
    setState(prevState => ({ ...prevState, actionButtonsDisabled: true }));
    if (state.customServerOffline) {
      await SettingsFileImpl.writeSettings(SettingsNameEnum.server, {
        uri: '',
        chainName: state.server.chainName,
      });
      await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, SelectServerEnum.offline);
      setState(prevState => ({
        ...prevState,
        selectServer: SelectServerEnum.offline,
        server: { uri: '', chainName: state.server.chainName },
        customServerShow: false,
        customServerUri: '',
        customServerChainName: state.server.chainName,
        customServerOffline: false,
      }));
    } else {
      const uri: string = parseServerURI(state.customServerUri, state.translate);
      const chainName = state.customServerChainName;
      if (uri.toLowerCase().startsWith(GlobalConst.error)) {
        addLastSnackbar({ message: state.translate('settings.isuri') as string });
        setState(prevState => ({ ...prevState, actionButtonsDisabled: false }));
        return;
      }

      state.addLastSnackbar({ message: state.translate('loadedapp.tryingnewserver') as string });

      const cs = {
        uri: uri,
        chainName: chainName,
        region: '',
        default: false,
        latency: null,
        obsolete: false,
      } as ServerUrisType;
      const serverChecked = await selectingServer([cs]);
      if (serverChecked && serverChecked.latency) {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.server, { uri, chainName });
        await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, SelectServerEnum.custom);
        setState(prevState => ({
          ...prevState,
          selectServer: SelectServerEnum.custom,
          server: { uri, chainName },
          customServerShow: false,
          customServerUri: '',
          customServerChainName: state.server.chainName,
          customServerOffline: false,
        }));
      } else {
        state.addLastSnackbar({
          message: (state.translate('loadedapp.changeservernew-error') as string) + uri,
        });
      }
    }
    setState(prevState => ({ ...prevState, actionButtonsDisabled: false }));
  }

  function navigateToLoadedApp() {
    const { navigation } = state;
    navigation.reset({
      index: 0,
      routes: [{ name: RouteEnums.LoadedApp, params: { readOnly: state.readOnly } }],
    });
  }

  function createNewWallet(goSeedScreen: boolean = true) {
    if (!state.netInfo.isConnected || state.selectServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: state.translate('loadedapp.connection-error') as string });
      return;
    }
    setState(prevState => ({ ...prevState, actionButtonsDisabled: true }));
    setTimeout(async () => {
      let seed: string = await RPCModule.createNewWallet(state.server.uri, state.server.chainName);

      if (seed && !seed.toLowerCase().startsWith(GlobalConst.error)) {
        let seedJSON = {} as RPCSeedType;
        try {
          seedJSON = await JSON.parse(seed);
          if (seedJSON.error) {
            setState(prevState => ({ ...prevState, actionButtonsDisabled: false }));
            createAlert(
              setBackgroundError,
              addLastSnackbar,
              state.translate('loadingapp.creatingwallet-label') as string,
              seedJSON.error,
              false,
              state.translate,
              sendEmail,
              state.info.zingolib,
            );
            return;
          }
        } catch (e) {
          setState(prevState => ({ ...prevState, actionButtonsDisabled: false }));
          createAlert(
            setBackgroundError,
            addLastSnackbar,
            state.translate('loadingapp.creatingwallet-label') as string,
            JSON.stringify(e),
            false,
            state.translate,
            sendEmail,
            state.info.zingolib,
          );
          return;
        }
        const wallet: WalletType = { seed: seedJSON.seed || '', birthday: seedJSON.birthday || 0 };
        // default values for wallet options
        setWalletOption(WalletOptionEnum.downloadMemos, DownloadMemosEnum.walletMemos);
        // storing the seed & birthday in KeyChain/KeyStore
        if (state.recoveryWalletInfoOnDevice) {
          await createUpdateRecoveryWalletInfo(wallet);
        } else {
          if (state.hasRecoveryWalletInfoSaved) {
            await removeRecoveryWalletInfo();
          }
        }
        // basic mode -> same screen.
        setState(prevState => ({
          ...prevState,
          wallet,
          screen: goSeedScreen ? 2 : prevState.screen,
          actionButtonsDisabled: false,
          walletExists: true,
        }));
      } else {
        walletErrorHandle(seed, state.translate('loadingapp.creatingwallet-label') as string, 1, false);
      }
    });
  }

  async function getwalletToRestore() {
    setState(prevState => ({ ...prevState, wallet: {} as WalletType, screen: 3 }));
  }

  async function doRestore(seedUfvk: string, birthday: number) {
    if (!seedUfvk) {
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        state.translate('loadingapp.emptyseedufvk-label') as string,
        state.translate('loadingapp.emptyseedufvk-error') as string,
        false,
        state.translate,
        sendEmail,
        state.info.zingolib,
      );
      return;
    }
    if (
      (seedUfvk.toLowerCase().startsWith(GlobalConst.uview) &&
        state.server.chainName !== ChainNameEnum.mainChainName) ||
      (seedUfvk.toLowerCase().startsWith(GlobalConst.utestview) &&
        state.server.chainName === ChainNameEnum.mainChainName)
    ) {
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        state.translate('loadingapp.invalidseedufvk-label') as string,
        state.translate('loadingapp.invalidseedufvk-error') as string,
        false,
        state.translate,
        sendEmail,
        state.info.zingolib,
      );
      return;
    }

    setState(prevState => ({ ...prevState, actionButtonsDisabled: true }));
    setTimeout(async () => {
      let walletBirthday = birthday.toString() || '0';
      if (parseInt(walletBirthday, 10) < 0) {
        walletBirthday = '0';
      }
      if (isNaN(parseInt(walletBirthday, 10))) {
        walletBirthday = '0';
      }

      let type: RestoreFromTypeEnum = RestoreFromTypeEnum.seedRestoreFrom;
      if (
        seedUfvk.toLowerCase().startsWith(GlobalConst.uview) ||
        seedUfvk.toLowerCase().startsWith(GlobalConst.utestview)
      ) {
        // is a UFVK
        type = RestoreFromTypeEnum.ufvkRestoreFrom;
      }

      let result: string;
      if (type === RestoreFromTypeEnum.seedRestoreFrom) {
        result = await RPCModule.restoreWalletFromSeed(
          seedUfvk.toLowerCase(),
          walletBirthday || '0',
          state.server.uri,
          state.server.chainName,
        );
      } else {
        result = await RPCModule.restoreWalletFromUfvk(
          seedUfvk.toLowerCase(),
          walletBirthday || '0',
          state.server.uri,
          state.server.chainName,
        );
      }

      //console.log(seedUfvk);
      //console.log(result);
      let error = false;
      let errorText = '';
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType = await JSON.parse(result);
          if (!resultJson.error || (resultJson.error && resultJson.error.startsWith('This wallet is watch-only'))) {
            // storing the seed/ufvk & birthday in KeyChain/KeyStore
            if (state.recoveryWalletInfoOnDevice) {
              if (type === RestoreFromTypeEnum.seedRestoreFrom) {
                // here I have to store the seed/birthday in the device
                // because the user is restoring from seed (same or different)
                const walletSeed: WalletType = { seed: seedUfvk.toLowerCase(), birthday: Number(walletBirthday) };
                await createUpdateRecoveryWalletInfo(walletSeed);
              } else {
                // here I have to store the ufvk in the device
                // because the user is restoring from ufvk (same or different)
                const walletUfvk: WalletType = { ufvk: seedUfvk.toLowerCase(), birthday: Number(walletBirthday) };
                await createUpdateRecoveryWalletInfo(walletUfvk);
              }
            } else {
              if (state.hasRecoveryWalletInfoSaved) {
                await removeRecoveryWalletInfo();
              }
            }
            // when restore a wallet never the user needs that the seed screen shows up with the first funds received.
            await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
            setState(prevState => ({
              ...prevState,
              actionButtonsDisabled: false,
              readOnly: type === RestoreFromTypeEnum.seedRestoreFrom ? false : true,
            }));
            navigateToLoadedApp();
          } else {
            error = true;
            errorText = resultJson.error;
          }
        } catch (e) {
          error = true;
          errorText = JSON.stringify(e);
        }
      } else {
        error = true;
        errorText = result;
      }
      if (error) {
        walletErrorHandle(errorText, state.translate('loadingapp.readingwallet-label') as string, 3, false);
      }
    });
  }

  async function setWalletOption(walletOption: string, value: string) {
    await RPC.rpcSetWalletSettingOption(walletOption, value);
  }

  async function setPrivacyOption(value: boolean): Promise<void> {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, value);
    setState(prevState => ({
      ...prevState,
      privacy: value as boolean,
    }));
  }

  function setBackgroundError(title: string, error: string) {
    setState(prevState => ({ ...prevState, backgroundError: { title, error } }));
  }

  function customServer() {
    setState(prevState => ({ ...prevState, customServerShow: true }));
  }

  function onPressServerChainName(chain: ChainNameEnum) {
    setState(prevState => ({ ...prevState, customServerChainName: chain }));
  }

  function onPressServerOffline(value: boolean) {
    setState(prevState => ({ ...prevState, customServerOffline: value }));
  }

  function addLastSnackbar(snackbar: SnackbarType) {
    const newSnackbars = state.snackbars;
    // if the last one is the same don't do anything.
    if (newSnackbars.length > 0 && newSnackbars[newSnackbars.length - 1].message === snackbar.message) {
      return;
    }
    newSnackbars.push(snackbar);
    setState(prevState => ({ ...prevState, snackbars: newSnackbars }));
  }

  function removeFirstSnackbar() {
    const newSnackbars = state.snackbars;
    newSnackbars.shift();
    setState(prevState => ({ ...prevState, snackbars: newSnackbars }));
  }

  async function changeMode(mode: ModeEnum.basic | ModeEnum.advanced) {
    setState(prevState => ({ ...prevState, mode, screen: 0 }));
    await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, mode);
    props.toggleTheme(mode);
    // if the user selects advanced mode & wants to change to another wallet
    // and then the user wants to go to basic mode in the first screen
    // the result will be the same -> create a new wallet.
    initializeApp();
  }

  async function recoverRecoveryWalletInfo(security: boolean) {
    // recover the wallet keys from the device
    const wallet = await getRecoveryWalletInfo();
    // in IOS the App + OS needs some time to close the biometric screen
    // then the Alert can be too fast.
    if (wallet.seed || wallet.ufvk) {
      const txt = (wallet.seed || wallet.ufvk) + '\n\n' + wallet.birthday;
      setTimeout(
        () => {
          Alert.alert(
            props.translate('loadedapp.walletseed-basic') as string,
            (security ? '' : ((props.translate('loadingapp.recoverkeysinstall') + '\n\n') as string)) + txt,
            [
              {
                text: props.translate('copy') as string,
                onPress: () => {
                  Clipboard.setString(txt);
                  addLastSnackbar({
                    message: props.translate('txtcopied') as string,
                    duration: SnackbarDurationEnum.short,
                  });
                },
              },
              { text: props.translate('cancel') as string, style: 'cancel' },
            ],
            { cancelable: false },
          );
          // IOS needs time to close the biometric screen.
          // but Android I don't think so, a little bit Just in case.
        },
        Platform.OS === GlobalConst.platformOSios ? 2000 : 100,
      );
    }
  }

  function openCurrentWallet() {
    // to avoid the biometric security
    setState(prevState => ({
      ...prevState,
      startingApp: false,
    }));
    initializeApp();
  }

  // Previous render
  const {
    screen,
    wallet,
    actionButtonsDisabled,
    walletExists,
    customServerShow,
    customServerUri,
    customServerChainName,
    customServerOffline,
    snackbars,
    firstLaunchingMessage,
    biometricsFailed,
    translate,
    hasRecoveryWalletInfoSaved,
  } = state;
  const { colors } = props.theme;

  //console.log('render loadingAppClass - 3', state.privacy);

  const context = {
    // context
    navigation: state.navigation,
    netInfo: state.netInfo,
    wallet: state.wallet,
    info: state.info,
    zecPrice: state.zecPrice,
    background: state.background,
    translate: state.translate,
    backgroundError: state.backgroundError,
    setBackgroundError: state.setBackgroundError,
    readOnly: state.readOnly,
    snackbars: state.snackbars,
    addLastSnackbar: state.addLastSnackbar,

    // settings
    server: state.server,
    currency: state.currency,
    language: state.language,
    sendAll: state.sendAll,
    donation: state.donation,
    privacy: state.privacy,
    mode: state.mode,
    security: state.security,
    selectServer: state.selectServer,
    rescanMenu: state.rescanMenu,
    recoveryWalletInfoOnDevice: state.recoveryWalletInfoOnDevice,
  };

  return (
    <ContextAppLoadingProvider value={context}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            backgroundColor: colors.background,
          }}>
          <Snackbars snackbars={snackbars} removeFirstSnackbar={removeFirstSnackbar} translate={translate} />

          {screen === 0 && (
            <Launching
              translate={translate}
              firstLaunchingMessage={firstLaunchingMessage}
              biometricsFailed={biometricsFailed}
              tryAgain={() => {
                setState(prevState => ({ ...prevState, biometricsFailed: false }));
              }}
            />
          )}
          {screen === 1 && (
            <StartMenu
              actionButtonsDisabled={actionButtonsDisabled}
              hasRecoveryWalletInfoSaved={hasRecoveryWalletInfoSaved}
              recoverRecoveryWalletInfo={recoverRecoveryWalletInfo}
              changeMode={changeMode}
              customServer={customServer}
              customServerShow={customServerShow}
              customServerOffline={customServerOffline}
              onPressServerOffline={onPressServerOffline}
              customServerChainName={customServerChainName}
              onPressServerChainName={onPressServerChainName}
              customServerUri={customServerUri}
              setCustomServerUri={setCustomServerUri}
              usingCustomServer={usingCustomServer}
              setCustomServerShow={setCustomServerShow}
              walletExists={walletExists}
              openCurrentWallet={openCurrentWallet}
              createNewWallet={createNewWallet}
              getwalletToRestore={getwalletToRestore}
            />
          )}
          {screen === 2 && wallet && (
            <Modal
              animationType="slide"
              transparent={false}
              visible={screen === 2}
              onRequestClose={() => navigateToLoadedApp()}>
              <Seed
                onClickOK={() => navigateToLoadedApp()}
                onClickCancel={() => navigateToLoadedApp()}
                action={SeedActionEnum.new}
                setPrivacyOption={setPrivacyOption}
              />
            </Modal>
          )}
          {screen === 3 && (
            <Modal
              animationType="slide"
              transparent={false}
              visible={screen === 3}
              onRequestClose={() => setState(prevState => ({ ...prevState, screen: 1 }))}>
              <ImportUfvk
                onClickOK={(s: string, b: number) => doRestore(s, b)}
                onClickCancel={() => setState(prevState => ({ ...prevState, screen: 1 }))}
              />
            </Modal>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </ContextAppLoadingProvider>
  );
}
