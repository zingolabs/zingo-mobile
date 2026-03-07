import React, { Component, useState, useMemo, useEffect } from 'react';
import {
  Alert,
  Modal,
  I18nManager,
  EmitterSubscription,
  AppState,
  NativeEventSubscription,
  Platform,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '@react-navigation/native';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { StackScreenProps } from '@react-navigation/stack';
import NetInfo, { NetInfoSubscription, NetInfoState } from '@react-native-community/netinfo/src/index';

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
  LanguageEnum,
  CurrencyEnum,
  ModeEnum,
  SelectServerEnum,
  ChainNameEnum,
  SnackbarDurationEnum,
  SettingsNameEnum,
  RouteEnum,
  SnackbarType,
  AppStateStatusEnum,
  GlobalConst,
  EventListenerEnum,
  AppContextLoading,
  ZecPriceType,
  BackgroundErrorType,
  RestoreFromTypeEnum,
  ScreenEnum,
  LaunchingModeEnum,
  BlockExplorerEnum,
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
import {
  createUpdateRecoveryWalletInfo,
  getRecoveryWalletInfo,
  hasRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfov10';

// no lazy load because slowing down screens.
import ImportUfvk from './components/ImportUfvk';
import { sendEmail } from '../sendEmail';
import { RPCWalletKindEnum } from '../rpc/enums/RPCWalletKindEnum';
import StartMenu from './components/StartMenu';
import { ToastProvider } from 'react-native-toastier';
import { RPCUfvkType } from '../rpc/types/RPCUfvkType';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';
import NewSeed from './components/NewSeed';
import { AppStackParamList } from '../types';

const en = require('../translations/en.json');
const es = require('../translations/es.json');
const pt = require('../translations/pt.json');
const ru = require('../translations/ru.json');
const tr = require('../translations/tr.json');

// for testing
//const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type LoadingAppProps = {
  navigation: StackScreenProps<AppStackParamList, RouteEnum.LoadingApp>['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadingApp>['route'];
  toggleTheme: (mode: ModeEnum) => void;
};

const SERVER_DEFAULT_0: ServerType = {
  uri: serverUris(() => {})[0].uri,
  chainName: serverUris(() => {})[0].chainName,
} as ServerType;

const activationHeight = {
  "main": 419200,
  "test": 280000,
  "regtest": 1,
  "": 1,
};

export default function LoadingApp(props: LoadingAppProps) {
  const theme = useTheme() as ThemeType;
  const [language, setLanguage] = useState<LanguageEnum>(LanguageEnum.en);
  const [currency, setCurrency] = useState<CurrencyEnum>(CurrencyEnum.USDCurrency); // by default USD
  const [server, setServer] = useState<ServerType>(SERVER_DEFAULT_0);
  const [sendAll, setSendAll] = useState<boolean>(false);
  const [donation, setDonation] = useState<boolean>(false);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [mode, setMode] = useState<ModeEnum.basic | ModeEnum.advanced>(ModeEnum.advanced); // by default advanced
  const [backgroundSyncInfo, setBackgroundSyncInfo] = useState<BackgroundType>({ batches: 0, message: '', date: 0, dateEnd: 0 });
  const [firstLaunchingMessage, setFirstLaunchingMessage] = useState<LaunchingModeEnum>(LaunchingModeEnum.opening);
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
  const [performanceLevel, setPerformanceLevel] = useState<RPCPerformanceLevelEnum>(RPCPerformanceLevelEnum.Medium);
  const [blockExplorer, setBlockExplorer] = useState<BlockExplorerEnum>(BlockExplorerEnum.Zcashexplorer);
  const file = useMemo(
    () => ({
      en: en,
      es: es,
      pt: pt,
      ru: ru,
      tr: tr,
    }),
    [],
  );
  const i18n = useMemo(() => new I18n(file), [file]);

  const translate: (key: string) => TranslateType = (key: string) => i18n.t(key);

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      const { languageTag, isRTL } = RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

      // update layout direction
      I18nManager.forceRTL(isRTL);

      //I have to check what language and other things are in the settings
      const settings = await SettingsFileImpl.readSettings();
      //console.log('LoadingApp', settings);

      // checking the version of the App in settings
      //console.log('versions, old:', settings.version, ' new:', translate('version') as string);
      if (settings.version === null) {
        // this is a fresh install
        setFirstLaunchingMessage(LaunchingModeEnum.installing);
      } else if (settings.version === '' || settings.version !== (translate('version') as string)) {
        // this is an update
        setFirstLaunchingMessage(LaunchingModeEnum.updating);
        // The App needs to set the currency opt-in to USD by default
        // only if the currency have `none`
        if (settings.currency === CurrencyEnum.noCurrency) {
          await SettingsFileImpl.writeSettings(SettingsNameEnum.currency, CurrencyEnum.USDCurrency);
        }
      }

      // new donation feature.
      if (settings.firstInstall || settings.firstUpdateWithDonation) {
        setDonationAlert(true);
      }

      // first I need to know if this launch is a fresh install...
      // if firstInstall is true -> 100% is the first time.
      //console.log('first install', settings.firstInstall);
      if (settings.firstInstall) {
        // basic mode
        setMode(ModeEnum.basic);
        props.toggleTheme(ModeEnum.basic);
        await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, ModeEnum.basic);
      } else {
        if (settings.mode === ModeEnum.basic || settings.mode === ModeEnum.advanced) {
          setMode(settings.mode);
          props.toggleTheme(settings.mode);
        } else {
          // if it is not a fresh install -> advanced
          await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, mode);
          props.toggleTheme(mode);
        }
      }

      if (
        settings.language === LanguageEnum.en ||
        settings.language === LanguageEnum.es ||
        settings.language === LanguageEnum.pt ||
        settings.language === LanguageEnum.ru ||
        settings.language === LanguageEnum.tr
      ) {
        setLanguage(settings.language);
        i18n.locale = settings.language;
        //console.log('apploading settings', settings.language, settings.currency);
      } else {
        const lang =
          languageTag === LanguageEnum.en ||
          languageTag === LanguageEnum.es ||
          languageTag === LanguageEnum.pt ||
          languageTag === LanguageEnum.ru ||
          languageTag === LanguageEnum.tr
            ? (languageTag as LanguageEnum)
            : (fallback.languageTag as LanguageEnum);
        setLanguage(lang);
        i18n.locale = lang;
        await SettingsFileImpl.writeSettings(SettingsNameEnum.language, lang);
        //console.log('apploading NO settings', languageTag);
      }
      if (
        settings.currency === CurrencyEnum.noCurrency ||
        settings.currency === CurrencyEnum.USDCurrency ||
        settings.currency === CurrencyEnum.USDTORCurrency
      ) {
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
      if (
        settings.performanceLevel === RPCPerformanceLevelEnum.High ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Low ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Maximum ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Medium
      ) {
        setPerformanceLevel(settings.performanceLevel);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.performanceLevel, performanceLevel);
      }
      if (
        settings.blockExplorer === BlockExplorerEnum.Cipherscan ||
        settings.blockExplorer === BlockExplorerEnum.Zcashexplorer ||
        settings.blockExplorer === BlockExplorerEnum.Zypherscan
      ) {
        setBlockExplorer(settings.blockExplorer);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.blockExplorer, blockExplorer);
      }

      // if server uri is empty, fix this.
      // it is a weird edge case
      if (settings.server && !settings.server.uri) {
        if (
          settings.selectServer &&
          settings.selectServer === SelectServerEnum.auto ||
          settings.selectServer === SelectServerEnum.custom ||
          settings.selectServer === SelectServerEnum.list
        ) {
          setServer(server);
          await SettingsFileImpl.writeSettings(SettingsNameEnum.server, server);
        }
      }

      // for testing
      //await delay(5000);

      // reading background task info
      const backgroundSyncInfoJson = await BackgroundFileImpl.readBackground();
      setBackgroundSyncInfo(backgroundSyncInfoJson);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //console.log('render loadingApp - 2', translate('version'));

  if (loading) {
    return <Launching translate={translate} firstLaunchingMessage={LaunchingModeEnum.opening} biometricsFailed={false} />;
  } else {
    return (
      <LoadingAppClass
        {...props}
        navigationApp={props.navigation}
        theme={theme}
        translate={translate}
        language={language}
        currency={currency}
        server={server}
        sendAll={sendAll}
        donation={donation}
        privacy={privacy}
        mode={mode}
        backgroundSyncInfo={backgroundSyncInfo}
        firstLaunchingMessage={firstLaunchingMessage}
        security={security}
        selectServer={selectServer}
        donationAlert={donationAlert}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
        performanceLevel={performanceLevel}
        blockExplorer={blockExplorer}
      />
    );
  }
}

type LoadingAppClassProps = {
  navigationApp: StackScreenProps<AppStackParamList, RouteEnum.LoadingApp>['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadingApp>['route'];
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
  backgroundSyncInfo: BackgroundType;
  firstLaunchingMessage: LaunchingModeEnum;
  security: SecurityType;
  selectServer: SelectServerEnum;
  donationAlert: boolean;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  performanceLevel: RPCPerformanceLevelEnum;
  blockExplorer: BlockExplorerEnum;
};

type LoadingAppClassState = AppStateLoading & AppContextLoading;

export class LoadingAppClass extends Component<LoadingAppClassProps, LoadingAppClassState> {
  dim: EmitterSubscription;
  appstate: NativeEventSubscription;
  unsubscribeNetInfo: NetInfoSubscription;
  screenName = ScreenEnum.LoadingApp;

  constructor(props: LoadingAppClassProps) {
    super(props);

    this.state = {
      // context
      netInfo: {} as NetInfoType,
      wallet: {} as WalletType,
      zecPrice: {} as ZecPriceType,
      backgroundSyncInfo: props.backgroundSyncInfo,
      translate: props.translate,
      backgroundError: {} as BackgroundErrorType,
      setBackgroundError: this.setBackgroundError,
      readOnly: false,
      orchardPool: true,
      saplingPool: true,
      transparentPool: true,
      snackbars: [] as SnackbarType[],
      addLastSnackbar: this.addLastSnackbar,
      removeFirstSnackbar: this.removeFirstSnackbar,
      zingolibVersion: '',
      setPrivacyOption: this.setPrivacyOption,

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
      performanceLevel: props.performanceLevel,
      blockExplorer: props.blockExplorer,

      // state
      appStateStatus: AppState.currentState,
      screen: !!props.route.params && props.route.params.screen !== undefined ? props.route.params.screen : 0,
      actionButtonsDisabled: false,
      walletExists: false,
      customServerShow: false,
      customServerUri: '',
      customServerChainName: ChainNameEnum.mainChainName,
      customServerOffline: false,
      biometricsFailed:
        !!props.route.params && props.route.params.biometricsFailed !== undefined ? props.route.params.biometricsFailed : false,
      startingApp:
        !!props.route.params && props.route.params.startingApp !== undefined ? props.route.params.startingApp : true,
      serverErrorTries: 0,
      donationAlert: props.donationAlert,
      firstLaunchingMessage: props.firstLaunchingMessage,
      hasRecoveryWalletInfoSaved: false,
    };

    this.dim = {} as EmitterSubscription;
    this.appstate = {} as NativeEventSubscription;
    this.unsubscribeNetInfo = {} as NetInfoSubscription;
  }

  componentDidMount = async () => {
    const netInfoState = await NetInfo.fetch();
    this.setState({
      netInfo: {
        isConnected: netInfoState.isConnected,
        type: netInfoState.type,
        isConnectionExpensive: netInfoState.details && netInfoState.details.isConnectionExpensive,
      },
      //actionButtonsDisabled: !netInfoState.isConnected ? true : false,
    });

    this.fetchZingolibVersion();

    //console.log('DID MOUNT APPLOADING...');

    // to start the App the first time in this session
    // the user have to pass the security of the device
    if (this.state.startingApp) {
      if (!this.state.biometricsFailed) {
        // (PIN or TouchID or FaceID)
        this.setState({ biometricsFailed: false });
        const resultBio = this.state.security.startApp
          ? await simpleBiometrics({ translate: this.state.translate })
          : true;
        // can be:
        // - true      -> the user do pass the authentication
        // - false     -> the user do NOT pass the authentication
        // - undefined -> no biometric authentication available -> Passcode.
        //console.log('BIOMETRIC --------> ', resultBio);
        if (resultBio === false) {
          this.setState({ biometricsFailed: true });
          return;
        } else {
          this.setState({ biometricsFailed: false });
        }
      } else {
        // if there is a biometric Fail, likely from the foreground check
        // keep the App in the first screen because the user needs to try again.
        return;
      }
    }

    this.setState({ actionButtonsDisabled: true });

    // The App needs to set the crypto Provider by default to ring
    // before anything...
    const r = await RPCModule.setCryptoDefaultProvider();
    console.log('crypto provider result', r);

    // Here the App ask about the new donation feature if needed.
    // only for Advance Users
    if (this.state.donationAlert && this.state.mode === ModeEnum.advanced) {
      await this.showDonationAlertAsync()
        .then(() => {
          this.setState({ donation: true });
          SettingsFileImpl.writeSettings(SettingsNameEnum.donation, true);
        })
        .catch(() => {});
    }

    // has the device the Wallet Keys stored?
    const has = await hasRecoveryWalletInfo();
    this.setState({ hasRecoveryWalletInfoSaved: has });

    // First, if it's server automatic
    // here I need to check the servers and select the best one
    // likely only when the user install or update the new version with this feature or
    // select automatic in settings.
    if (this.state.selectServer === SelectServerEnum.auto) {
      if (netInfoState.isConnected) {
        setTimeout(() => {
          this.addLastSnackbar({
            message: this.state.translate('loadedapp.selectingserver') as string,
            duration: SnackbarDurationEnum.longer,
            screenName: [this.screenName],
          });
        }, 10);
        // not a different one, can be the same.
        const someServerIsWorking = await this.selectTheBestServer(false);
        console.log('some server is working?', someServerIsWorking);
      } else {
        // if NO internet then I have to chose a server (the first one)
        const s: ServerType = SERVER_DEFAULT_0;
        this.setState({
          server: s,
        });
        await SettingsFileImpl.writeSettings(SettingsNameEnum.server, s);
      }
    }

    // Second, check if a wallet exists. Do it async so the basic screen has time to render
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    //console.log('&&&&& background no in storage &&&&&');
    const exists = await RPCModule.walletExists();
    //console.log('Wallet Exists result', this.state.screen, exists);

    if (exists && exists !== GlobalConst.false) {
      this.setState({ walletExists: true });
      let result: string = await RPCModule.loadExistingWallet(
        this.state.server.uri,
        this.state.server.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
      //let result = 'Error: pepe es guapo';

      // for testing
      //await delay(5000);

      //console.log('Load Wallet Exists result', result);
      let error = false;
      let errorText = '';
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType & RPCUfvkType = await JSON.parse(result);
          //console.log('Load Wallet Exists result JSON', resultJson);
          if (!resultJson.error) {
            // Load the wallet and navigate to the vts screen
            let readOnly: boolean = false;
            let orchardPool: boolean = false;
            let saplingPool: boolean = false;
            let transparentPool: boolean = false;
            const walletKindStr: string = await RPCModule.walletKindInfo();
            //console.log('KIND...', walletKindStr);
            try {
              const walletKindJSON: RPCWalletKindType = await JSON.parse(walletKindStr);
              console.log('KIND... JSON', walletKindJSON);
              // there are 4 kinds:
              // 1. seed
              // 2. USK
              // 3. UFVK - watch-only wallet
              // 4. No keys - watch-only wallet (possibly an error)

              if (
                walletKindJSON.kind === RPCWalletKindEnum.LoadedFromUnifiedFullViewingKey ||
                walletKindJSON.kind === RPCWalletKindEnum.NoKeysFound
              ) {
                readOnly = true;
              } else {
                readOnly = false;
              }
              orchardPool = walletKindJSON.orchard;
              saplingPool = walletKindJSON.sapling;
              transparentPool = walletKindJSON.transparent;
              // if the seed & birthday are not stored in Keychain/Keystore, do it now.
              if (this.state.recoveryWalletInfoOnDevice) {
                const wallet: WalletType = await RPC.rpcFetchWallet(readOnly);
                await createUpdateRecoveryWalletInfo(wallet);
              } else {
                // needs to delete the seed from the Keychain/Keystore, do it now.
                if (this.state.hasRecoveryWalletInfoSaved) {
                  await removeRecoveryWalletInfo();
                }
              }
              this.setState({
                readOnly,
                orchardPool,
                saplingPool,
                transparentPool,
                actionButtonsDisabled: false,
              });
            } catch (e) {
              //console.log('CATCH ERROR', walletKindStr);
              this.setState({
                readOnly,
                orchardPool,
                saplingPool,
                transparentPool,
                actionButtonsDisabled: false,
              });
              this.addLastSnackbar({ message: walletKindStr, screenName: [this.screenName] });
            }
            // creating tor cliente if needed
            if (this.state.currency === CurrencyEnum.USDTORCurrency || this.state.currency === CurrencyEnum.USDCurrency) {
              await RPCModule.createTorClientProcess();
            }
            // if the App is restoring another wallet backup...
            // needs to recalculate the Address Book.
            const newWallet = !!this.props.route.params && this.props.route.params.newWallet !== undefined ? this.props.route.params.newWallet : false;
            this.navigateToLoadedApp(readOnly, orchardPool, saplingPool, transparentPool, newWallet, this.state.firstLaunchingMessage);
            //console.log('navigate to LoadedApp');
          } else {
            error = true;
            errorText = resultJson.error;
          }
        } catch (e: unknown) {
          error = true;
          errorText = e instanceof Error ? e.message : String(e);
        }
      } else {
        error = true;
        errorText = result;
      }
      if (error) {
        await this.walletErrorHandle(
          errorText,
          this.state.translate('loadingapp.readingwallet-label') as string,
          1,
          true,
        );
      }
    } else {
      //console.log('Loading new wallet', this.state.screen, this.state.walletExists);
      if (this.state.mode === ModeEnum.basic) {
        // setting the prop basicFirstViewSeed to false.
        // this means when the user have funds, the seed screen will show up.
        await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, false);
        if (this.state.hasRecoveryWalletInfoSaved) {
          // but first we need to check if exists some key stored in the device from a previous installation (IOS)
          await this.recoverRecoveryWalletInfo(false);
          // go to the initial menu, giving the opportunity to the user
          // to use the seed & birthday recovered from the device.
          this.setState({
            screen: 1,
            walletExists: false,
            actionButtonsDisabled: false,
          });
        } else {
          // if no wallet file & basic mode -> create a new wallet & go directly to history screen.
          // no seed screen.
          if (!netInfoState.isConnected || this.state.selectServer === SelectServerEnum.offline) {
            this.setState({
              screen: 1,
              walletExists: false,
              actionButtonsDisabled: false,
            });
          } else {
            await this.createNewWallet(false);
            this.setState({ actionButtonsDisabled: false });
            this.navigateToLoadedApp(false, true, true, true, true, this.state.firstLaunchingMessage);
            //console.log('navigate to LoadedApp');
          }
        }
      } else {
        // if no wallet file & advanced mode -> go to the initial menu.
        await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
        this.setState(state => ({
          screen: state.screen === 3 ? 3 : 1,
          walletExists: false,
          actionButtonsDisabled: false,
        }));
      }
    }

    this.appstate = AppState.addEventListener(EventListenerEnum.change, async nextAppState => {
      //console.log('LOADING', 'prior', this.state.appStateStatus, 'next', nextAppState);
      // let's catch the prior value
      const priorAppState = this.state.appStateStatus;
      this.setState({ appStateStatus: nextAppState });
      if (
        (priorAppState === AppStateStatusEnum.inactive || priorAppState === AppStateStatusEnum.background) &&
        nextAppState === AppStateStatusEnum.active
      ) {
        //console.log('App LOADING has come to the foreground!');
        // reading background task info
        this.fetchBackgroundSyncInfo();
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
        //console.log('&&&&& background no in storage &&&&&');
        if (this.state.backgroundError && (this.state.backgroundError.title || this.state.backgroundError.error)) {
          Alert.alert(this.state.backgroundError.title, this.state.backgroundError.error);
          this.setBackgroundError('', '');
        }
      }
      if (
        (nextAppState === AppStateStatusEnum.inactive || nextAppState === AppStateStatusEnum.background) &&
        priorAppState === AppStateStatusEnum.active
      ) {
        console.log('App LOADING is gone to the background!');
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
        //console.log('&&&&& background yes in storage &&&&&');
      }
    });

    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const { screen } = this.state;
      const { isConnected, type, isConnectionExpensive } = this.state.netInfo;
      if (
        isConnected !== state.isConnected ||
        type !== state.type ||
        isConnectionExpensive !== state.details?.isConnectionExpensive
      ) {
        this.setState({
          netInfo: {
            isConnected: state.isConnected,
            type: state.type,
            isConnectionExpensive: state.details && state.details.isConnectionExpensive,
          },
          screen: screen === 3 ? 3 : screen !== 0 ? 1 : 0,
          //actionButtonsDisabled: true,
        });
        if (isConnected !== state.isConnected) {
          if (!state.isConnected) {
            //console.log('EVENT Loading: No internet connection.');
            this.setState({
              customServerShow: false,
            });
          } else {
            //console.log('EVENT Loading: YESSSSS internet connection.');
            // if it is offline & there is no wallet file
            // the screen is going to be empty
            // show the custom server component
            if (this.state.selectServer === SelectServerEnum.offline && !this.state.walletExists) {
              this.setState({
                customServerShow: true,
              });
            }
            if (screen !== 0) {
              this.setState({
                screen: screen === 3 ? 3 : screen !== 0 ? 1 : 0,
              });
            }
          }
        }
      }
    });

    // if it is offline & there is no wallet file
    // the screen is going to be empty
    // show the custom server component
    if (netInfoState.isConnected && this.state.selectServer === SelectServerEnum.offline && !this.state.walletExists) {
      this.setState({
        customServerShow: true,
      });
    }
  };

  componentWillUnmount = () => {
    this.dim && typeof this.dim.remove === 'function' && this.dim.remove();
    this.appstate && typeof this.appstate.remove === 'function' && this.appstate.remove();
    this.unsubscribeNetInfo && typeof this.unsubscribeNetInfo === 'function' && this.unsubscribeNetInfo();
  };

  showDonationAlertAsync = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        this.state.translate('loadingapp.alert-donation-title') as string,
        this.state.translate('loadingapp.alert-donation-body') as string,
        [
          {
            text: this.state.translate('confirm') as string,
            onPress: () => resolve(),
          },
          {
            text: this.state.translate('cancel') as string,
            style: 'cancel',
            onPress: () => reject(),
          },
        ],
        { cancelable: false },
      );
    });
  };

  selectTheBestServer = async (aDifferentOne: boolean): Promise<boolean> => {
    // avoiding obsolete ones
    let someServerIsWorking: boolean = true;
    const actualServer = this.state.server;
    const server = await selectingServer(
      serverUris(this.state.translate).filter(
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
      // the 15 seconds timout was fired.
      someServerIsWorking = false;
    }
    //console.log(server);
    console.log(fasterServer);
    this.setState({
      server: fasterServer,
      selectServer: SelectServerEnum.list,
    });
    await SettingsFileImpl.writeSettings(SettingsNameEnum.server, fasterServer);
    await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, SelectServerEnum.list);
    // message with the result only for advanced users
    if (this.state.mode === ModeEnum.advanced && someServerIsWorking) {
      if (isEqual(actualServer, fasterServer)) {
        this.addLastSnackbar({
          message: this.state.translate('loadedapp.selectingserversame') as string,
          duration: SnackbarDurationEnum.long,
          screenName: [this.screenName],
        });
      } else {
        this.addLastSnackbar({
          message: (this.state.translate('loadedapp.selectingserverbest') as string) + ' ' + fasterServer.uri,
          duration: SnackbarDurationEnum.long,
          screenName: [this.screenName],
        });
      }
    }
    return someServerIsWorking;
  };

  checkServer: (s: ServerType) => Promise<boolean> = async (server: ServerType) => {
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
  };

  walletErrorHandle = async (result: string, title: string, screen: number, start: boolean) => {
    // first check the actual server
    // if the server is not working properly sometimes can take more than one minute to fail.
    if (start && this.state.netInfo.isConnected && this.state.selectServer !== SelectServerEnum.offline) {
      this.addLastSnackbar({
        message: this.state.translate('restarting') as string,
        duration: SnackbarDurationEnum.long,
        screenName: [this.screenName],
      });
    }
    // if no internet connection -> show the error.
    // if Offline mode -> show the error.
    if (!this.state.netInfo.isConnected || this.state.selectServer === SelectServerEnum.offline) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        title,
        result,
        false,
        this.state.translate,
        sendEmail,
        this.state.zingolibVersion,
      );
      this.setState({ actionButtonsDisabled: false, serverErrorTries: 0, screen });
    } else {
      const workingServer = await this.checkServer(this.state.server);
      if (workingServer) {
        // the server is working -> this error is something not related with the server availability
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          [this.screenName],
          title,
          result,
          false,
          this.state.translate,
          sendEmail,
          this.state.zingolibVersion,
        );
        this.setState({ actionButtonsDisabled: false, serverErrorTries: 0, screen });
      } else {
        // let's change to another server
        if (this.state.serverErrorTries === 0) {
          // first try
          this.setState({ screen, actionButtonsDisabled: true });
          this.addLastSnackbar({
            message: this.state.translate('loadingapp.serverfirsttry') as string,
            duration: SnackbarDurationEnum.longer,
            screenName: [this.screenName],
          });
          // a different server.
          const someServerIsWorking = await this.selectTheBestServer(true);
          if (someServerIsWorking) {
            if (start) {
              this.setState({
                startingApp: false,
                serverErrorTries: 1,
                screen,
              });
              this.componentDidMount();
            } else {
              createAlert(
                this.setBackgroundError,
                this.addLastSnackbar,
                [this.screenName],
                title,
                result,
                false,
                this.state.translate,
                sendEmail,
                this.state.zingolibVersion,
              );
              this.setState({ actionButtonsDisabled: false, serverErrorTries: 0, screen });
            }
          } else {
            createAlert(
              this.setBackgroundError,
              this.addLastSnackbar,
              [this.screenName],
              title,
              this.state.translate('loadingapp.noservers') as string,
              false,
              this.state.translate,
              sendEmail,
              this.state.zingolibVersion,
            );
            this.setState({ actionButtonsDisabled: false, serverErrorTries: 0, screen });
          }
        } else {
          // second try
          this.addLastSnackbar({
            message: this.state.translate('loadingapp.serversecondtry') as string,
            duration: SnackbarDurationEnum.longer,
            screenName: [this.screenName],
          });
          setTimeout(() => {
            createAlert(
              this.setBackgroundError,
              this.addLastSnackbar,
              [this.screenName],
              title,
              result,
              false,
              this.state.translate,
              sendEmail,
              this.state.zingolibVersion,
            );
            this.setState({ actionButtonsDisabled: false, serverErrorTries: 0, screen });
          }, 1 * 1000);
        }
      }
    }
  };

  fetchBackgroundSyncInfo = async () => {
    const backgroundSyncInfoJson: BackgroundType = await BackgroundFileImpl.readBackground();
    this.setState({ backgroundSyncInfo: backgroundSyncInfoJson });
  };

  setCustomServerUri = (customServerUri: string) => {
    this.setState({
      customServerUri,
    });
  };

  setCustomServerShow = (customServerShow: boolean) => {
    this.setState({
      customServerShow,
    });
  };

  usingCustomServer = async () => {
    if (!this.state.customServerUri && !this.state.customServerOffline) {
      return;
    }
    this.setState({ actionButtonsDisabled: true });
    if (this.state.customServerOffline) {
      await SettingsFileImpl.writeSettings(SettingsNameEnum.server, {
        uri: '',
        chainName: this.state.server.chainName,
      });
      await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, SelectServerEnum.offline);
      this.setState({
        selectServer: SelectServerEnum.offline,
        server: { uri: '', chainName: this.state.server.chainName },
        customServerShow: false,
        customServerUri: '',
        customServerChainName: this.state.server.chainName,
        customServerOffline: false,
      });
    } else {
      const uri: string = parseServerURI(this.state.customServerUri, this.state.translate);
      const chainName = this.state.customServerChainName;
      if (uri && uri.toLowerCase().startsWith(GlobalConst.error)) {
        this.addLastSnackbar({ message: this.state.translate('settings.isuri') as string, screenName: [this.screenName] });
        this.setState({ actionButtonsDisabled: false });
        return;
      }

      this.addLastSnackbar({ message: this.state.translate('loadedapp.tryingnewserver') as string, screenName: [this.screenName] });

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
        this.setState({
          selectServer: SelectServerEnum.custom,
          server: { uri, chainName },
          customServerShow: false,
          customServerUri: '',
          customServerChainName: this.state.server.chainName,
          customServerOffline: false,
        });
      } else {
        this.addLastSnackbar({
          message: (this.state.translate('loadedapp.changeservernew-error') as string) + uri,
          screenName: [this.screenName],
        });
      }
    }
    this.setState({ actionButtonsDisabled: false });
  };

  navigateToLoadedApp = (readOnly: boolean, orchardPool: boolean, saplingPool: boolean, transparentPool: boolean, newWallet: boolean, firstLaunchingMessage: LaunchingModeEnum) => {
    this.props.navigationApp.reset({
      index: 0,
      routes: [
        {
          name: RouteEnum.LoadedApp,
          params: { readOnly, orchardPool, saplingPool, transparentPool, newWallet, firstLaunchingMessage },
        },
      ],
    });
  };

  createNewWallet = async (goSeedScreen: boolean = true): Promise<void> => {
    if (!this.state.netInfo.isConnected || this.state.selectServer === SelectServerEnum.offline) {
      this.addLastSnackbar({ message: this.state.translate('loadedapp.connection-error') as string, screenName: [this.screenName] });
      return;
    }
    this.setState({ actionButtonsDisabled: true });
    let seed: string = await RPCModule.createNewWallet(
      this.state.server.uri,
      this.state.server.chainName,
      this.state.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );

    if (seed && !seed.toLowerCase().startsWith(GlobalConst.error)) {
      let seedJSON = {} as RPCSeedType;
      try {
        seedJSON = await JSON.parse(seed);
        if (seedJSON.error) {
          this.setState({ actionButtonsDisabled: false });
          createAlert(
            this.setBackgroundError,
            this.addLastSnackbar,
            [this.screenName],
            this.state.translate('loadingapp.creatingwallet-label') as string,
            seedJSON.error,
            false,
            this.state.translate,
            sendEmail,
            this.state.zingolibVersion,
          );
          return;
        }
      } catch (e: unknown) {
        this.setState({ actionButtonsDisabled: false });
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          [this.screenName],
          this.state.translate('loadingapp.creatingwallet-label') as string,
          e instanceof Error ? e.message : String(e),
          false,
          this.state.translate,
          sendEmail,
          this.state.zingolibVersion,
        );
        return;
      }
      const wallet: WalletType = { seed: seedJSON.seed_phrase || '', birthday: seedJSON.birthday || 0 };
      // storing the seed & birthday in KeyChain/KeyStore
      if (this.state.recoveryWalletInfoOnDevice) {
        await createUpdateRecoveryWalletInfo(wallet);
      } else {
        if (this.state.hasRecoveryWalletInfoSaved) {
          await removeRecoveryWalletInfo();
        }
      }
      // basic mode -> same screen.
      this.setState(state => ({
        wallet,
        screen: goSeedScreen ? 2 : state.screen,
        actionButtonsDisabled: false,
        walletExists: true,
      }));
      // creating tor cliente if needed
      if (this.state.currency === CurrencyEnum.USDTORCurrency || this.state.currency === CurrencyEnum.USDCurrency) {
        await RPCModule.createTorClientProcess();
      }
    } else {
      this.walletErrorHandle(seed, this.state.translate('loadingapp.creatingwallet-label') as string, 1, false);
    }
  };

  getwalletToRestore = async () => {
    this.setState({ wallet: {} as WalletType, screen: 3 });
  };

  doRestore = async (seedUfvk: string, birthday: number) => {
    if (!seedUfvk) {
      // no reporting button, no needed.
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadingapp.emptyseedufvk-label') as string,
        this.state.translate('loadingapp.emptyseedufvk-error') as string,
        false,
        this.state.translate,
      );
      return;
    }
    if (seedUfvk.startsWith(GlobalConst.uview)) {
      // it is a UFVK
      let parsingError: boolean = false;
      if (this.state.server.chainName === ChainNameEnum.mainChainName && 
          (seedUfvk.startsWith(GlobalConst.uviewtest) ||
            seedUfvk.startsWith(GlobalConst.uviewregtest))
      ) {
        // the ufvk is not correct
        parsingError = true;
      }
      if (this.state.server.chainName === ChainNameEnum.testChainName && 
          !seedUfvk.startsWith(GlobalConst.uviewtest)
      ) {
        // the ufvk is not correct
        parsingError = true;
      }
      if (this.state.server.chainName === ChainNameEnum.regtestChainName && 
          !seedUfvk.startsWith(GlobalConst.uviewregtest)
      ) {
        // the ufvk is not correct
        parsingError = true;
      }
      if (parsingError) {
        // no reporting button, no needed.
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          [this.screenName],
          this.state.translate('loadingapp.invalidseedufvk-label') as string,
          this.state.translate('loadingapp.invalidseedufvk-error') as string,
          false,
          this.state.translate,
        );
        return;
      }
    }

    let walletBirthday = birthday.toString() || '0';
    if (parseInt(walletBirthday, 10) < 0) {
      walletBirthday = '0';
    }
    if (isNaN(parseInt(walletBirthday, 10))) {
      walletBirthday = '0';
    }

    // birthday cannot be lower than sapling activation height
    if (Number(walletBirthday) < activationHeight[this.state.server.chainName]) {
      // no reporting button, no needed.
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadingapp.invalidbirthday-label') as string,
        this.state.translate('loadingapp.invalidbirthday-error') as string,
        false,
        this.state.translate,
      );
      return;
    }

    this.setState({ actionButtonsDisabled: true });
    let type: RestoreFromTypeEnum = RestoreFromTypeEnum.seedRestoreFrom;
    if (
      seedUfvk.toLowerCase().startsWith(GlobalConst.uview) ||
      seedUfvk.toLowerCase().startsWith(GlobalConst.uviewtest) ||
      seedUfvk.toLowerCase().startsWith(GlobalConst.uviewregtest)
    ) {
      // this is a UFVK
      type = RestoreFromTypeEnum.ufvkRestoreFrom;
    }

    let result: string;
    if (type === RestoreFromTypeEnum.seedRestoreFrom) {
      result = await RPCModule.restoreWalletFromSeed(
        seedUfvk.toLowerCase(),
        walletBirthday || '0',
        this.state.server.uri,
        this.state.server.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
    } else {
      result = await RPCModule.restoreWalletFromUfvk(
        seedUfvk.toLowerCase(),
        walletBirthday || '0',
        this.state.server.uri,
        this.state.server.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
    }

    //console.log(seedUfvk);
    //console.log(result);
    let error = false;
    let errorText = '';
    if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
      try {
        // here result can have an `error` field for watch-only which is actually OK.
        const resultJson: RPCSeedType & RPCUfvkType = await JSON.parse(result);
        if (!resultJson.error) {
          // storing the seed/ufvk & birthday in KeyChain/KeyStore
          if (this.state.recoveryWalletInfoOnDevice) {
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
            if (this.state.hasRecoveryWalletInfoSaved) {
              await removeRecoveryWalletInfo();
            }
          }
          // when restore a wallet never the user needs that the seed screen shows up with the first funds received.
          await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
          // Load the wallet and navigate to the vts screen
          let readOnly: boolean = false;
          let orchardPool: boolean = false;
          let saplingPool: boolean = false;
          let transparentPool: boolean = false;
          const walletKindStr: string = await RPCModule.walletKindInfo();
          console.log('KIND...', walletKindStr);
          try {
            const walletKindJSON: RPCWalletKindType = await JSON.parse(walletKindStr);
            //console.log('KIND... JSON', walletKindJSON);
            // there are 4 kinds:
            // 1. seed
            // 2. USK
            // 3. UFVK - watch-only wallet
            // 4. No keys - watch-only wallet (possibly an error)

            if (
              walletKindJSON.kind === RPCWalletKindEnum.LoadedFromUnifiedFullViewingKey ||
              walletKindJSON.kind === RPCWalletKindEnum.NoKeysFound
            ) {
              readOnly = true;
            } else {
              readOnly = false;
            }
            orchardPool = walletKindJSON.orchard;
            saplingPool = walletKindJSON.sapling;
            transparentPool = walletKindJSON.transparent;
            // if the seed & birthday are not stored in Keychain/Keystore, do it now.
            if (this.state.recoveryWalletInfoOnDevice) {
              const wallet: WalletType = await RPC.rpcFetchWallet(readOnly);
              await createUpdateRecoveryWalletInfo(wallet);
            } else {
              // needs to delete the seed from the Keychain/Keystore, do it now.
              if (this.state.hasRecoveryWalletInfoSaved) {
                await removeRecoveryWalletInfo();
              }
            }
            this.setState({
              readOnly,
              orchardPool,
              saplingPool,
              transparentPool,
              actionButtonsDisabled: false,
            });
          } catch (e) {
            //console.log('CATCH ERROR', walletKindStr);
            this.setState({
              readOnly,
              orchardPool,
              saplingPool,
              transparentPool,
              actionButtonsDisabled: false,
            });
            this.addLastSnackbar({ message: walletKindStr, screenName: [this.screenName] });
          }
          // creating tor cliente if needed
          if (this.state.currency === CurrencyEnum.USDTORCurrency || this.state.currency === CurrencyEnum.USDCurrency) {
            await RPCModule.createTorClientProcess();
          }
          this.navigateToLoadedApp(readOnly, orchardPool, saplingPool, transparentPool, true, this.state.firstLaunchingMessage);
        } else {
          error = true;
          errorText = resultJson.error;
        }
      } catch (e: unknown) {
        error = true;
        errorText = e instanceof Error ? e.message : String(e);
      }
    } else {
      error = true;
      errorText = result;
    }
    if (error) {
      this.walletErrorHandle(errorText, this.state.translate('loadingapp.readingwallet-label') as string, 3, false);
    }
  };

  setPrivacyOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, value);
    this.setState({
      privacy: value as boolean,
    });
  };

  setBackgroundError = (title: string, error: string) => {
    this.setState({ backgroundError: { title, error } });
  };

  customServer = () => {
    this.setState({ customServerShow: true });
  };

  onPressServerChainName = (chain: ChainNameEnum) => {
    this.setState({ customServerChainName: chain });
  };

  onPressServerOffline = (value: boolean) => {
    this.setState({ customServerOffline: value });
  };

  addLastSnackbar = (snackbar: SnackbarType) => {
    const newSnackbars = this.state.snackbars;
    // if the last one is the same don't do anything.
    if (newSnackbars.length > 0 && newSnackbars[newSnackbars.length - 1].message === snackbar.message) {
      return;
    }
    newSnackbars.push(snackbar);
    this.setState({ snackbars: newSnackbars });
  };

  removeFirstSnackbar = () => {
    const newSnackbars = this.state.snackbars;
    newSnackbars.shift();
    this.setState({ snackbars: newSnackbars });
  };

  changeMode = async (mode: ModeEnum.basic | ModeEnum.advanced) => {
    this.setState({ mode, screen: 0 });
    await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, mode);
    this.props.toggleTheme(mode);
    // if the user selects advanced mode & wants to change to another wallet
    // and then the user wants to go to basic mode in the first screen
    // the result will be the same -> create a new wallet.
    this.componentDidMount();
  };

  recoverRecoveryWalletInfo = async (security: boolean) => {
    // recover the wallet keys from the device
    const wallet = await getRecoveryWalletInfo();
    // in IOS the App + OS needs some time to close the biometric screen
    // then the Alert can be too fast.
    if (wallet.seed || wallet.ufvk) {
      const txt = (wallet.seed || wallet.ufvk) + '\n\n' + wallet.birthday;
      setTimeout(
        () => {
          Alert.alert(
            this.props.translate('loadedapp.walletseed-basic') as string,
            (security ? '' : ((this.props.translate('loadingapp.recoverkeysinstall') + '\n\n') as string)) + txt,
            [
              {
                text: this.props.translate('copy') as string,
                onPress: () => {
                  Clipboard.setString(txt);
                  this.addLastSnackbar({
                    message: this.props.translate('txtcopied') as string,
                    duration: SnackbarDurationEnum.short,
                    screenName: [this.screenName],
                  });
                },
              },
              { text: this.props.translate('cancel') as string, style: 'cancel' },
            ],
            { cancelable: false },
          );
          // IOS needs time to close the biometric screen.
          // but Android I don't think so, a little bit Just in case.
        },
        Platform.OS === GlobalConst.platformOSios ? 2 * 1000 : 100,
      );
    }
  };

  openCurrentWallet = () => {
    // to avoid the biometric security
    this.setState({
      startingApp: false,
    });
    this.componentDidMount();
  };

  async fetchZingolibVersion(): Promise<void> {
    try {
      const start = Date.now();
      let zingolibStr: string = await RPCModule.getVersionInfo();
      if (Date.now() - start > 4000) {
        console.log('=========================================== > zingolib version - ', Date.now() - start);
      }
      if (zingolibStr) {
        if (zingolibStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error zingolib version ${zingolibStr}`);
          zingolibStr = GlobalConst.zingolibError;
        }
      } else {
        console.log('Internal Error zingolib version');
        zingolibStr = GlobalConst.zingolibNone;
      }

      //const start2 = Date.now();
      this.setState({
        zingolibVersion: zingolibStr,
      });
      //console.log('=========================================== > set zingolib version - ', Date.now() - start2);
    } catch (error) {
      console.log(`Critical Error info ${error}`);
      return;
    }
  }


  render() {
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
      readOnly,
      orchardPool,
      saplingPool,
      transparentPool,
    } = this.state;

    //console.log('render loadingAppClass - 3', this.state.privacy);

    const context = {
      // context
      netInfo: this.state.netInfo,
      wallet: this.state.wallet,
      zecPrice: this.state.zecPrice,
      backgroundSyncInfo: this.state.backgroundSyncInfo,
      translate: this.state.translate,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      orchardPool: this.state.orchardPool,
      saplingPool: this.state.saplingPool,
      transparentPool: this.state.transparentPool,
      snackbars: this.state.snackbars,
      addLastSnackbar: this.state.addLastSnackbar,
      removeFirstSnackbar: this.removeFirstSnackbar,
      zingolibVersion: this.state.zingolibVersion,
      setPrivacyOption: this.setPrivacyOption,

      // settings
      server: this.state.server,
      currency: this.state.currency,
      language: this.state.language,
      sendAll: this.state.sendAll,
      donation: this.state.donation,
      privacy: this.state.privacy,
      mode: this.state.mode,
      security: this.state.security,
      selectServer: this.state.selectServer,
      rescanMenu: this.state.rescanMenu,
      recoveryWalletInfoOnDevice: this.state.recoveryWalletInfoOnDevice,
      performanceLevel: this.state.performanceLevel,
      blockExplorer: this.state.blockExplorer,
    };

    return (
      <ToastProvider>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={this.removeFirstSnackbar}
          screenName={this.screenName}
        />

        <ContextAppLoadingProvider value={context}>
          {screen === 0 && (
            <Launching
              translate={translate}
              firstLaunchingMessage={firstLaunchingMessage}
              biometricsFailed={biometricsFailed}
              tryAgain={() => {
                this.setState({ biometricsFailed: false }, () => this.componentDidMount());
              }}
            />
          )}
          {screen === 1 && (
            <StartMenu
              actionButtonsDisabled={actionButtonsDisabled}
              hasRecoveryWalletInfoSaved={hasRecoveryWalletInfoSaved}
              recoverRecoveryWalletInfo={this.recoverRecoveryWalletInfo}
              changeMode={this.changeMode}
              customServer={this.customServer}
              customServerShow={customServerShow}
              customServerOffline={customServerOffline}
              onPressServerOffline={this.onPressServerOffline}
              customServerChainName={customServerChainName}
              onPressServerChainName={this.onPressServerChainName}
              customServerUri={customServerUri}
              setCustomServerUri={this.setCustomServerUri}
              usingCustomServer={this.usingCustomServer}
              setCustomServerShow={this.setCustomServerShow}
              walletExists={walletExists}
              openCurrentWallet={this.openCurrentWallet}
              createNewWallet={this.createNewWallet}
              getwalletToRestore={this.getwalletToRestore}
            />
          )}
          {screen === 2 && wallet && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={screen === 2}
              onRequestClose={() => this.navigateToLoadedApp(readOnly, orchardPool, saplingPool, transparentPool, true, firstLaunchingMessage)}>
              <NewSeed
                onClickOK={() => this.navigateToLoadedApp(readOnly, orchardPool, saplingPool, transparentPool, true, firstLaunchingMessage)}
              />
            </Modal>
          )}
          {screen === 3 && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={screen === 3}
              onRequestClose={() => this.setState({ screen: 1 })}>
              <ImportUfvk
                onClickOK={(s: string, b: number) => this.doRestore(s, b)}
                onClickCancel={() => this.setState({ screen: 1 })}
              />
            </Modal>
          )}
        </ContextAppLoadingProvider>
      </ToastProvider>
    );
  }
}
