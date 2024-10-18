/* eslint-disable react-native/no-inline-styles */
import React, { Component, useState, useMemo, useEffect } from 'react';
import {
  View,
  Alert,
  SafeAreaView,
  Image,
  Text,
  Modal,
  ScrollView,
  I18nManager,
  EmitterSubscription,
  AppState,
  NativeEventSubscription,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { useTheme } from '@react-navigation/native';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { StackScreenProps } from '@react-navigation/stack';
import NetInfo, { NetInfoStateType, NetInfoSubscription } from '@react-native-community/netinfo';

import OptionsMenu from 'react-native-option-menu';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

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
  ButtonTypeEnum,
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
import Launching from './Launching';
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
import BoldText from '../../components/Components/BoldText';
import Button from '../../components/Components/Button';
import Seed from '../../components/Seed';
import ImportUfvk from '../../components/Ufvk/ImportUfvk';
import ChainTypeToggle from '../../components/Components/ChainTypeToggle';
import { sendEmail } from '../sendEmail';
import { RPCWalletKindEnum } from '../rpc/enums/RPCWalletKindEnum';

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
  const theme = useTheme() as unknown as ThemeType;
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

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      const { languageTag, isRTL } = RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

      // update layout direction
      I18nManager.forceRTL(isRTL);

      //I have to check what language and other things are in the settings
      const settings = await SettingsFileImpl.readSettings();
      //console.log(settings);

      // checking the version of the App in settings
      //console.log('versions, old:', settings.version, ' new:', translate('version') as string);
      if (settings.version === null) {
        // this is a fresh install
        setFirstLaunchingMessage(false);
      } else if (settings.version === '' || settings.version !== (translate('version') as string)) {
        // this is an update
        setFirstLaunchingMessage(true);
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
        settings.language === LanguageEnum.ru
      ) {
        setLanguage(settings.language);
        i18n.locale = settings.language;
        //console.log('apploading settings', settings.language, settings.currency);
      } else {
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
        //console.log('apploading NO settings', languageTag);
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
        settings.selectServer === SelectServerEnum.list
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

      // for testing
      //await delay(5000);

      // reading background task info
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
      <SafeAreaView
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}>
        <Launching translate={translate} firstLaunchingMessage={false} biometricsFailed={false} />
      </SafeAreaView>
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

export class LoadingAppClass extends Component<LoadingAppClassProps, LoadingAppClassState> {
  dim: EmitterSubscription;
  appstate: NativeEventSubscription;
  unsubscribeNetInfo: NetInfoSubscription;

  constructor(props: LoadingAppClassProps) {
    super(props);

    let netInfo: NetInfoType = {} as NetInfoType;
    NetInfo.fetch().then(state => {
      //console.log(state);
      netInfo = {
        isConnected: state.isConnected,
        type: state.type,
        isConnectionExpensive: state.details && state.details.isConnectionExpensive,
      };
    });

    this.state = {
      // context
      navigation: props.navigation,
      netInfo: netInfo,
      wallet: {} as WalletType,
      info: {} as InfoType,
      zecPrice: {} as ZecPriceType,
      background: props.background,
      translate: props.translate,
      backgroundError: {} as BackgroundErrorType,
      setBackgroundError: this.setBackgroundError,
      readOnly: false,
      snackbars: [] as SnackbarType[],
      addLastSnackbar: this.addLastSnackbar,

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
      screen: !!props.route.params && !!props.route.params.screen ? props.route.params.screen : 0,
      actionButtonsDisabled: !netInfo.isConnected ? true : false,
      walletExists: false,
      customServerShow: false,
      customServerUri: '',
      customServerChainName: ChainNameEnum.mainChainName,
      biometricsFailed:
        !!props.route.params &&
        (props.route.params.biometricsFailed === true || props.route.params.biometricsFailed === false)
          ? props.route.params.biometricsFailed
          : false,
      startingApp:
        !!props.route.params && (props.route.params.startingApp === true || props.route.params.startingApp === false)
          ? props.route.params.startingApp
          : true,
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
      setTimeout(() => {
        this.addLastSnackbar({
          message: this.state.translate('loadedapp.selectingserver') as string,
          duration: SnackbarDurationEnum.longer,
        });
      }, 1000);
      // not a different one, can be the same.
      const someServerIsWorking = await this.selectTheBestServer(false);
      console.log('some server is working?', someServerIsWorking);
    }

    // Second, check if a wallet exists. Do it async so the basic screen has time to render
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    const exists = await RPCModule.walletExists();
    //console.log('Wallet Exists result', this.state.screen, exists);

    if (exists && exists !== GlobalConst.false) {
      this.setState({ walletExists: true });
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        let result: string = await RPCModule.loadExistingWallet(this.state.server.uri, this.state.server.chainName);

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
              // Load the wallet and navigate to the ValueTransfers screen
              const walletKindStr: string = await RPCModule.execute(CommandEnum.walletKind, '');
              //console.log(walletKindStr);
              try {
                const walletKindJSON: RPCWalletKindType = await JSON.parse(walletKindStr);
                console.log(walletKindJSON);
                // there are 4 kinds:
                // 1. seed
                // 2. USK
                // 3. UFVK - watch-only wallet
                // 4. No keys - watch-only wallet (possibly an error)

                // if the seed & birthday are not stored in Keychain/Keystore, do it now.
                if (this.state.recoveryWalletInfoOnDevice) {
                  if (
                    walletKindJSON.kind === RPCWalletKindEnum.LoadedFromSeedPhrase ||
                    walletKindJSON.kind === RPCWalletKindEnum.LoadedFromUnifiedSpendingKey
                  ) {
                    const wallet: WalletType = await RPC.rpcFetchWallet(false);
                    await createUpdateRecoveryWalletInfo(wallet);
                  }
                } else {
                  // needs to delete the seed from the Keychain/Keystore, do it now.
                  await removeRecoveryWalletInfo();
                }
                this.setState({
                  readOnly:
                    walletKindJSON.kind === RPCWalletKindEnum.LoadedFromUnifiedFullViewingKey ||
                    walletKindJSON.kind === RPCWalletKindEnum.NoKeysFound
                      ? true
                      : false,
                  actionButtonsDisabled: false,
                });
              } catch (e) {
                //console.log(walletKindStr);
                this.setState({
                  readOnly: false,
                  actionButtonsDisabled: false,
                });
                this.addLastSnackbar({ message: walletKindStr });
              }
              this.navigateToLoadedApp();
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
          await this.walletErrorHandle(
            errorText,
            this.state.translate('loadingapp.readingwallet-label') as string,
            1,
            true,
          );
        }
      } else {
        this.setState({ screen: 1, actionButtonsDisabled: false });
        this.addLastSnackbar({
          message: this.state.translate('loadedapp.connection-error') as string,
        });
      }
    } else {
      //console.log('Loading new wallet', this.state.screen, this.state.walletExists);
      if (this.state.mode === ModeEnum.basic) {
        // setting the prop basicFirstViewSeed to false.
        // this means when the user have funds, the seed screen will show up.
        await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, false);
        if (this.state.hasRecoveryWalletInfoSaved) {
          // but first we need to check if exists some seed stored in the device from a previous installation (IOS)
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
          this.createNewWallet(false);
          this.setState({ actionButtonsDisabled: false });
          this.navigateToLoadedApp();
          //console.log('navigate to LoadedApp');
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
      //console.log('LOADING', 'next', nextAppState, 'prior', this.state.appState);
      if (
        (this.state.appStateStatus === AppStateStatusEnum.inactive ||
          this.state.appStateStatus === AppStateStatusEnum.background) &&
        nextAppState === AppStateStatusEnum.active
      ) {
        //console.log('App LOADING has come to the foreground!');
        // reading background task info
        this.fetchBackgroundSyncing();
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
        if (this.state.backgroundError && (this.state.backgroundError.title || this.state.backgroundError.error)) {
          Alert.alert(this.state.backgroundError.title, this.state.backgroundError.error);
          this.setBackgroundError('', '');
        }
      }
      if (
        (nextAppState === AppStateStatusEnum.inactive || nextAppState === AppStateStatusEnum.background) &&
        this.state.appStateStatus === AppStateStatusEnum.active
      ) {
        //console.log('App LOADING is gone to the background!');
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
      }
      this.setState({ appStateStatus: nextAppState });
    });

    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
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
          actionButtonsDisabled: true,
        });
        if (isConnected !== state.isConnected) {
          if (!state.isConnected) {
            //console.log('EVENT Loading: No internet connection.');
            this.addLastSnackbar({
              message: this.state.translate('loadedapp.connection-error') as string,
            });
          } else {
            //console.log('EVENT Loading: YESSSSS internet connection.');
            if (screen !== 0) {
              this.setState({ screen: screen === 3 ? 3 : screen !== 0 ? 1 : 0 });
              // I need some time until the network is fully ready.
              setTimeout(() => this.componentDidMount(), 1000);
            }
          }
        }
      }
    });
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
        { cancelable: false, userInterfaceStyle: 'light' },
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
      // the 30 seconds timout was fired.
      someServerIsWorking = false;
    }
    console.log(server);
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
        });
      } else {
        this.addLastSnackbar({
          message: (this.state.translate('loadedapp.selectingserverbest') as string) + ' ' + fasterServer.uri,
          duration: SnackbarDurationEnum.long,
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
    if (start) {
      this.addLastSnackbar({
        message: this.state.translate('restarting') as string,
        duration: SnackbarDurationEnum.long,
      });
    }
    const workingServer = await this.checkServer(this.state.server);
    if (workingServer) {
      // the server is working -> this error is something not related with the server availability
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        title,
        result,
        false,
        this.state.translate,
        sendEmail,
        this.state.info.zingolib,
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
              title,
              result,
              false,
              this.state.translate,
              sendEmail,
              this.state.info.zingolib,
            );
            this.setState({ actionButtonsDisabled: false, serverErrorTries: 0, screen });
          }
        } else {
          createAlert(
            this.setBackgroundError,
            this.addLastSnackbar,
            title,
            this.state.translate('loadingapp.noservers') as string,
            false,
            this.state.translate,
            sendEmail,
            this.state.info.zingolib,
          );
          this.setState({ actionButtonsDisabled: false, serverErrorTries: 0, screen });
        }
      } else {
        // second try
        this.addLastSnackbar({
          message: this.state.translate('loadingapp.serversecondtry') as string,
          duration: SnackbarDurationEnum.longer,
        });
        setTimeout(() => {
          createAlert(
            this.setBackgroundError,
            this.addLastSnackbar,
            title,
            result,
            false,
            this.state.translate,
            sendEmail,
            this.state.info.zingolib,
          );
          this.setState({ actionButtonsDisabled: false, serverErrorTries: 0, screen });
        }, 1000);
      }
    }
  };

  fetchBackgroundSyncing = async () => {
    const backgroundJson: BackgroundType = await BackgroundFileImpl.readBackground();
    if (backgroundJson) {
      this.setState({ background: backgroundJson });
    }
  };

  usingCustomServer = async () => {
    if (!this.state.customServerUri) {
      return;
    }
    this.setState({ actionButtonsDisabled: true });
    const uri: string = parseServerURI(this.state.customServerUri, this.state.translate);
    const chainName = this.state.customServerChainName;
    if (uri.toLowerCase().startsWith(GlobalConst.error)) {
      this.addLastSnackbar({ message: this.state.translate('settings.isuri') as string });
      this.setState({ actionButtonsDisabled: false });
      return;
    }

    this.state.addLastSnackbar({ message: this.state.translate('loadedapp.tryingnewserver') as string });

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
      this.setState({
        server: { uri, chainName },
        customServerShow: false,
        customServerUri: '',
        customServerChainName: ChainNameEnum.mainChainName,
      });
    } else {
      this.state.addLastSnackbar({
        message: (this.state.translate('loadedapp.changeservernew-error') as string) + uri,
      });
    }
    this.setState({ actionButtonsDisabled: false });
  };

  navigateToLoadedApp = () => {
    const { navigation } = this.state;
    navigation.reset({
      index: 0,
      routes: [{ name: RouteEnums.LoadedApp, params: { readOnly: this.state.readOnly } }],
    });
  };

  createNewWallet = (goSeedScreen: boolean = true) => {
    this.setState({ actionButtonsDisabled: true });
    setTimeout(async () => {
      let seed: string = await RPCModule.createNewWallet(this.state.server.uri, this.state.server.chainName);

      if (seed && !seed.toLowerCase().startsWith(GlobalConst.error)) {
        let seedJSON = {} as RPCSeedType;
        try {
          seedJSON = JSON.parse(seed);
          if (seedJSON.error) {
            this.setState({ actionButtonsDisabled: false });
            createAlert(
              this.setBackgroundError,
              this.addLastSnackbar,
              this.state.translate('loadingapp.creatingwallet-label') as string,
              seedJSON.error,
              false,
              this.state.translate,
              sendEmail,
              this.state.info.zingolib,
            );
            return;
          }
        } catch (e) {
          this.setState({ actionButtonsDisabled: false });
          createAlert(
            this.setBackgroundError,
            this.addLastSnackbar,
            this.state.translate('loadingapp.creatingwallet-label') as string,
            JSON.stringify(e),
            false,
            this.state.translate,
            sendEmail,
            this.state.info.zingolib,
          );
          return;
        }
        const wallet: WalletType = { seed: seedJSON.seed || '', birthday: seedJSON.birthday || 0 };
        // default values for wallet options
        this.setWalletOption(WalletOptionEnum.downloadMemos, DownloadMemosEnum.walletMemos);
        // storing the seed & birthday in KeyChain/KeyStore
        if (this.state.recoveryWalletInfoOnDevice) {
          await createUpdateRecoveryWalletInfo(wallet);
        } else {
          await removeRecoveryWalletInfo();
        }
        // basic mode -> same screen.
        this.setState(state => ({
          wallet,
          screen: goSeedScreen ? 2 : state.screen,
          actionButtonsDisabled: false,
          walletExists: true,
        }));
      } else {
        this.walletErrorHandle(seed, this.state.translate('loadingapp.creatingwallet-label') as string, 1, false);
      }
    });
  };

  getwalletToRestore = async () => {
    this.setState({ wallet: {} as WalletType, screen: 3 });
  };

  doRestore = async (seedUfvk: string, birthday: number) => {
    if (!seedUfvk) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadingapp.emptyseedufvk-label') as string,
        this.state.translate('loadingapp.emptyseedufvk-error') as string,
        false,
        this.state.translate,
        sendEmail,
        this.state.info.zingolib,
      );
      return;
    }
    if (
      (seedUfvk.toLowerCase().startsWith(GlobalConst.uview) &&
        this.state.server.chainName !== ChainNameEnum.mainChainName) ||
      (seedUfvk.toLowerCase().startsWith(GlobalConst.utestview) &&
        this.state.server.chainName === ChainNameEnum.mainChainName)
    ) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadingapp.invalidseedufvk-label') as string,
        this.state.translate('loadingapp.invalidseedufvk-error') as string,
        false,
        this.state.translate,
        sendEmail,
        this.state.info.zingolib,
      );
      return;
    }

    this.setState({ actionButtonsDisabled: true });
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
        );
      } else {
        result = await RPCModule.restoreWalletFromUfvk(
          seedUfvk.toLowerCase(),
          walletBirthday || '0',
          this.state.server.uri,
          this.state.server.chainName,
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
            if (this.state.recoveryWalletInfoOnDevice) {
              if (type === RestoreFromTypeEnum.seedRestoreFrom) {
                const wallet: WalletType = { seed: seedUfvk.toLowerCase(), birthday: Number(walletBirthday) };
                await createUpdateRecoveryWalletInfo(wallet);
              }
            } else {
              await removeRecoveryWalletInfo();
            }
            // when restore a wallet never the user needs that the seed screen shows up with the first funds received.
            await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
            this.setState({
              actionButtonsDisabled: false,
              readOnly: type === RestoreFromTypeEnum.seedRestoreFrom ? false : true,
            });
            this.navigateToLoadedApp();
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
        this.walletErrorHandle(errorText, this.state.translate('loadingapp.readingwallet-label') as string, 3, false);
      }
    });
  };

  setWalletOption = async (walletOption: string, value: string) => {
    await RPC.rpcSetWalletSettingOption(walletOption, value);
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
    if (this.state.netInfo.isConnected) {
      this.setState({ customServerShow: true });
    } else {
      this.addLastSnackbar({ message: this.state.translate('loadedapp.connection-error') as string });
    }
  };

  onPressServerChainName = (chain: ChainNameEnum) => {
    this.setState({ customServerChainName: chain });
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
    const resultBio = security ? await simpleBiometrics({ translate: this.props.translate }) : true;
    // can be:
    // - true      -> the user do pass the authentication
    // - false     -> the user do NOT pass the authentication
    // - undefined -> no biometric authentication available -> Passcode.
    //console.log('BIOMETRIC --------> ', resultBio);
    if (resultBio === false) {
      // snack with Error & closing the menu.
      this.addLastSnackbar({ message: this.props.translate('biometrics-error') as string });
    } else {
      // recover the wallet keys from the device
      const wallet = await getRecoveryWalletInfo();
      const txt = wallet.seed + '\n\n' + wallet.birthday;
      Alert.alert(
        this.props.translate('loadedapp.walletseed-basic') as string,
        (security ? '' : ((this.props.translate('loadingapp.recoverseedinstall') + '\n\n') as string)) + txt,
        [
          {
            text: this.props.translate('copy') as string,
            onPress: () => {
              Clipboard.setString(txt);
              this.addLastSnackbar({
                message: this.props.translate('txtcopied') as string,
                duration: SnackbarDurationEnum.short,
              });
            },
          },
          { text: this.props.translate('cancel') as string, style: 'cancel' },
        ],
        { cancelable: false, userInterfaceStyle: 'light' },
      );
    }
  };

  render() {
    const {
      screen,
      wallet,
      actionButtonsDisabled,
      walletExists,
      server,
      netInfo,
      customServerShow,
      customServerUri,
      customServerChainName,
      snackbars,
      mode,
      firstLaunchingMessage,
      biometricsFailed,
      translate,
      hasRecoveryWalletInfoSaved,
    } = this.state;
    const { colors } = this.props.theme;

    //console.log('render loadingAppClass - 3', translate('version'));

    const context = {
      // context
      navigation: this.state.navigation,
      netInfo: this.state.netInfo,
      wallet: this.state.wallet,
      info: this.state.info,
      zecPrice: this.state.zecPrice,
      background: this.state.background,
      translate: this.state.translate,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      snackbars: this.state.snackbars,
      addLastSnackbar: this.state.addLastSnackbar,

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
    };

    return (
      <ContextAppLoadingProvider value={context}>
        <SafeAreaView
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            backgroundColor: colors.background,
          }}>
          <Snackbars snackbars={snackbars} removeFirstSnackbar={this.removeFirstSnackbar} translate={translate} />

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
            <View style={{ width: '100%', height: '100%' }}>
              <View
                style={{
                  backgroundColor: colors.card,
                  padding: 10,
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  zIndex: 999,
                }}>
                {netInfo.isConnected && !actionButtonsDisabled && (
                  <>
                    {mode === ModeEnum.basic ? (
                      <OptionsMenu
                        customButton={<FontAwesomeIcon icon={faEllipsisV} color={'#ffffff'} size={40} />}
                        buttonStyle={{ width: 40, padding: 10, resizeMode: 'contain' }}
                        destructiveIndex={5}
                        options={
                          hasRecoveryWalletInfoSaved
                            ? [
                                translate('loadingapp.recoverseed'),
                                translate('loadingapp.advancedmode'),
                                translate('cancel'),
                              ]
                            : [translate('loadingapp.advancedmode'), translate('cancel')]
                        }
                        actions={
                          hasRecoveryWalletInfoSaved
                            ? [() => this.recoverRecoveryWalletInfo(true), () => this.changeMode(ModeEnum.advanced)]
                            : [() => this.changeMode(ModeEnum.advanced)]
                        }
                      />
                    ) : (
                      <OptionsMenu
                        customButton={<FontAwesomeIcon icon={faEllipsisV} color={'#ffffff'} size={40} />}
                        buttonStyle={{ width: 40, padding: 10, resizeMode: 'contain' }}
                        destructiveIndex={5}
                        options={
                          hasRecoveryWalletInfoSaved
                            ? [translate('loadingapp.recoverseed'), translate('loadingapp.custom'), translate('cancel')]
                            : [translate('loadingapp.custom'), translate('cancel')]
                        }
                        actions={
                          hasRecoveryWalletInfoSaved
                            ? [() => this.recoverRecoveryWalletInfo(true), this.customServer]
                            : [this.customServer]
                        }
                      />
                    )}
                  </>
                )}
              </View>
              <ScrollView
                style={{ maxHeight: '100%' }}
                contentContainerStyle={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                  padding: 20,
                }}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <View style={{ marginBottom: 30, display: 'flex', alignItems: 'center' }}>
                    <Text style={{ color: colors.zingo, fontSize: 40, fontWeight: 'bold' }}>
                      {translate('zingo') as string}
                    </Text>
                    <Text style={{ color: colors.zingo, fontSize: 15 }}>{translate('version') as string}</Text>
                    <Image
                      source={require('../../assets/img/logobig-zingo.png')}
                      style={{ width: 100, height: 100, resizeMode: 'contain', marginTop: 10, borderRadius: 10 }}
                    />
                  </View>

                  {netInfo.isConnected && (
                    <>
                      <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                        {`${translate('loadingapp.actualserver') as string} [${
                          translate(`settings.value-chainname-${server.chainName}`) as string
                        }]`}
                      </BoldText>
                      <BoldText style={{ fontSize: 15, marginBottom: 10 }}>{server.uri}</BoldText>
                    </>
                  )}

                  {customServerShow && (
                    <View
                      style={{
                        borderColor: colors.primaryDisabled,
                        borderWidth: 1,
                        paddingTop: 10,
                        paddingLeft: 10,
                        paddingRight: 10,
                        marginBottom: 5,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                      <ChainTypeToggle
                        customServerChainName={customServerChainName}
                        onPress={this.onPressServerChainName}
                        translate={translate}
                      />
                      <View
                        style={{
                          borderColor: colors.border,
                          borderWidth: 1,
                          marginBottom: 10,
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: '50%',
                          minHeight: 48,
                          alignItems: 'center',
                        }}>
                        <TextInput
                          placeholder={GlobalConst.serverPlaceHolder}
                          placeholderTextColor={colors.placeholder}
                          style={{
                            color: colors.text,
                            fontWeight: '600',
                            fontSize: 18,
                            minWidth: '90%',
                            minHeight: 48,
                            marginLeft: 5,
                            backgroundColor: 'transparent',
                          }}
                          value={customServerUri}
                          onChangeText={(text: string) => this.setState({ customServerUri: text })}
                          editable={true}
                          maxLength={100}
                        />
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        <Button
                          type={ButtonTypeEnum.Primary}
                          title={translate('save') as string}
                          disabled={actionButtonsDisabled}
                          onPress={this.usingCustomServer}
                          style={{ marginBottom: 10 }}
                        />
                        <Button
                          type={ButtonTypeEnum.Secondary}
                          title={translate('cancel') as string}
                          disabled={actionButtonsDisabled}
                          onPress={() => this.setState({ customServerShow: false })}
                          style={{ marginBottom: 10, marginLeft: 10 }}
                        />
                      </View>
                    </View>
                  )}

                  {(!netInfo.isConnected ||
                    netInfo.type === NetInfoStateType.cellular ||
                    netInfo.isConnectionExpensive) && (
                    <>
                      <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                        {translate('report.networkstatus') as string}
                      </BoldText>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'flex-end',
                          marginHorizontal: 20,
                        }}>
                        <View style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                          {!netInfo.isConnected && (
                            <BoldText style={{ fontSize: 15, color: 'red' }}>
                              {' '}
                              {translate('report.nointernet') as string}{' '}
                            </BoldText>
                          )}
                          {netInfo.type === NetInfoStateType.cellular && (
                            <BoldText style={{ fontSize: 15, color: 'yellow' }}>
                              {' '}
                              {translate('report.cellulardata') as string}{' '}
                            </BoldText>
                          )}
                          {netInfo.isConnectionExpensive && (
                            <BoldText style={{ fontSize: 15, color: 'yellow' }}>
                              {' '}
                              {translate('report.connectionexpensive') as string}{' '}
                            </BoldText>
                          )}
                        </View>
                      </View>
                    </>
                  )}

                  {netInfo.isConnected && walletExists && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        marginHorizontal: 20,
                        marginBottom: 20,
                      }}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          marginTop: 10,
                          borderColor: colors.primary,
                          borderWidth: 1,
                          borderRadius: 5,
                          padding: 5,
                        }}>
                        <BoldText style={{ fontSize: 15, color: colors.primaryDisabled }}>
                          {translate('loadingapp.noopenwallet-message') as string}
                        </BoldText>
                      </View>
                    </View>
                  )}

                  {netInfo.isConnected && (
                    <Button
                      testID="loadingapp.createnewwallet"
                      type={ButtonTypeEnum.Primary}
                      title={translate('loadingapp.createnewwallet') as string}
                      disabled={actionButtonsDisabled}
                      onPress={() => {
                        if (walletExists) {
                          Alert.alert(
                            translate('loadingapp.alert-newwallet-title') as string,
                            translate('loadingapp.alert-newwallet-body') as string,
                            [
                              {
                                text: translate('confirm') as string,
                                onPress: () => this.createNewWallet(),
                              },
                              { text: translate('cancel') as string, style: 'cancel' },
                            ],
                            { cancelable: false, userInterfaceStyle: 'light' },
                          );
                        } else {
                          this.createNewWallet();
                        }
                      }}
                      style={{ marginBottom: mode === ModeEnum.advanced ? 10 : 30, marginTop: 10 }}
                    />
                  )}

                  {netInfo.isConnected && walletExists && (
                    <Button
                      type={ButtonTypeEnum.Primary}
                      title={translate('loadingapp.opencurrentwallet') as string}
                      disabled={actionButtonsDisabled}
                      onPress={() => {
                        // to avoid the biometric security
                        this.setState({
                          startingApp: false,
                        });
                        this.componentDidMount();
                      }}
                      style={{ marginBottom: 10 }}
                    />
                  )}

                  {netInfo.isConnected && (
                    <View style={{ marginTop: 20, display: 'flex', alignItems: 'center' }}>
                      <Button
                        testID="loadingapp.restorewalletseedufvk"
                        type={ButtonTypeEnum.Secondary}
                        title={translate('loadingapp.restorewalletseedufvk') as string}
                        disabled={actionButtonsDisabled}
                        onPress={() => this.getwalletToRestore()}
                        style={{ marginBottom: 10 }}
                      />
                    </View>
                  )}

                  {!netInfo.isConnected && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        marginHorizontal: 20,
                      }}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          marginTop: 20,
                          borderColor: colors.primary,
                          borderWidth: 1,
                          borderRadius: 5,
                          padding: 5,
                        }}>
                        <BoldText style={{ fontSize: 15, color: colors.primaryDisabled }}>
                          {translate('loadingapp.nointernet-message') as string}
                        </BoldText>
                      </View>
                    </View>
                  )}

                  {netInfo.isConnected && actionButtonsDisabled && (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
                  )}
                </View>
              </ScrollView>
            </View>
          )}
          {screen === 2 && wallet && (
            <Modal
              animationType="slide"
              transparent={false}
              visible={screen === 2}
              onRequestClose={() => this.navigateToLoadedApp()}>
              <Seed
                onClickOK={() => this.navigateToLoadedApp()}
                onClickCancel={() => this.navigateToLoadedApp()}
                action={SeedActionEnum.new}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Modal>
          )}
          {screen === 3 && (
            <Modal
              animationType="slide"
              transparent={false}
              visible={screen === 3}
              onRequestClose={() => this.setState({ screen: 1 })}>
              <ImportUfvk
                onClickOK={(s: string, b: number) => this.doRestore(s, b)}
                onClickCancel={() => this.setState({ screen: 1 })}
              />
            </Modal>
          )}
        </SafeAreaView>
      </ContextAppLoadingProvider>
    );
  }
}
