/* eslint-disable react-native/no-inline-styles */
import React, { Component, Suspense, useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Alert,
  I18nManager,
  EmitterSubscription,
  AppState,
  NativeEventSubscription,
  Linking,
  SafeAreaView,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faList, faUpload, faDownload, faCog } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@react-navigation/native';
import SideMenu from 'react-native-side-menu-updated';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { isEqual } from 'lodash';
import { StackScreenProps } from '@react-navigation/stack';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';
import deepDiff from 'deep-diff';

import RPC from '../rpc';
import RPCModule from '../RPCModule';
import {
  AppStateLoaded,
  TotalBalanceClass,
  SendPageStateClass,
  InfoType,
  TransactionType,
  ToAddrClass,
  ErrorModalDataClass,
  SyncingStatusClass,
  SendProgressClass,
  WalletSettingsClass,
  AddressClass,
  ZecPriceType,
  BackgroundType,
  TranslateType,
  ServerType,
  AddressBookFileClass,
  SecurityType,
  CommandEnum,
  MenuItemEnum,
  LanguageEnum,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  SeedActionEnum,
  UfvkActionEnum,
  SettingsNameEnum,
  RouteEnums,
  SnackbarType,
  AppStateStatusEnum,
  GlobalConst,
  TransactionTypeEnum,
  EventListenerEnum,
} from '../AppState';
import Utils from '../utils';
import { ThemeType } from '../types';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import { ContextAppLoadedProvider, defaultAppStateLoaded } from '../context';
import { parseZcashURI, serverUris, ZcashURITargetClass } from '../uris';
import BackgroundFileImpl from '../../components/Background/BackgroundFileImpl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import Snackbars from '../../components/Components/Snackbars';
import { RPCSeedType } from '../rpc/types/RPCSeedType';
import { Launching } from '../LoadingApp';
import AddressBook from '../../components/AddressBook/AddressBook';
import AddressBookFileImpl from '../../components/AddressBook/AddressBookFileImpl';
import simpleBiometrics from '../simpleBiometrics';
import ShowAddressAlertAsync from '../../components/Send/components/ShowAddressAlertAsync';

const History = React.lazy(() => import('../../components/History'));
const Send = React.lazy(() => import('../../components/Send'));
const Receive = React.lazy(() => import('../../components/Receive'));
const About = React.lazy(() => import('../../components/About'));
const Seed = React.lazy(() => import('../../components/Seed'));
const Info = React.lazy(() => import('../../components/Info'));
const SyncReport = React.lazy(() => import('../../components/SyncReport'));
const Rescan = React.lazy(() => import('../../components/Rescan'));
const Settings = React.lazy(() => import('../../components/Settings'));
const Pools = React.lazy(() => import('../../components/Pools'));
const Insight = React.lazy(() => import('../../components/Insight'));
const ShowUfvk = React.lazy(() => import('../../components/Ufvk/ShowUfvk'));

const Menu = React.lazy(() => import('./components/Menu'));
const ComputingTxContent = React.lazy(() => import('./components/ComputingTxContent'));

const en = require('../translations/en.json');
const es = require('../translations/es.json');
const pt = require('../translations/pt.json');
const ru = require('../translations/ru.json');

const Tab = createBottomTabNavigator();

// for testing
//const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type LoadedAppProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  toggleTheme: (mode: ModeEnum) => void;
};

const SERVER_DEFAULT_0: ServerType = {
  uri: serverUris(() => {})[0].uri,
  chain_name: serverUris(() => {})[0].chain_name,
} as ServerType;

export default function LoadedApp(props: LoadedAppProps) {
  const theme = useTheme() as unknown as ThemeType;
  const [language, setLanguage] = useState<LanguageEnum>(LanguageEnum.en);
  const [currency, setCurrency] = useState<CurrencyEnum>(CurrencyEnum.noCurrency);
  const [server, setServer] = useState<ServerType>(SERVER_DEFAULT_0);
  const [sendAll, setSendAll] = useState<boolean>(false);
  const [donation, setDonation] = useState<boolean>(false);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [mode, setMode] = useState<ModeEnum>(ModeEnum.advanced); // by default advanced
  const [background, setBackground] = useState<BackgroundType>({ batches: 0, message: '', date: 0, dateEnd: 0 });
  const [addressBook, setAddressBook] = useState<AddressBookFileClass[]>([]);
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
  const [rescanMenuOption, setRescanMenuOption] = useState<boolean>(false);
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
  const readOnly = props.route.params ? props.route.params.readOnly : false;

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      const { languageTag, isRTL } = RNLocalize.findBestAvailableLanguage(Object.keys(file)) || fallback;

      // update layout direction
      I18nManager.forceRTL(isRTL);

      // If the App is mounting this component,
      // I know I have to reset the firstInstall & firstUpdateWithDonation prop in settings.
      await SettingsFileImpl.writeSettings(SettingsNameEnum.firstInstall, false);
      await SettingsFileImpl.writeSettings(SettingsNameEnum.firstUpdateWithDonation, false);

      // If the App is mounting this component, I know I have to update the version prop in settings.
      await SettingsFileImpl.writeSettings(SettingsNameEnum.version, translate('version') as string);

      //I have to check what language is in the settings
      const settings = await SettingsFileImpl.readSettings();

      // for testing
      //await delay(5000);

      if (
        settings.language === LanguageEnum.en ||
        settings.language === LanguageEnum.es ||
        settings.language === LanguageEnum.pt ||
        settings.language === LanguageEnum.ru
      ) {
        setLanguage(settings.language);
        i18n.locale = settings.language;
        //console.log('apploaded settings', settings.language, settings.currency);
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
        //console.log('apploaded NO settings', languageTag);
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
      if (settings.mode === ModeEnum.basic || settings.mode === ModeEnum.advanced) {
        setMode(settings.mode);
        props.toggleTheme(settings.mode);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, mode);
        props.toggleTheme(mode);
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
      if (settings.rescanMenuOption === true || settings.rescanMenuOption === false) {
        setRescanMenuOption(settings.rescanMenuOption);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.rescanMenuOption, rescanMenuOption);
      }

      // reading background task info
      const backgroundJson = await BackgroundFileImpl.readBackground();
      //console.log('background', backgroundJson);
      if (backgroundJson) {
        setBackground(backgroundJson);
      }

      // reading the address book
      const ab = await AddressBookFileImpl.readAddressBook();
      setAddressBook(ab);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //console.log('render LoadedApp - 2');

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
      <LoadedAppClass
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
        readOnly={readOnly}
        toggleTheme={props.toggleTheme}
        addressBook={addressBook}
        security={security}
        selectServer={selectServer}
        rescanMenuOption={rescanMenuOption}
      />
    );
  }
}

type LoadedAppClassProps = {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
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
  readOnly: boolean;
  toggleTheme: (mode: ModeEnum) => void;
  addressBook: AddressBookFileClass[];
  security: SecurityType;
  selectServer: SelectServerEnum;
  rescanMenuOption: boolean;
};

export class LoadedAppClass extends Component<LoadedAppClassProps, AppStateLoaded> {
  rpc: RPC;
  appstate: NativeEventSubscription;
  linking: EmitterSubscription;
  unsubscribeNetInfo: NetInfoSubscription;

  constructor(props: LoadedAppClassProps) {
    super(props);

    this.state = {
      ...defaultAppStateLoaded,
      navigation: props.navigation,
      route: props.route,
      sendPageState: new SendPageStateClass(new ToAddrClass(Utils.getNextToAddrID())),
      translate: props.translate,
      server: props.server,
      language: props.language,
      currency: props.currency,
      sendAll: props.sendAll,
      donation: props.donation,
      privacy: props.privacy,
      mode: props.mode,
      background: props.background,
      readOnly: props.readOnly,
      appState: Platform.OS === GlobalConst.platformOSios ? AppStateStatusEnum.active : AppState.currentState,
      setBackgroundError: this.setBackgroundError,
      addLastSnackbar: this.addLastSnackbar,
      restartApp: this.navigateToLoadingApp,
      addressBook: props.addressBook,
      launchAddressBook: this.launchAddressBook,
      security: props.security,
      selectServer: props.selectServer,
      rescanMenuOption: props.rescanMenuOption,
    };

    this.rpc = new RPC(
      this.setTotalBalance,
      this.setTransactionList,
      this.setAllAddresses,
      this.setWalletSettings,
      this.setInfo,
      this.setSyncingStatus,
      props.translate,
      this.keepAwake,
      props.readOnly,
    );

    this.appstate = {} as NativeEventSubscription;
    this.linking = {} as EmitterSubscription;
    this.unsubscribeNetInfo = {} as NetInfoSubscription;
  }

  componentDidMount = () => {
    this.clearToAddr();

    (async () => {
      // Configure the RPC to start doing refreshes
      await this.rpc.configure();
    })();

    this.appstate = AppState.addEventListener(EventListenerEnum.change, async nextAppState => {
      //console.log('LOADED', 'prior', this.state.appState, 'next', nextAppState);
      if (Platform.OS === GlobalConst.platformOSios) {
        if (
          (this.state.appState === AppStateStatusEnum.inactive && nextAppState === AppStateStatusEnum.active) ||
          (this.state.appState === AppStateStatusEnum.active && nextAppState === AppStateStatusEnum.inactive)
        ) {
          //console.log('LOADED SAVED IOS do nothing', nextAppState);
          this.setState({ appState: nextAppState });
          return;
        }
        if (this.state.appState === AppStateStatusEnum.inactive && nextAppState === AppStateStatusEnum.background) {
          //console.log('App LOADED IOS is gone to the background!');
          // re-activate the interruption sync flag
          await RPC.rpc_setInterruptSyncAfterBatch(GlobalConst.true);
          // setting value for background task Android
          await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
          //console.log('background yes in storage');
          this.rpc.setInRefresh(false);
          await this.rpc.clearTimers();
          //console.log('clear timers IOS');
          this.setSyncingStatus(new SyncingStatusClass());
          //console.log('clear sync status state');
          //console.log('LOADED SAVED IOS background', nextAppState);
          this.setState({ appState: nextAppState });
          return;
        }
      }
      if (
        (this.state.appState === AppStateStatusEnum.inactive ||
          this.state.appState === AppStateStatusEnum.background) &&
        nextAppState === AppStateStatusEnum.active
      ) {
        console.log('App LOADED Android & IOS has come to the foreground!');
        if (Platform.OS === GlobalConst.platformOSios) {
          //console.log('LOADED SAVED IOS foreground', nextAppState);
          this.setState({ appState: nextAppState });
        }
        // (PIN or TouchID or FaceID)
        const resultBio = this.state.security.foregroundApp
          ? await simpleBiometrics({ translate: this.props.translate })
          : true;
        // can be:
        // - true      -> the user do pass the authentication
        // - false     -> the user do NOT pass the authentication
        // - undefined -> no biometric authentication available -> Passcode -> Nothing.
        //console.log('BIOMETRIC FOREGROUND --------> ', resultBio);
        if (resultBio === false) {
          this.navigateToLoadingApp({ startingApp: true, biometricsFailed: true });
        } else {
          // reading background task info
          await this.fetchBackgroundSyncing();
          // setting value for background task Android
          await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
          //console.log('background no in storage');
          await this.rpc.configure();
          //console.log('configure start timers Android & IOS');
          if (this.state.backgroundError && (this.state.backgroundError.title || this.state.backgroundError.error)) {
            Alert.alert(this.state.backgroundError.title, this.state.backgroundError.error);
            this.setBackgroundError('', '');
          }
        }
      } else if (
        this.state.appState === AppStateStatusEnum.active &&
        (nextAppState === AppStateStatusEnum.inactive || nextAppState === AppStateStatusEnum.background)
      ) {
        console.log('App LOADED is gone to the background!');
        // re-activate the interruption sync flag
        await RPC.rpc_setInterruptSyncAfterBatch(GlobalConst.true);
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
        //console.log('background yes in storage');
        this.rpc.setInRefresh(false);
        await this.rpc.clearTimers();
        //console.log('clear timers');
        this.setSyncingStatus(new SyncingStatusClass());
        //console.log('clear sync status state');
        if (Platform.OS === GlobalConst.platformOSios) {
          //console.log('LOADED SAVED IOS background', nextAppState);
          this.setState({ appState: nextAppState });
        }
      } else {
        if (Platform.OS === GlobalConst.platformOSios) {
          if (this.state.appState !== nextAppState) {
            //console.log('LOADED SAVED IOS', nextAppState);
            this.setState({ appState: nextAppState });
          }
        }
      }
      if (Platform.OS === GlobalConst.platformOSandroid) {
        if (this.state.appState !== nextAppState) {
          //console.log('LOADED SAVED Android', nextAppState);
          this.setState({ appState: nextAppState });
        }
      }
    });

    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl !== null) {
        this.readUrl(initialUrl);
      }
    })();

    this.linking = Linking.addEventListener(EventListenerEnum.url, async ({ url }) => {
      //console.log(url);
      if (url !== null) {
        this.readUrl(url);
      }

      this.closeAllModals();
      this.state.navigation.navigate(RouteEnums.LoadedApp, {
        screen: this.props.translate('loadedapp.send-menu'),
        initial: false,
      });
    });

    this.unsubscribeNetInfo = NetInfo.addEventListener(async state => {
      const { isConnected, type, isConnectionExpensive } = this.state.netInfo;
      if (
        isConnected !== state.isConnected ||
        type !== state.type ||
        isConnectionExpensive !== state.details?.isConnectionExpensive
      ) {
        //console.log('fetch net info');
        this.setState({
          netInfo: {
            isConnected: state.isConnected,
            type: state.type,
            isConnectionExpensive: state.details && state.details.isConnectionExpensive,
          },
        });
        if (isConnected !== state.isConnected) {
          if (!state.isConnected) {
            //console.log('EVENT Loaded: No internet connection.');
            await this.rpc.clearTimers();
            this.setSyncingStatus(new SyncingStatusClass());
            this.addLastSnackbar({
              message: this.props.translate('loadedapp.connection-error') as string,
            });
          } else {
            //console.log('EVENT Loaded: YES internet connection.');
            if (this.rpc.getInRefresh()) {
              // I need to start again the App only if it is Syncing...
              this.navigateToLoadingApp({ startingApp: false });
            } else {
              // restart the interval process again if it is not syncing...
              await this.rpc.configure();
            }
          }
        }
      }
    });
  };

  componentWillUnmount = async () => {
    await this.rpc.clearTimers();
    this.appstate && typeof this.appstate.remove === 'function' && this.appstate.remove();
    this.linking && typeof this.linking === 'function' && this.linking.remove();
    this.unsubscribeNetInfo && this.unsubscribeNetInfo();
  };

  keepAwake = (keep: boolean): void => {
    if (keep) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  };

  readUrl = async (url: string) => {
    //console.log(url);
    // Attempt to parse as URI if it starts with zcash
    // only if it is a spendable wallet
    if (url.startsWith(GlobalConst.zcash) && !this.state.readOnly) {
      const target: string | ZcashURITargetClass = await parseZcashURI(url, this.props.translate, this.state.server);
      //console.log(targets);

      if (typeof target !== 'string') {
        let update = false;
        if (
          this.state.sendPageState.toaddr.to &&
          target.address &&
          this.state.sendPageState.toaddr.to !== target.address
        ) {
          await ShowAddressAlertAsync(this.props.translate)
            .then(async () => {
              // fill the fields in the screen with the donation data
              update = true;
            })
            .catch(() => {});
        } else if (target.address) {
          // fill the fields in the screen with the donation data
          update = true;
        }
        if (update) {
          // redo the to addresses
          const newSendPageState = new SendPageStateClass(new ToAddrClass(0));
          let uriToAddr: ToAddrClass = new ToAddrClass(0);
          [target].forEach(tgt => {
            const to = new ToAddrClass(Utils.getNextToAddrID());

            to.to = tgt.address || '';
            to.amount = Utils.parseNumberFloatToStringLocale(tgt.amount || 0, 8);
            to.memo = tgt.memoString || '';

            uriToAddr = to;
          });

          newSendPageState.toaddr = uriToAddr;

          this.setSendPageState(newSendPageState);
        }
      } else {
        // Show the error message as a toast
        this.addLastSnackbar({ message: target });
      }
    }
  };

  closeAllModals = () => {
    this.setState({
      aboutModalVisible: false,
      computingModalVisible: false,
      settingsModalVisible: false,
      infoModalVisible: false,
      rescanModalVisible: false,
      seedViewModalVisible: false,
      seedChangeModalVisible: false,
      seedBackupModalVisible: false,
      seedServerModalVisible: false,
      ufvkViewModalVisible: false,
      ufvkChangeModalVisible: false,
      ufvkBackupModalVisible: false,
      ufvkServerModalVisible: false,
      syncReportModalVisible: false,
      poolsModalVisible: false,
      insightModalVisible: false,
      addressBookModalVisible: false,
      addressBookCurrentAddress: '',
      addressBookOpenPriorModal: () => {},
    });
  };

  fetchBackgroundSyncing = async () => {
    const backgroundJson: BackgroundType = await BackgroundFileImpl.readBackground();
    if (!isEqual(this.state.background, backgroundJson)) {
      //console.log('fetch background sync info');
      this.setState({ background: backgroundJson });
    }
  };

  getFullState = (): AppStateLoaded => {
    return this.state;
  };

  openErrorModal = (title: string, body: string) => {
    const errorModalData = new ErrorModalDataClass(title, body);
    errorModalData.modalIsOpen = true;

    this.setState({ errorModalData });
  };

  closeErrorModal = () => {
    const errorModalData = new ErrorModalDataClass('', '');
    errorModalData.modalIsOpen = false;

    this.setState({ errorModalData });
  };

  setUfvkViewModalVisible = async (value: boolean) => {
    await this.fetchWallet();
    this.setState({ ufvkViewModalVisible: value });
  };

  setShieldingAmount = (value: number) => {
    this.setState({ shieldingAmount: value });
  };

  //setPoolsToShieldSelectSapling = (value: boolean) => {
  //  this.setState({ poolsToShieldSelectSapling: value });
  //};

  //setPoolsToShieldSelectTransparent = (value: boolean) => {
  //  this.setState({ poolsToShieldSelectTransparent: value });
  //};

  setTotalBalance = (totalBalance: TotalBalanceClass) => {
    if (!isEqual(this.state.totalBalance, totalBalance)) {
      //console.log('fetch total balance');
      this.setState({ totalBalance });
    }
  };

  setSyncingStatus = (syncingStatus: SyncingStatusClass) => {
    if (!isEqual(this.state.syncingStatus, syncingStatus)) {
      //console.log('fetch syncing status report');
      this.setState({ syncingStatus });
    }
  };

  setTransactionList = async (transactions: TransactionType[]) => {
    const basicFirstViewSeed = (await SettingsFileImpl.readSettings()).basicFirstViewSeed;
    // only for basic mode
    if (this.state.mode === ModeEnum.basic) {
      // only if the user doesn't see the seed the first time
      if (!basicFirstViewSeed) {
        // only if the App are in foreground
        const background = await AsyncStorage.getItem(GlobalConst.background);
        // only if the wallet have some transactions
        if (background === GlobalConst.no && transactions.length > 0) {
          // I need to check this out in the seed screen.
          await this.fetchWallet();
          this.setState({ seedViewModalVisible: true });
        }
      }
    } else {
      // for advanced mode
      if (!basicFirstViewSeed) {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
      }
    }
    if (deepDiff(this.state.transactions, transactions)) {
      //console.log('fetch transactions');
      // set somePending as well here when I know there is something new in transactions
      const pending: number =
        transactions.length > 0 ? transactions.filter((tx: TransactionType) => tx.confirmations === 0).length : 0;
      // if a transaction go from 0 confirmations to > 0 -> Show a message about a transaction is confirmed
      this.state.transactions.length > 0 &&
        this.state.transactions
          .filter((txOld: TransactionType) => !txOld.confirmations || txOld.confirmations === 0)
          .forEach((txOld: TransactionType) => {
            const txNew = transactions.filter((tx: TransactionType) => tx.txid === txOld.txid);
            console.log('old', txOld);
            console.log('new', txNew);
            // the transaction is confirmed
            if (txNew.length > 0 && txNew[0].confirmations > 0) {
              let message: string = '';
              let title: string = '';
              if (txNew[0].type === TransactionTypeEnum.Received) {
                message =
                  (this.props.translate('loadedapp.incoming-funds') as string) +
                  (this.props.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(
                    txNew[0].txDetails.reduce((s, d) => s + d.amount, 0),
                    8,
                  ) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.props.translate('loadedapp.uas-menu') as string;
              } else if (txNew[0].type === TransactionTypeEnum.SendToSelf) {
                message =
                  (this.props.translate('loadedapp.transaction-confirmed') as string) +
                  (this.props.translate('history.sendtoself') as string) +
                  (txNew[0].fee
                    ? ((' ' + this.props.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(txNew[0].fee, 8) +
                      ' ' +
                      this.state.info.currencyName
                    : '');
                title = this.props.translate('loadedapp.send-menu') as string;
              } else {
                message =
                  (this.props.translate('loadedapp.payment-made') as string) +
                  (this.props.translate('history.sent') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(
                    txNew[0].txDetails.reduce((s, d) => s + d.amount, 0),
                    8,
                  ) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.props.translate('loadedapp.send-menu') as string;
              }
              createAlert(this.setBackgroundError, this.addLastSnackbar, title, message, true);
            }
            // the transaction is gone -> Likely Reverted by the server
            if (txNew.length === 0) {
              createAlert(
                this.setBackgroundError,
                this.addLastSnackbar,
                this.props.translate('loadedapp.send-menu') as string,
                this.props.translate('loadedapp.transaction-reverted') as string,
                true,
              );
            }
          });
      this.setState({ transactions, somePending: pending > 0 });
    }
  };

  setAllAddresses = (addresses: AddressClass[]) => {
    if (deepDiff(this.state.addresses, addresses)) {
      //console.log('fetch addresses');
      this.setState({ addresses });
    }
    if (this.state.uaAddress !== addresses[0].uaAddress) {
      this.setState({ uaAddress: addresses[0].uaAddress });
    }
  };

  setWalletSettings = (walletSettings: WalletSettingsClass) => {
    if (!isEqual(this.state.walletSettings, walletSettings)) {
      //console.log('fetch wallet settings');
      this.setState({ walletSettings });
    }
  };

  setSendPageState = (sendPageState: SendPageStateClass) => {
    //console.log('fetch send page state');
    this.setState({ sendPageState });
  };

  clearToAddr = () => {
    const newToAddr = new ToAddrClass(Utils.getNextToAddrID());

    // Create the new state object
    const newState = new SendPageStateClass(new ToAddrClass(0));
    newState.toaddr = newToAddr;

    this.setSendPageState(newState);
  };

  setZecPrice = (newZecPrice: number, newDate: number) => {
    //console.log(this.state.zecPrice, newZecPrice);
    const zecPrice = {
      zecPrice: newZecPrice,
      date: newDate,
    } as ZecPriceType;
    if (!isEqual(this.state.zecPrice, zecPrice)) {
      //console.log('fetch zec price');
      this.setState({ zecPrice });
    }
  };

  setComputingModalVisible = (visible: boolean) => {
    this.setState({ computingModalVisible: visible });
  };

  setSendProgress = (sendProgress: SendProgressClass) => {
    if (!isEqual(this.state.sendProgress, sendProgress)) {
      //console.log('fetch send progress');
      this.setState({ sendProgress });
    }
  };

  setInfo = (info: InfoType) => {
    if (!isEqual(this.state.info, info)) {
      //console.log('fetch info');
      let newInfo = info;
      // if currencyName is empty,
      // I need to rescue the last value from the state.
      if (!newInfo.currencyName) {
        if (this.state.info.currencyName) {
          newInfo.currencyName = this.state.info.currencyName;
        }
      }
      this.setState({ info: newInfo });
    }
  };

  sendTransaction = async (setSendProgress: (arg0: SendProgressClass) => void): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const { sendPageState, uaAddress, addresses, server, donation, translate } = this.state;
      const sendJson = await Utils.getSendManyJSON(sendPageState, uaAddress, addresses, server, donation, translate);
      const txid = await this.rpc.sendTransaction(sendJson, setSendProgress);

      return txid;
    } catch (err) {
      //console.log('route sendtx error', err);
      throw err;
    }
  };

  doRefresh = async () => {
    await this.rpc.refresh(false);
  };

  doRescan = async () => {
    await this.rpc.stopSyncProcess();
    this.rpc.refresh(false, true);
  };

  toggleMenuDrawer = () => {
    this.setState({
      isMenuDrawerOpen: !this.state.isMenuDrawerOpen,
    });
  };

  updateMenuState = (isMenuDrawerOpen: boolean) => {
    this.setState({ isMenuDrawerOpen });
  };

  fetchWallet = async () => {
    const wallet = await RPC.rpc_fetchWallet(this.state.readOnly);
    //console.log(wallet, this.state.readOnly);
    if (!isEqual(this.state.wallet, wallet)) {
      //console.log('fetch wallet seed or Viewing Key & birthday');
      this.setState({ wallet });
    }
  };

  onMenuItemSelected = async (item: MenuItemEnum) => {
    this.setState({
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: item,
    });

    await this.fetchWallet();

    // Depending on the menu item, open the appropriate modal
    if (item === MenuItemEnum.About) {
      this.setState({ aboutModalVisible: true });
    } else if (item === MenuItemEnum.Rescan) {
      this.setState({ rescanModalVisible: true });
    } else if (item === MenuItemEnum.Settings) {
      this.setState({ settingsModalVisible: true });
    } else if (item === MenuItemEnum.Info) {
      this.setState({ infoModalVisible: true });
    } else if (item === MenuItemEnum.SyncReport) {
      this.setState({ syncReportModalVisible: true });
    } else if (item === MenuItemEnum.FundPools) {
      this.setState({ poolsModalVisible: true });
    } else if (item === MenuItemEnum.Insight) {
      this.setState({ insightModalVisible: true });
    } else if (item === MenuItemEnum.WalletSeedUfvk) {
      if (this.state.readOnly) {
        this.setState({ ufvkViewModalVisible: true });
      } else {
        this.setState({ seedViewModalVisible: true });
      }
    } else if (item === MenuItemEnum.ChangeWallet) {
      if (this.state.readOnly) {
        this.setState({ ufvkChangeModalVisible: true });
      } else {
        this.setState({ seedChangeModalVisible: true });
      }
    } else if (item === MenuItemEnum.RestoreWalletBackup) {
      if (this.state.readOnly) {
        this.setState({ ufvkBackupModalVisible: true });
      } else {
        this.setState({ seedBackupModalVisible: true });
      }
    } else if (item === MenuItemEnum.LoadWalletFromSeed) {
      // change to the screen 3 directly.
      const { translate } = this.state;
      Alert.alert(
        translate('loadedapp.restorewallet-title') as string,
        translate('loadedapp.restorewallet-alert') as string,
        [
          {
            text: translate('confirm') as string,
            onPress: async () => await this.onClickOKChangeWallet({ screen: 3, startingApp: false }),
          },
          { text: translate('cancel') as string, style: 'cancel' },
        ],
        { cancelable: false, userInterfaceStyle: 'light' },
      );
    } else if (item === MenuItemEnum.TipZingoLabs) {
      // change to the screen 3 directly.
      const { translate } = this.state;
      Alert.alert(
        translate('loadingapp.alert-donation-title') as string,
        translate('loadingapp.alert-donation-body') as string,
        [
          {
            text: translate('confirm') as string,
            onPress: async () => await this.set_donation_option(true),
          },
          {
            text: translate('cancel') as string,
            onPress: async () => await this.set_donation_option(false),
            style: 'cancel',
          },
        ],
        { cancelable: false, userInterfaceStyle: 'light' },
      );
    } else if (item === MenuItemEnum.AddressBook) {
      this.setState({
        addressBookModalVisible: true,
        addressBookCurrentAddress: '',
        addressBookOpenPriorModal: () => {},
      });
    } else if (item === MenuItemEnum.VoteForNym) {
      let update = false;
      if (
        this.state.sendPageState.toaddr.to &&
        this.state.sendPageState.toaddr.to !== (await Utils.getDonationAddress(this.state.server.chain_name))
      ) {
        await ShowAddressAlertAsync(this.props.translate)
          .then(async () => {
            // fill the fields in the screen with the donation data
            update = true;
          })
          .catch(() => {});
      } else {
        // fill the fields in the screen with the donation data
        update = true;
      }
      if (update) {
        const newSendPageState = new SendPageStateClass(new ToAddrClass(0));
        let uriToAddr: ToAddrClass = new ToAddrClass(0);
        const to = new ToAddrClass(Utils.getNextToAddrID());

        to.to = await Utils.getDonationAddress(this.state.server.chain_name);
        to.amount = Utils.getDefaultDonationAmount();
        to.memo = this.props.translate('loadedapp.nymmemo') as string;
        to.includeUAMemo = true;

        uriToAddr = to;

        newSendPageState.toaddr = uriToAddr;

        this.setSendPageState(newSendPageState);
      }
      this.closeAllModals();
      this.state.navigation.navigate(RouteEnums.LoadedApp, {
        screen: this.props.translate('loadedapp.send-menu'),
        initial: false,
      });
    }
  };

  set_wallet_option = async (walletOption: string, value: string): Promise<void> => {
    await RPC.rpc_setWalletSettingOption(walletOption, value);

    // Refetch the settings updated
    this.rpc.fetchWalletSettings();
  };

  set_server_option = async (value: ServerType, toast: boolean, same_server_chain_name: boolean): Promise<void> => {
    //console.log(value, same_server_chain_name);
    // here I know the server was changed, clean all the tasks before anything.
    await this.rpc.clearTimers();
    this.setSyncingStatus(new SyncingStatusClass());
    this.rpc.setInRefresh(false);
    this.keepAwake(false);
    // First we need to check the `chain_name` between servers, if this is different
    // we cannot try to open the current wallet, because make not sense.
    let error = false;
    if (!same_server_chain_name) {
      error = true;
    } else {
      // when I try to open the wallet in the new server:
      // - the seed doesn't exists (the type of sever is different `main` / `test` / `regtest` ...).
      //   The App have to go to the initial screen
      // - the seed exists and the App can open the wallet in the new server.
      //   But I have to restart the sync if needed.
      let result: string = await RPCModule.loadExistingWallet(value.uri, value.chain_name);
      //console.log(result);
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType = await JSON.parse(result);
          if (
            !resultJson.error ||
            (resultJson.error && resultJson.error.startsWith('This wallet is watch-only') && this.state.readOnly)
          ) {
            // Load the wallet and navigate to the transactions screen
            //console.log(`wallet loaded ok ${value.uri}`);
            if (toast) {
              this.addLastSnackbar({
                message: `${this.props.translate('loadedapp.readingwallet')} ${value.uri}`,
              });
            }
            await SettingsFileImpl.writeSettings(SettingsNameEnum.server, value);
            this.setState({
              server: value,
            });
            // the server is changed, the App needs to restart the timeout tasks from the beginning
            await this.rpc.configure();
            // Refetch the settings to update
            await this.rpc.fetchWalletSettings();
            return;
          } else {
            error = true;
          }
        } catch (e) {
          console.log(result);
          error = true;
        }
      } else {
        error = true;
      }
    }

    // if the chain_name id different between server or we cannot open the wallet...
    if (error) {
      // I need to open the modal ASAP.
      if (this.state.readOnly) {
        this.setState({
          ufvkServerModalVisible: true,
        });
      } else {
        this.setState({
          seedServerModalVisible: true,
        });
      }
      //console.log(`Error Reading Wallet ${value} - ${error}`);
      if (toast) {
        this.addLastSnackbar({
          message: `${this.props.translate('loadedapp.readingwallet-error')} ${value.uri}`,
        });
      }

      // we need to restore the old server because the new doesn't have the seed of the current wallet.
      const old_settings = await SettingsFileImpl.readSettings();
      await RPCModule.execute(CommandEnum.changeserver, old_settings.server.uri);

      // go to the seed screen for changing the wallet for another in the new server or cancel this action.
      this.fetchWallet();
      this.setState({
        newServer: value as ServerType,
        server: old_settings.server,
      });
    }
  };

  set_currency_option = async (value: CurrencyEnum): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.currency, value);
    this.setState({
      currency: value as CurrencyEnum,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_language_option = async (value: string, reset: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.language, value);
    this.setState({
      language: value as LanguageEnum,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
    if (reset) {
      this.navigateToLoadingApp({ startingApp: false });
    }
  };

  set_sendAll_option = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.sendAll, value);
    this.setState({
      sendAll: value as boolean,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_donation_option = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.donation, value);
    this.setState({
      donation: value as boolean,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_privacy_option = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, value);
    this.setState({
      privacy: value as boolean,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_mode_option = async (value: string): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, value);
    this.setState({
      mode: value as ModeEnum,
      //poolsToShieldSelectSapling: true,
      //poolsToShieldSelectTransparent: true,
    });
    // this function change the Theme in the App component.
    this.props.toggleTheme(value as ModeEnum);

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_security_option = async (value: SecurityType): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.security, value);
    this.setState({
      security: value as SecurityType,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_selectServer_option = async (value: string): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, value);
    this.setState({
      selectServer: value as SelectServerEnum,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  set_rescanMenuOption_option = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.rescanMenuOption, value);
    this.setState({
      rescanMenuOption: value as boolean,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  navigateToLoadingApp = async (state: any) => {
    const { navigation } = this.props;

    await this.rpc.clearTimers();
    if (!!state.screen && state.screen === 3) {
      await this.set_mode_option(ModeEnum.advanced);
    }
    navigation.reset({
      index: 0,
      routes: [
        {
          name: RouteEnums.LoadingApp,
          params: state,
        },
      ],
    });
  };

  onClickOKChangeWallet = async (state: any) => {
    const { server } = this.state;

    // if the App is working with a test server
    // no need to do backups of the wallets.
    let resultStr = '';
    if (server.chain_name === ChainNameEnum.mainChainName) {
      resultStr = (await this.rpc.changeWallet()) as string;
    } else {
      resultStr = (await this.rpc.changeWalletNoBackup()) as string;
    }

    //console.log("jc change", resultStr);
    if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error change wallet. ${resultStr}`);
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.props.translate('loadedapp.changingwallet-label') as string,
        resultStr,
      );
      return;
    }

    this.rpc.setInRefresh(false);
    this.keepAwake(false);
    this.setState({ seedChangeModalVisible: false });
    this.navigateToLoadingApp(state);
  };

  onClickOKRestoreBackup = async () => {
    const resultStr = (await this.rpc.restoreBackup()) as string;

    //console.log("jc restore", resultStr);
    if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error restore backup wallet. ${resultStr}`);
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.props.translate('loadedapp.restoringwallet-label') as string,
        resultStr,
      );
      return;
    }

    this.rpc.setInRefresh(false);
    this.keepAwake(false);
    this.setState({ seedBackupModalVisible: false });
    this.navigateToLoadingApp({ startingApp: false });
  };

  onClickOKServerWallet = async () => {
    if (this.state.newServer) {
      const beforeServer = this.state.server;
      const resultStr: string = await RPCModule.execute(CommandEnum.changeserver, this.state.newServer.uri);
      if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
        //console.log(`Error change server ${value} - ${resultStr}`);
        this.addLastSnackbar({
          message: `${this.props.translate('loadedapp.changeservernew-error')} ${resultStr}`,
        });
        return;
      } else {
        //console.log(`change server ok ${value}`);
      }

      await SettingsFileImpl.writeSettings(SettingsNameEnum.server, this.state.newServer);
      this.setState({
        server: this.state.newServer,
        newServer: {} as ServerType,
      });

      await this.rpc.fetchInfoAndServerHeight();

      let resultStr2 = '';
      // if the server was testnet or regtest -> no need backup the wallet.
      if (beforeServer.chain_name === ChainNameEnum.mainChainName) {
        // backup
        resultStr2 = (await this.rpc.changeWallet()) as string;
      } else {
        // no backup
        resultStr2 = (await this.rpc.changeWalletNoBackup()) as string;
      }

      //console.log("jc change", resultStr);
      if (resultStr2.toLowerCase().startsWith(GlobalConst.error)) {
        //console.log(`Error change wallet. ${resultStr}`);
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          this.props.translate('loadedapp.changingwallet-label') as string,
          resultStr2,
        );
        //return;
      }

      if (this.state.readOnly) {
        this.setState({ ufvkServerModalVisible: false });
      } else {
        this.setState({ seedServerModalVisible: false });
      }
      // no need to restart the tasks because is about to restart the app.
      this.navigateToLoadingApp({ startingApp: false });
    }
  };

  setUaAddress = (uaAddress: string) => {
    this.setState({ uaAddress });
  };

  syncingStatusMoreInfoOnClick = async () => {
    await this.fetchWallet();
    this.setState({ syncReportModalVisible: true });
  };

  poolsMoreInfoOnClick = async () => {
    this.setState({ poolsModalVisible: true });
  };

  setBackgroundError = (title: string, error: string) => {
    this.setState({ backgroundError: { title, error } });
  };

  setAddressBook = (addressBook: AddressBookFileClass[]) => {
    this.setState({ addressBook });
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

  launchAddressBook = (address: string, closeModal: () => void, openModal: () => void) => {
    closeModal();
    setTimeout(
      () => {
        this.setState({
          addressBookModalVisible: true,
          addressBookCurrentAddress: address,
          addressBookOpenPriorModal: openModal,
        });
      },
      Platform.OS === GlobalConst.platformOSios ? 100 : 1,
    );
  };

  render() {
    const {
      aboutModalVisible,
      infoModalVisible,
      syncReportModalVisible,
      poolsModalVisible,
      insightModalVisible,
      settingsModalVisible,
      computingModalVisible,
      rescanModalVisible,
      seedViewModalVisible,
      seedChangeModalVisible,
      seedBackupModalVisible,
      seedServerModalVisible,
      ufvkViewModalVisible,
      ufvkChangeModalVisible,
      ufvkBackupModalVisible,
      ufvkServerModalVisible,
      addressBookModalVisible,
      snackbars,
      isMenuDrawerOpen,
      mode,
      transactions,
      readOnly,
      totalBalance,
    } = this.state;
    const { translate } = this.props;
    const { colors } = this.props.theme;

    const menu = (
      <Suspense
        fallback={
          <View>
            <Text>Loading...</Text>
          </View>
        }>
        <Menu onItemSelected={this.onMenuItemSelected} updateMenuState={this.updateMenuState} />
      </Suspense>
    );

    const fnTabBarIcon = (route: StackScreenProps<any>['route'], focused: boolean) => {
      var iconName;

      if (route.name === translate('loadedapp.wallet-menu')) {
        iconName = faList;
      } else if (route.name === translate('loadedapp.send-menu')) {
        iconName = faUpload;
      } else if (route.name === translate('loadedapp.uas-menu')) {
        iconName = faDownload;
      } else {
        iconName = faCog;
      }

      const iconColor = focused ? colors.background : colors.money;
      return focused ? (
        <FontAwesomeIcon icon={iconName} color={iconColor} size={30} style={{ transform: [{ translateY: 8 }] }} />
      ) : (
        <FontAwesomeIcon icon={iconName} color={iconColor} />
      );
    };

    //console.log('render LoadedAppClass - 3', translate('version'));

    return (
      <ContextAppLoadedProvider value={this.state}>
        <SideMenu menu={menu} isOpen={isMenuDrawerOpen} onChange={(isOpen: boolean) => this.updateMenuState(isOpen)}>
          <Modal
            animationType="slide"
            transparent={false}
            visible={aboutModalVisible}
            onRequestClose={() => this.setState({ aboutModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <About closeModal={() => this.setState({ aboutModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={infoModalVisible}
            onRequestClose={() => this.setState({ infoModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <Info closeModal={() => this.setState({ infoModalVisible: false })} setZecPrice={this.setZecPrice} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={syncReportModalVisible}
            onRequestClose={() => this.setState({ syncReportModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <SyncReport closeModal={() => this.setState({ syncReportModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={poolsModalVisible}
            onRequestClose={() => this.setState({ poolsModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <Pools
                closeModal={() => this.setState({ poolsModalVisible: false })}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={insightModalVisible}
            onRequestClose={() => this.setState({ insightModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <Insight
                closeModal={() => this.setState({ insightModalVisible: false })}
                openModal={() => this.setState({ insightModalVisible: true })}
                set_privacy_option={this.set_privacy_option}
                setSendPageState={this.setSendPageState}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={rescanModalVisible}
            onRequestClose={() => this.setState({ rescanModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <Rescan closeModal={() => this.setState({ rescanModalVisible: false })} doRescan={this.doRescan} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={settingsModalVisible}
            onRequestClose={() => this.setState({ settingsModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              {/*<Settings
                closeModal={() => this.setState({ settingsModalVisible: false })}
                set_wallet_option={this.set_wallet_option}
                set_server_option={this.set_server_option}
                set_currency_option={this.set_currency_option}
                set_language_option={this.set_language_option}
                set_sendAll_option={this.set_sendAll_option}
                set_donation_option={this.set_donation_option}
                set_privacy_option={this.set_privacy_option}
                set_mode_option={this.set_mode_option}
                set_security_option={this.set_security_option}
                set_selectServer_option={this.set_selectServer_option}
                set_rescanMenuOption_option={this.set_rescanMenuOption_option}
              />*/}
              <Settings
                closeModal={() => this.setState({ settingsModalVisible: false })}
                set_wallet_option={this.set_wallet_option}
                set_server_option={this.set_server_option}
                set_currency_option={this.set_currency_option}
                set_language_option={this.set_language_option}
                set_donation_option={this.set_donation_option}
                set_privacy_option={this.set_privacy_option}
                set_mode_option={this.set_mode_option}
                set_security_option={this.set_security_option}
                set_selectServer_option={this.set_selectServer_option}
                set_rescanMenuOption_option={this.set_rescanMenuOption_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedViewModalVisible}
            onRequestClose={() => this.setState({ seedViewModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <Seed
                onClickOK={() => this.setState({ seedViewModalVisible: false })}
                onClickCancel={() => this.setState({ seedViewModalVisible: false })}
                action={SeedActionEnum.view}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedChangeModalVisible}
            onRequestClose={() => this.setState({ seedChangeModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <Seed
                onClickOK={async () => await this.onClickOKChangeWallet({ startingApp: false })}
                onClickCancel={() => this.setState({ seedChangeModalVisible: false })}
                action={SeedActionEnum.change}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedBackupModalVisible}
            onRequestClose={() => this.setState({ seedBackupModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <Seed
                onClickOK={async () => await this.onClickOKRestoreBackup()}
                onClickCancel={() => this.setState({ seedBackupModalVisible: false })}
                action={SeedActionEnum.backup}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedServerModalVisible}
            onRequestClose={() => this.setState({ seedServerModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <Seed
                onClickOK={async () => await this.onClickOKServerWallet()}
                onClickCancel={async () => {
                  // restart all the tasks again, nothing happen.
                  await this.rpc.configure();
                  this.setState({ seedServerModalVisible: false });
                }}
                action={SeedActionEnum.server}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={ufvkViewModalVisible}
            onRequestClose={() => this.setState({ ufvkViewModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <ShowUfvk
                onClickOK={() => this.setState({ ufvkViewModalVisible: false })}
                onClickCancel={() => this.setState({ ufvkViewModalVisible: false })}
                action={UfvkActionEnum.view}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={ufvkChangeModalVisible}
            onRequestClose={() => this.setState({ ufvkChangeModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <ShowUfvk
                onClickOK={async () => await this.onClickOKChangeWallet({ startingApp: false })}
                onClickCancel={() => this.setState({ ufvkChangeModalVisible: false })}
                action={UfvkActionEnum.change}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={ufvkBackupModalVisible}
            onRequestClose={() => this.setState({ ufvkBackupModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <ShowUfvk
                onClickOK={async () => await this.onClickOKRestoreBackup()}
                onClickCancel={() => this.setState({ ufvkBackupModalVisible: false })}
                action={UfvkActionEnum.backup}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={ufvkServerModalVisible}
            onRequestClose={() => this.setState({ ufvkServerModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <ShowUfvk
                onClickOK={async () => await this.onClickOKServerWallet()}
                onClickCancel={async () => {
                  // restart all the tasks again, nothing happen.
                  await this.rpc.configure();
                  this.setState({ ufvkServerModalVisible: false });
                }}
                action={UfvkActionEnum.server}
                set_privacy_option={this.set_privacy_option}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={computingModalVisible}
            onRequestClose={() => this.setState({ computingModalVisible: false })}>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <ComputingTxContent />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={addressBookModalVisible}
            onRequestClose={() =>
              this.setState({
                addressBookModalVisible: false,
                addressBookCurrentAddress: '',
                addressBookOpenPriorModal: () => {},
              })
            }>
            <Suspense
              fallback={
                <View>
                  <Text>{translate('loading') as string}</Text>
                </View>
              }>
              <AddressBook
                closeModal={() =>
                  this.setState({
                    addressBookModalVisible: false,
                    addressBookCurrentAddress: '',
                    addressBookOpenPriorModal: () => {},
                  })
                }
                setAddressBook={this.setAddressBook}
                setSendPageState={this.setSendPageState}
              />
            </Suspense>
          </Modal>

          <Snackbars snackbars={snackbars} removeFirstSnackbar={this.removeFirstSnackbar} translate={translate} />

          {mode !== ModeEnum.basic ||
          (mode === ModeEnum.basic &&
            (!(mode === ModeEnum.basic && transactions.length <= 0) ||
              (!readOnly &&
                !(mode === ModeEnum.basic && totalBalance.spendableOrchard + totalBalance.spendablePrivate <= 0)))) ? (
            <Tab.Navigator
              initialRouteName={translate('loadedapp.wallet-menu') as string}
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => fnTabBarIcon(route, focused),
                tabBarLabelPosition: 'below-icon',
                tabBarActiveTintColor: 'transparent',
                tabBarActiveBackgroundColor: colors.primaryDisabled,
                tabBarInactiveTintColor: colors.money,
                tabBarLabelStyle: { fontSize: 12 },
                tabBarStyle: {
                  borderRadius: 0,
                  borderTopColor: colors.primaryDisabled,
                  borderTopWidth: 1,
                },
                headerShown: false,
              })}>
              <Tab.Screen name={translate('loadedapp.wallet-menu') as string}>
                {() => (
                  <>
                    <Suspense
                      fallback={
                        <View>
                          <Text>{translate('loading') as string}</Text>
                        </View>
                      }>
                      {/*<History
                        doRefresh={this.doRefresh}
                        toggleMenuDrawer={this.toggleMenuDrawer}
                        syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                        poolsMoreInfoOnClick={this.poolsMoreInfoOnClick}
                        setZecPrice={this.setZecPrice}
                        setComputingModalVisible={this.setComputingModalVisible}
                        set_privacy_option={this.set_privacy_option}
                        setPoolsToShieldSelectSapling={this.setPoolsToShieldSelectSapling}
                        setPoolsToShieldSelectTransparent={this.setPoolsToShieldSelectTransparent}
                        setUfvkViewModalVisible={this.setUfvkViewModalVisible}
                        setSendPageState={this.setSendPageState}
                      />*/}
                      <History
                        doRefresh={this.doRefresh}
                        toggleMenuDrawer={this.toggleMenuDrawer}
                        syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                        poolsMoreInfoOnClick={this.poolsMoreInfoOnClick}
                        setZecPrice={this.setZecPrice}
                        setComputingModalVisible={this.setComputingModalVisible}
                        set_privacy_option={this.set_privacy_option}
                        setUfvkViewModalVisible={this.setUfvkViewModalVisible}
                        setSendPageState={this.setSendPageState}
                        setShieldingAmount={this.setShieldingAmount}
                      />
                    </Suspense>
                  </>
                )}
              </Tab.Screen>
              {!readOnly &&
                !(mode === ModeEnum.basic && totalBalance.spendableOrchard + totalBalance.spendablePrivate <= 0) && (
                  <Tab.Screen name={translate('loadedapp.send-menu') as string}>
                    {() => (
                      <>
                        <Suspense
                          fallback={
                            <View>
                              <Text>{translate('loading') as string}</Text>
                            </View>
                          }>
                          {/*<Send
                            setSendPageState={this.setSendPageState}
                            sendTransaction={this.sendTransaction}
                            clearToAddr={this.clearToAddr}
                            setSendProgress={this.setSendProgress}
                            toggleMenuDrawer={this.toggleMenuDrawer}
                            syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                            poolsMoreInfoOnClick={this.poolsMoreInfoOnClick}
                            setZecPrice={this.setZecPrice}
                            setComputingModalVisible={this.setComputingModalVisible}
                            set_privacy_option={this.set_privacy_option}
                            setPoolsToShieldSelectSapling={this.setPoolsToShieldSelectSapling}
                            setPoolsToShieldSelectTransparent={this.setPoolsToShieldSelectTransparent}
                          />*/}
                          <Send
                            setSendPageState={this.setSendPageState}
                            sendTransaction={this.sendTransaction}
                            clearToAddr={this.clearToAddr}
                            setSendProgress={this.setSendProgress}
                            toggleMenuDrawer={this.toggleMenuDrawer}
                            syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                            poolsMoreInfoOnClick={this.poolsMoreInfoOnClick}
                            setZecPrice={this.setZecPrice}
                            setComputingModalVisible={this.setComputingModalVisible}
                            set_privacy_option={this.set_privacy_option}
                            setShieldingAmount={this.setShieldingAmount}
                          />
                        </Suspense>
                      </>
                    )}
                  </Tab.Screen>
                )}
              <Tab.Screen name={translate('loadedapp.uas-menu') as string}>
                {() => (
                  <>
                    <Suspense
                      fallback={
                        <View>
                          <Text>{translate('loading') as string}</Text>
                        </View>
                      }>
                      <Receive
                        setUaAddress={this.setUaAddress}
                        toggleMenuDrawer={this.toggleMenuDrawer}
                        syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                        set_privacy_option={this.set_privacy_option}
                        setUfvkViewModalVisible={this.setUfvkViewModalVisible}
                      />
                    </Suspense>
                  </>
                )}
              </Tab.Screen>
            </Tab.Navigator>
          ) : (
            <Tab.Navigator
              initialRouteName={translate('loadedapp.wallet-menu') as string}
              screenOptions={{
                tabBarStyle: {
                  borderTopColor: colors.background,
                  borderTopWidth: 0,
                  height: 0,
                },
                headerShown: false,
              }}>
              <Tab.Screen name={translate('loadedapp.wallet-menu') as string}>
                {() => (
                  <>
                    <Suspense
                      fallback={
                        <View>
                          <Text>{translate('loading') as string}</Text>
                        </View>
                      }>
                      <Receive
                        setUaAddress={this.setUaAddress}
                        toggleMenuDrawer={this.toggleMenuDrawer}
                        syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick}
                        set_privacy_option={this.set_privacy_option}
                        setUfvkViewModalVisible={this.setUfvkViewModalVisible}
                      />
                    </Suspense>
                  </>
                )}
              </Tab.Screen>
            </Tab.Navigator>
          )}
        </SideMenu>
      </ContextAppLoadedProvider>
    );
  }
}
