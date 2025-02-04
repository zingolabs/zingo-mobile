/* eslint-disable react-native/no-inline-styles */
import React, { Component, Suspense, useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Alert,
  I18nManager,
  EmitterSubscription,
  AppState,
  NativeEventSubscription,
  Linking,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faList, faUpload, faDownload, faCog, faComments, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@react-navigation/native';
import SideMenu from 'react-native-side-menu-updated';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { cloneDeep, isEqual } from 'lodash';
import { StackScreenProps } from '@react-navigation/stack';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';

import RPC from '../rpc';
import RPCModule from '../RPCModule';
import {
  AppStateLoaded,
  TotalBalanceClass,
  SendPageStateClass,
  InfoType,
  ToAddrClass,
  SyncingStatusClass,
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
  EventListenerEnum,
  AppContextLoaded,
  NetInfoType,
  WalletType,
  BackgroundErrorType,
  ValueTransferType,
  ValueTransferKindEnum,
  CurrencyNameEnum,
  RefreshScreenEnum,
} from '../AppState';
import Utils from '../utils';
import { ThemeType } from '../types';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import { ContextAppLoadedProvider } from '../context';
import { parseZcashURI, serverUris, ZcashURITargetClass } from '../uris';
import BackgroundFileImpl from '../../components/Background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import { sendEmail } from '../sendEmail';
import Snackbars from '../../components/Components/Snackbars';
import { RPCSeedType } from '../rpc/types/RPCSeedType';
import { Launching } from '../LoadingApp';
import { AddressBook } from '../../components/AddressBook';
import { AddressBookFileImpl } from '../../components/AddressBook';
import simpleBiometrics from '../simpleBiometrics';
import ShowAddressAlertAsync from '../../components/Send/components/ShowAddressAlertAsync';
import { createUpdateRecoveryWalletInfo, removeRecoveryWalletInfo } from '../recoveryWalletInfo';

import History from '../../components/History';
import Send from '../../components/Send';
import Receive from '../../components/Receive';
import Settings from '../../components/Settings';
import Menu from './components/Menu';
import { Messages } from '../../components/Messages';
import RegText from '../../components/Components/RegText';

const About = React.lazy(() => import('../../components/About'));
const Seed = React.lazy(() => import('../../components/Seed'));
const Info = React.lazy(() => import('../../components/Info'));
const SyncReport = React.lazy(() => import('../../components/SyncReport'));
const Rescan = React.lazy(() => import('../../components/Rescan'));
const Pools = React.lazy(() => import('../../components/Pools'));
const Insight = React.lazy(() => import('../../components/Insight'));
const ShowUfvk = React.lazy(() => import('../../components/Ufvk/ShowUfvk'));
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
  chainName: serverUris(() => {})[0].chainName,
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
  const [rescanMenu, setRescanMenu] = useState<boolean>(false);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] = useState<boolean>(false);
  const [zenniesDonationAddress, setZenniesDonationAddress] = useState<string>('');
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

      const { languageTag, isRTL } = RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

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

      // reading background task info
      const backgroundJson = await BackgroundFileImpl.readBackground();
      if (backgroundJson) {
        setBackground(backgroundJson);
      }

      // adding `Zenny Tips` address always.
      const zenniesAddress = await Utils.getZenniesDonationAddress(server.chainName);
      let ab = await AddressBookFileImpl.writeAddressBookItem(
        translate('zenny-tips-ab') as string,
        zenniesAddress,
        '',
        '',
      );
      setZenniesDonationAddress(zenniesAddress);

      // reply-to change, from full UA to only orchard UA.
      // we need to calculate the only orchard UA for all the
      // contacts with a full UA stored in the Address Book.
      // We need to identify the old transaction memos (with full UA)
      // and we need to idenfify the new transaction memos (with only orchard UA)

      // if some contact don't have the new field: `uOrchardAddress` then
      // the App have to create and calculate it if needed.
      // same thing with the color of the contact
      const toUpdate = ab.filter(
        (a: AddressBookFileClass) => !a.hasOwnProperty('uOrchardAddress') || !a.hasOwnProperty('color'),
      );
      console.log('Address Book -> TO UPDATE', toUpdate);
      if (toUpdate.length > 0) {
        const randomColors = Utils.generateColorList(toUpdate.length);
        for (let i = 0; i < toUpdate.length; i++) {
          const a = toUpdate[i];
          if (!a.hasOwnProperty('uOrchardAddress') && !a.hasOwnProperty('color')) {
            // both
            const validAddress: { isValid: boolean; onlyOrchardUA: string } = await Utils.isValidAddress(
              a.address,
              server.chainName,
            );
            ab = await AddressBookFileImpl.writeAddressBookItem(
              a.label,
              a.address,
              validAddress.onlyOrchardUA,
              randomColors[i],
            );
          } else if (!a.hasOwnProperty('uOrchardAddress')) {
            const validAddress: { isValid: boolean; onlyOrchardUA: string } = await Utils.isValidAddress(
              a.address,
              server.chainName,
            );
            ab = await AddressBookFileImpl.writeAddressBookItem(
              a.label,
              a.address,
              validAddress.onlyOrchardUA,
              a.color ? a.color : '',
            );
          } else if (!a.hasOwnProperty('color')) {
            ab = await AddressBookFileImpl.updateColorItem(
              a.label,
              a.address,
              a.uOrchardAddress ? a.uOrchardAddress : '',
              randomColors[i],
            );
          }
        }
      }
      // this is a good place to sort properly these data
      setAddressBook(
        ab.sort((a, b) => {
          const aLabel = a.label;
          const bLabel = b.label;
          return aLabel.localeCompare(bLabel);
        }),
      );

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
        addressBook={addressBook}
        security={security}
        selectServer={selectServer}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
        zenniesDonationAddress={zenniesDonationAddress}
      />
    );
  }
}

type LoadingProps = {
  backgroundColor: string;
  spinColor: string;
};

const Loading: React.FC<LoadingProps> = ({ backgroundColor, spinColor }) => {
  return (
    <View
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: backgroundColor,
        height: '100%',
      }}>
      <ActivityIndicator size="large" color={spinColor} />
    </View>
  );
};

type LoadedAppClassProps = {
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
  readOnly: boolean;
  addressBook: AddressBookFileClass[];
  security: SecurityType;
  selectServer: SelectServerEnum;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  zenniesDonationAddress: string;
};

type LoadedAppClassState = AppStateLoaded & AppContextLoaded;

export class LoadedAppClass extends Component<LoadedAppClassProps, LoadedAppClassState> {
  rpc: RPC;
  appstate: NativeEventSubscription;
  linking: EmitterSubscription;
  unsubscribeNetInfo: NetInfoSubscription;

  constructor(props: LoadedAppClassProps) {
    super(props);

    this.state = {
      //context
      navigation: props.navigation,
      netInfo: {} as NetInfoType,
      totalBalance: null,
      addresses: null,
      valueTransfers: null,
      valueTransfersFetchItems: 50,
      valueTransfersTotal: null,
      messages: null,
      messagesFetchItems: 50,
      messagesTotal: null,
      sendPageState: new SendPageStateClass(new ToAddrClass(0)),
      setSendPageState: this.setSendPageState,
      info: {} as InfoType,
      walletSettings: {} as WalletSettingsClass,
      syncingStatus: {} as SyncingStatusClass,
      wallet: {} as WalletType,
      uOrchardAddress: '',
      zecPrice: {
        zecPrice: 0,
        date: 0,
      } as ZecPriceType,
      background: props.background,
      translate: props.translate,
      backgroundError: {} as BackgroundErrorType,
      setBackgroundError: this.setBackgroundError,
      readOnly: props.readOnly,
      snackbars: [] as SnackbarType[],
      addLastSnackbar: this.addLastSnackbar,
      restartApp: this.navigateToLoadingApp,
      somePending: false,
      addressBook: props.addressBook,
      launchAddressBook: this.launchAddressBook,
      addressBookCurrentAddress: '',
      addressBookOpenPriorModal: () => {},
      shieldingAmount: 0,
      showSwipeableIcons: true,
      doRefresh: this.doRefresh,
      setZecPrice: this.setZecPrice,
      zenniesDonationAddress: props.zenniesDonationAddress,

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
      appStateStatus: Platform.OS === GlobalConst.platformOSios ? AppStateStatusEnum.active : AppState.currentState,
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: null,
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
      newServer: {} as ServerType,
      newSelectServer: null,
      scrollToTop: false,
      scrollToBottom: false,
    };

    this.rpc = new RPC(
      this.setTotalBalance,
      this.setValueTransfersList,
      this.setMessagesList,
      this.setAllAddresses,
      this.setWalletSettings,
      this.setInfo,
      this.setSyncingStatus,
      props.translate,
      this.keepAwake,
      this.setZingolibVersion,
      this.setWallet,
      props.readOnly,
    );

    this.appstate = {} as NativeEventSubscription;
    this.linking = {} as EmitterSubscription;
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
    });

    //console.log('DID MOUNT APPLOADED...', netInfoState);

    this.clearToAddr();

    // Configure the RPC to start doing refreshes
    this.rpc.setInRefresh(false);
    await this.rpc.clearTimers();
    await this.rpc.configure();

    this.appstate = AppState.addEventListener(EventListenerEnum.change, async nextAppState => {
      //console.log('LOADED', 'prior', this.state.appStateStatus, 'next', nextAppState);
      // let's catch the prior value
      const priorAppState = this.state.appStateStatus;
      if (Platform.OS === GlobalConst.platformOSios) {
        if (
          (priorAppState === AppStateStatusEnum.inactive && nextAppState === AppStateStatusEnum.active) ||
          (priorAppState === AppStateStatusEnum.active && nextAppState === AppStateStatusEnum.inactive)
        ) {
          //console.log('LOADED SAVED IOS do nothing', nextAppState);
          this.setState({ appStateStatus: nextAppState });
          return;
        }
        if (priorAppState === AppStateStatusEnum.inactive && nextAppState === AppStateStatusEnum.background) {
          console.log('App LOADED IOS is gone to the background!');
          this.setState({ appStateStatus: nextAppState });
          // setting value for background task Android
          await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
          console.log('&&&&& background yes in storage &&&&&');
          this.rpc.setInRefresh(false);
          await this.rpc.clearTimers();
          //console.log('clear timers IOS');
          this.setSyncingStatus(new SyncingStatusClass());
          //console.log('clear sync status state');
          //console.log('LOADED SAVED IOS background', nextAppState);
          // We need to save the wallet file here because
          // sometimes the App can lose the last synced chunk
          await RPCModule.doSave();
          return;
        }
      }
      if (Platform.OS === GlobalConst.platformOSandroid) {
        if (priorAppState !== nextAppState) {
          //console.log('LOADED SAVED Android', nextAppState);
          this.setState({ appStateStatus: nextAppState });
        }
      }
      if (
        (priorAppState === AppStateStatusEnum.inactive || priorAppState === AppStateStatusEnum.background) &&
        nextAppState === AppStateStatusEnum.active
      ) {
        //console.log('App LOADED Android & IOS has come to the foreground!');
        if (Platform.OS === GlobalConst.platformOSios) {
          //console.log('LOADED SAVED IOS foreground', nextAppState);
          this.setState({ appStateStatus: nextAppState });
        }
        // (PIN or TouchID or FaceID)
        const resultBio = this.state.security.foregroundApp
          ? await simpleBiometrics({ translate: this.state.translate })
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
          console.log('&&&&& background no in storage &&&&&');
          this.rpc.setInRefresh(false);
          await this.rpc.clearTimers();
          await this.rpc.configure();
          //console.log('configure start timers Android & IOS');
          if (this.state.backgroundError && (this.state.backgroundError.title || this.state.backgroundError.error)) {
            Alert.alert(this.state.backgroundError.title, this.state.backgroundError.error);
            this.setBackgroundError('', '');
          }
        }
      } else if (
        priorAppState === AppStateStatusEnum.active &&
        (nextAppState === AppStateStatusEnum.inactive || nextAppState === AppStateStatusEnum.background)
      ) {
        console.log('App LOADED is gone to the background!');
        // setting value for background task Android
        await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
        console.log('&&&&& background yes in storage &&&&&');
        this.rpc.setInRefresh(false);
        await this.rpc.clearTimers();
        //console.log('clear timers');
        this.setSyncingStatus(new SyncingStatusClass());
        //console.log('clear sync status state');
        // We need to save the wallet file here because
        // sometimes the App can lose the last synced chunk
        await RPCModule.doSave();
        if (Platform.OS === GlobalConst.platformOSios) {
          //console.log('LOADED SAVED IOS background', nextAppState);
          this.setState({ appStateStatus: nextAppState });
        }
      } else {
        if (Platform.OS === GlobalConst.platformOSios) {
          if (priorAppState !== nextAppState) {
            //console.log('LOADED SAVED IOS', nextAppState);
            this.setState({ appStateStatus: nextAppState });
          }
        }
      }
    });

    const initialUrl = await Linking.getInitialURL();
    if (initialUrl !== null) {
      this.readUrl(initialUrl);
    }

    this.linking = Linking.addEventListener(EventListenerEnum.url, async ({ url }) => {
      //console.log(url);
      if (url !== null) {
        this.readUrl(url);
      }

      this.closeAllModals();
      this.state.navigation.navigate(RouteEnums.LoadedApp, {
        screen: this.state.translate('loadedapp.send-menu'),
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
          } else {
            //console.log('EVENT Loaded: YES internet connection.');
            if (this.rpc.getInRefresh()) {
              // I need to start again the App only if it is Syncing...
              this.navigateToLoadingApp({ startingApp: false });
            } else {
              // restart the interval process again if it is not syncing...
              this.rpc.setInRefresh(false);
              await this.rpc.clearTimers();
              await this.rpc.configure();
            }
          }
        }
      }
    });
  };

  componentWillUnmount = async () => {
    this.rpc.setInRefresh(false);
    await this.rpc.clearTimers();
    this.appstate && typeof this.appstate.remove === 'function' && this.appstate.remove();
    this.linking && typeof this.linking === 'function' && this.linking.remove();
    this.unsubscribeNetInfo && typeof this.unsubscribeNetInfo === 'function' && this.unsubscribeNetInfo();
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
    if (url && url.startsWith(GlobalConst.zcash) && !this.state.readOnly) {
      const target: string | ZcashURITargetClass = await parseZcashURI(url, this.state.translate, this.state.server);
      //console.log(targets);

      if (typeof target !== 'string') {
        let update = false;
        if (
          this.state.sendPageState.toaddr.to &&
          target.address &&
          this.state.sendPageState.toaddr.to !== target.address
        ) {
          await ShowAddressAlertAsync(this.state.translate)
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
            const to = new ToAddrClass(0);

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

  setUfvkViewModalVisible = async (value: boolean) => {
    this.setState({ ufvkViewModalVisible: value });
  };

  setShieldingAmount = (value: number) => {
    //const start = Date.now();
    this.setState({ shieldingAmount: value });
    //console.log('=========================================== > SH AMOUNT STORED SETSTATE - ', Date.now() - start);
  };

  setShowSwipeableIcons = (value: boolean) => {
    this.setState({ showSwipeableIcons: value });
  };

  setTotalBalance = (totalBalance: TotalBalanceClass) => {
    if (!isEqual(this.state.totalBalance, totalBalance)) {
      //console.log('fetch total balance');
      //const start = Date.now();
      this.setState({ totalBalance });
      //console.log('=========================================== > BALANCE STORED SETSTATE - ', Date.now() - start);
    }
  };

  setSyncingStatus = (syncingStatus: SyncingStatusClass) => {
    if (!isEqual(this.state.syncingStatus, syncingStatus)) {
      //console.log('fetch syncing status report');
      //const start = Date.now();
      this.setState({ syncingStatus });
      //console.log('=========================================== > SYNC STATUS STORED SETSTATE - ', Date.now() - start);
    }
  };

  setValueTransfersList = async (valueTransfers: ValueTransferType[], valueTransfersTotal: number) => {
    const basicFirstViewSeed = (await SettingsFileImpl.readSettings()).basicFirstViewSeed;
    // only for basic mode
    if (this.state.mode === ModeEnum.basic) {
      // only if the user doesn't see the seed the first time
      if (!basicFirstViewSeed) {
        // only if the App are in foreground
        const background = await AsyncStorage.getItem(GlobalConst.background);
        // only if the wallet have some ValueTransfers
        if (background === GlobalConst.no && valueTransfersTotal > 0) {
          // I need to check this out in the seed screen.
          this.setState({ seedViewModalVisible: true });
        }
      }
    } else {
      // for advanced mode
      if (!basicFirstViewSeed) {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
      }
    }
    if (!isEqual(this.state.valueTransfers, valueTransfers) || this.state.valueTransfersTotal !== valueTransfersTotal) {
      // set somePending as well here when I know there is something new in ValueTransfers
      const pending: number =
        valueTransfersTotal > 0 ? valueTransfers.filter((vt: ValueTransferType) => vt.confirmations === 0).length : 0;
      // if a ValueTransfer go from 0 confirmations to > 0 -> Show a message about a ValueTransfer is confirmed
      this.state.valueTransfers &&
        this.state.valueTransfersTotal &&
        this.state.valueTransfersTotal > 0 &&
        this.state.valueTransfers
          .filter((vtOld: ValueTransferType) => !vtOld.confirmations || vtOld.confirmations === 0)
          .forEach((vtOld: ValueTransferType) => {
            const vtNew = valueTransfers.filter(
              (vt: ValueTransferType) =>
                vt.txid === vtOld.txid && vt.address === vtOld.address && vt.poolType === vtOld.poolType,
            );
            //console.log('old', vtOld);
            //console.log('new', vtNew);
            // the ValueTransfer is confirmed
            if (vtNew.length > 0 && vtNew[0].confirmations > 0) {
              let message: string = '';
              let title: string = '';
              if (vtNew[0].kind === ValueTransferKindEnum.Received && vtNew[0].amount > 0) {
                message =
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate('loadedapp.receive-menu') as string;
              } else if (vtNew[0].kind === ValueTransferKindEnum.MemoToSelf && vtNew[0].fee && vtNew[0].fee > 0) {
                message =
                  (this.state.translate('loadedapp.valuetransfer-confirmed') as string) +
                  (this.state.translate('history.memotoself') as string) +
                  (vtNew[0].fee
                    ? ((' ' + this.state.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].fee, 8) +
                      ' ' +
                      this.state.info.currencyName
                    : '');
                title = this.state.translate('loadedapp.send-menu') as string;
              } else if (vtNew[0].kind === ValueTransferKindEnum.SendToSelf && vtNew[0].fee && vtNew[0].fee > 0) {
                message =
                  (this.state.translate('loadedapp.valuetransfer-confirmed') as string) +
                  (this.state.translate('history.sendtoself') as string) +
                  (vtNew[0].fee
                    ? ((' ' + this.state.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].fee, 8) +
                      ' ' +
                      this.state.info.currencyName
                    : '');
                title = this.state.translate('loadedapp.send-menu') as string;
              } else if (vtNew[0].kind === ValueTransferKindEnum.Rejection && vtNew[0].amount > 0) {
                // not so sure about this `kind`...
                // I guess the wallet is receiving some refund from a TEX sent.
                message =
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate('loadedapp.receive-menu') as string;
              } else if (vtNew[0].kind === ValueTransferKindEnum.Shield && vtNew[0].amount > 0) {
                message =
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.shield') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate('loadedapp.receive-menu') as string;
              } else if (vtNew[0].kind === ValueTransferKindEnum.Sent && vtNew[0].amount > 0) {
                message =
                  (this.state.translate('loadedapp.payment-made') as string) +
                  (this.state.translate('history.sent') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate('loadedapp.send-menu') as string;
              }
              if (message && title) {
                createAlert(this.setBackgroundError, this.addLastSnackbar, title, message, true, this.state.translate);
              }
            }
            // the ValueTransfer is gone -> Likely Reverted by the server
            if (vtNew.length === 0) {
              createAlert(
                this.setBackgroundError,
                this.addLastSnackbar,
                this.state.translate('loadedapp.send-menu') as string,
                this.state.translate('loadedapp.valuetransfer-reverted') as string,
                true,
                this.state.translate,
              );
            }
          });
      // if some tx is confirmed the UI needs some time to
      // acomodate the bottom tabs.
      //const start = Date.now();
      setTimeout(
        () => {
          this.setState({
            valueTransfers,
            somePending: pending > 0,
            valueTransfersTotal,
          });
        },
        pending === 0 ? 250 : 0,
      );
      //console.log(
      //  '=========================================== > VALUE TRANSFERS STORED SETSTATE - ',
      //  Date.now() - start,
      //);
    }
  };

  setMessagesList = (messages: ValueTransferType[], messagesTotal: number) => {
    if (!isEqual(this.state.messages, messages) || this.state.messagesTotal !== messagesTotal) {
      //console.log('fetch messages');
      //const start = Date.now();
      this.setState({ messages, messagesTotal });
      //console.log('=========================================== > MESSAGES STORED SETSTATE - ', Date.now() - start);
    }
  };

  setAllAddresses = (addresses: AddressClass[]) => {
    if (!isEqual(this.state.addresses, addresses)) {
      //console.log('fetch addresses');
      //const start = Date.now();
      this.setState({ addresses });
      //console.log('=========================================== > ADDRESSES STORED SETSTATE - ', Date.now() - start);
    }
    if (addresses.length > 0) {
      if (this.state.uOrchardAddress !== addresses[0].uOrchardAddress) {
        this.setState({ uOrchardAddress: addresses[0].uOrchardAddress });
      }
    } else {
      this.setState({ uOrchardAddress: '' });
    }
  };

  setWalletSettings = (walletSettings: WalletSettingsClass) => {
    if (!isEqual(this.state.walletSettings, walletSettings)) {
      //console.log('fetch wallet settings');
      //const start = Date.now();
      this.setState({ walletSettings });
      //console.log(
      //  '=========================================== > WALLET SETTINGS STORED SETSTATE - ',
      //  Date.now() - start,
      //);
    }
  };

  setSendPageState = (sendPageState: SendPageStateClass) => {
    //console.log('fetch send page state');
    //const start = Date.now();
    this.setState({ sendPageState });
    //console.log('=========================================== > SEND PAGE STORED SETSTATE - ', Date.now() - start);
  };

  clearToAddr = () => {
    const newToAddr = new ToAddrClass(0);

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

  setInfo = (info: InfoType) => {
    let newInfo = cloneDeep(info);
    if (!newInfo.zingolib) {
      newInfo.zingolib = this.state.info.zingolib;
    }
    if (!isEqual(this.state.info, newInfo)) {
      // if currencyName is empty,
      // I need to rescue the last value from the state,
      // or rescue the value from server.chainName.
      if (!newInfo.currencyName) {
        if (this.state.info.currencyName) {
          newInfo.currencyName = this.state.info.currencyName;
        } else {
          newInfo.currencyName =
            this.state.server.chainName === ChainNameEnum.mainChainName ? CurrencyNameEnum.ZEC : CurrencyNameEnum.TAZ;
        }
      }
      if (!newInfo.chainName) {
        newInfo.chainName = this.state.server.chainName;
      }
      if (!newInfo.serverUri) {
        newInfo.serverUri = this.state.server.uri;
      }
      //const start = Date.now();
      this.setState({ info: newInfo });
      //console.log('=========================================== > INFO STORED SETSTATE - ', Date.now() - start);
    }
  };

  setZingolibVersion = (zingolib: string) => {
    if (!this.state.info.zingolib) {
      let newInfo = cloneDeep(this.state.info);
      newInfo.zingolib = zingolib;
      //const start = Date.now();
      this.setState({ info: newInfo });
      //console.log('=========================================== > ZINGOLIB STORED SETSTATE - ', Date.now() - start);
    }
  };

  sendTransaction = async (sendPageState: SendPageStateClass): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const { uOrchardAddress, server, donation } = this.state;
      const sendJson = await Utils.getSendManyJSON(sendPageState, uOrchardAddress, server, donation);
      //const start = Date.now();
      const txid = await this.rpc.sendTransaction(sendJson);
      //console.log('&&&&&&&&&&&&&& send tx', Date.now() - start);

      return txid;
    } catch (err) {
      //console.log('route sendtx error', err);
      throw err;
    }
  };

  doRefresh = (screen: RefreshScreenEnum) => {
    //console.log('================== MANUAL REFRESH ================== ', screen);
    if (screen === RefreshScreenEnum.History || screen === RefreshScreenEnum.ContactList) {
      // Value Transfers
      this.rpc.fetchTandZandOValueTransfers();
    } else {
      // Messeges
      this.rpc.fetchTandZandOMessages();
    }
  };

  doRescan = async () => {
    await this.rpc.stopSyncProcess();
    this.rpc.refreshSync(false, true);
  };

  toggleMenuDrawer = () => {
    //const start = Date.now();
    this.setState({
      isMenuDrawerOpen: !this.state.isMenuDrawerOpen,
    });
    //console.log('=========================================== > TOGGLE MENU STORED SETSTATE - ', Date.now() - start);
  };

  updateMenuState = (isMenuDrawerOpen: boolean) => {
    //const start = Date.now();
    this.setState({ isMenuDrawerOpen });
    //console.log('=========================================== > UPDATE MENU STORED SETSTATE - ', Date.now() - start);
  };

  setWallet = async (wallet: WalletType) => {
    //console.log(wallet, this.state.readOnly);
    if (!isEqual(this.state.wallet, wallet)) {
      //const start = Date.now();
      this.setState({ wallet });
      //console.log('=========================================== > WALLET STORED SETSTATE - ', Date.now() - start);
    }
  };

  onMenuItemSelected = async (item: MenuItemEnum) => {
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
      const { translate } = this.state;
      Alert.alert(
        translate('loadingapp.alert-donation-title') as string,
        translate('loadingapp.alert-donation-body') as string,
        [
          {
            text: translate('confirm') as string,
            onPress: async () => await this.setDonationOption(true),
          },
          {
            text: translate('cancel') as string,
            onPress: async () => await this.setDonationOption(false),
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
        this.state.sendPageState.toaddr.to !== (await Utils.getNymDonationAddress(this.state.server.chainName))
      ) {
        await ShowAddressAlertAsync(this.state.translate)
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
        const to = new ToAddrClass(0);

        to.to = await Utils.getNymDonationAddress(this.state.server.chainName);
        to.amount = Utils.getNymDonationAmount();
        to.memo = Utils.getNymDonationMemo(this.state.translate);
        to.includeUAMemo = true;

        uriToAddr = to;

        newSendPageState.toaddr = uriToAddr;

        this.setSendPageState(newSendPageState);
      }
      this.closeAllModals();
      this.state.navigation.navigate(RouteEnums.LoadedApp, {
        screen: this.state.translate('loadedapp.send-menu'),
        initial: false,
      });
    } else if (item === MenuItemEnum.Support) {
      this.setShowSwipeableIcons(false);
      await sendEmail(this.state.translate, this.state.info.zingolib);
      this.setShowSwipeableIcons(true);
    }
    this.setState({
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: item,
    });
  };

  setWalletOption = async (walletOption: string, value: string): Promise<void> => {
    await RPC.rpcSetWalletSettingOption(walletOption, value);

    // Refetch the settings updated
    this.rpc.fetchWalletSettings();
  };

  setServerOption = async (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ): Promise<void> => {
    // here I know the server was changed, clean all the tasks before anything.
    this.rpc.setInRefresh(false);
    await this.rpc.clearTimers();
    this.setSyncingStatus(new SyncingStatusClass());
    this.rpc.setInRefresh(false);
    this.keepAwake(false);
    // First we need to check the `chainName` between servers, if this is different
    // we cannot try to open the current wallet, because make not sense.
    let error = false;
    if (!sameServerChainName) {
      error = true;
    } else {
      // when I try to open the wallet in the new server:
      // - the seed doesn't exists (the type of sever is different `main` / `test` / `regtest` ...).
      //   The App have to go to the initial screen
      // - the seed exists and the App can open the wallet in the new server.
      //   But I have to restart the sync if needed.
      let result: string = await RPCModule.loadExistingWallet(value.uri, value.chainName);
      //console.log('load existing wallet', result);
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType = await JSON.parse(result);
          if (
            !resultJson.error ||
            (resultJson.error && resultJson.error.startsWith('This wallet is watch-only') && this.state.readOnly)
          ) {
            // Load the wallet and navigate to the ValueTransfers screen
            //console.log(`wallet loaded ok ${value.uri}`);
            if (toast && selectServer !== SelectServerEnum.offline) {
              this.addLastSnackbar({
                message: `${this.state.translate('loadedapp.readingwallet')} ${value.uri}`,
              });
            }
            await SettingsFileImpl.writeSettings(SettingsNameEnum.server, value);
            await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, selectServer);
            this.setState({
              server: value,
              selectServer: selectServer,
            });
            // the server is changed, the App needs to restart the timeout tasks from the beginning
            this.rpc.setInRefresh(false);
            await this.rpc.clearTimers();
            await this.rpc.configure();
            return;
          } else {
            error = true;
          }
        } catch (e) {
          error = true;
        }
      } else {
        error = true;
      }
    }

    // if the chainName is different between server or we cannot open the wallet...
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
          message: `${this.state.translate('loadedapp.readingwallet-error')} ${value.uri}`,
        });
      }

      // we need to restore the old server because the new one doesn't have the seed of the current wallet.
      const oldSettings = await SettingsFileImpl.readSettings();
      await RPCModule.execute(CommandEnum.changeserver, oldSettings.server.uri);

      // go to the seed screen for changing the wallet for another in the new server or cancel this action.
      this.setState({
        newServer: value as ServerType,
        newSelectServer: selectServer,
        server: oldSettings.server,
        selectServer: oldSettings.selectServer,
      });
    }
  };

  setCurrencyOption = async (value: CurrencyEnum): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.currency, value);
    this.setState({
      currency: value as CurrencyEnum,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  setLanguageOption = async (value: string, reset: boolean): Promise<void> => {
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

  setSendAllOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.sendAll, value);
    this.setState({
      sendAll: value as boolean,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  setDonationOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.donation, value);
    this.setState({
      donation: value as boolean,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  setPrivacyOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, value);
    this.setState({
      privacy: value as boolean,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  setModeOption = async (value: string): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, value);
    this.setState({
      mode: value as ModeEnum,
    });
    // this function change the Theme in the App component.
    this.props.toggleTheme(value as ModeEnum);

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  setSecurityOption = async (value: SecurityType): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.security, value);
    this.setState({
      security: value as SecurityType,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  setSelectServerOption = async (value: string): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, value);
    this.setState({
      selectServer: value as SelectServerEnum,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  setRescanMenuOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.rescanMenu, value);
    this.setState({
      rescanMenu: value as boolean,
    });

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  setRecoveryWalletInfoOnDeviceOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.recoveryWalletInfoOnDevice, value);
    this.setState({
      recoveryWalletInfoOnDevice: value as boolean,
    });

    if (!value) {
      await removeRecoveryWalletInfo();
    } else {
      const wallet: WalletType = await RPC.rpcFetchWallet(this.state.readOnly);
      await createUpdateRecoveryWalletInfo(wallet);
    }

    // Refetch the settings to update
    this.rpc.fetchWalletSettings();
  };

  navigateToLoadingApp = async (state: any) => {
    const { navigation } = this.state;

    this.rpc.setInRefresh(false);
    await this.rpc.clearTimers();
    if (!!state.screen && state.screen === 3) {
      await this.setModeOption(ModeEnum.advanced);
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
    if (server.chainName === ChainNameEnum.mainChainName) {
      // backup
      resultStr = (await this.rpc.changeWallet()) as string;
    } else {
      // no backup
      resultStr = (await this.rpc.changeWalletNoBackup()) as string;
    }

    //console.log("jc change", resultStr);
    if (resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error change wallet. ${resultStr}`);
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadedapp.changingwallet-label') as string,
        resultStr,
        false,
        this.state.translate,
        sendEmail,
        this.state.info.zingolib,
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
        this.state.translate('loadedapp.restoringwallet-label') as string,
        resultStr,
        false,
        this.state.translate,
        sendEmail,
        this.state.info.zingolib,
      );
      return;
    }

    this.rpc.setInRefresh(false);
    this.keepAwake(false);
    this.setState({ seedBackupModalVisible: false });
    this.navigateToLoadingApp({ startingApp: false });
  };

  onClickOKServerWallet = async () => {
    if (this.state.newServer && this.state.newSelectServer) {
      const beforeServer = this.state.server;

      const resultStrServerPromise = RPCModule.execute(CommandEnum.changeserver, this.state.newServer.uri);
      const timeoutServerPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Promise changeserver Timeout 30 seconds'));
        }, 30000);
      });

      const resultStrServer: string = await Promise.race([resultStrServerPromise, timeoutServerPromise]);
      //console.log(resultStrServer);

      if (!resultStrServer || resultStrServer.toLowerCase().startsWith(GlobalConst.error)) {
        //console.log(`Error change server ${value} - ${resultStr}`);
        this.addLastSnackbar({
          message: `${this.state.translate('loadedapp.changeservernew-error')} ${resultStrServer}`,
        });
        return;
      } else {
        //console.log(`change server ok ${value}`);
      }

      await SettingsFileImpl.writeSettings(SettingsNameEnum.server, this.state.newServer);
      await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, this.state.newSelectServer);
      this.setState({
        server: this.state.newServer,
        selectServer: this.state.newSelectServer,
        newServer: {} as ServerType,
        newSelectServer: null,
      });

      await this.rpc.fetchInfoAndServerHeight();

      let resultStr2 = '';
      // if the server was testnet or regtest -> no need backup the wallet.
      if (beforeServer.chainName === ChainNameEnum.mainChainName) {
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
          this.state.translate('loadedapp.changingwallet-label') as string,
          resultStr2,
          false,
          this.state.translate,
          sendEmail,
          this.state.info.zingolib,
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

  syncingStatusMoreInfoOnClick = async () => {
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

  setScrollToTop = (value: boolean) => {
    this.setState({
      scrollToTop: value,
    });
  };

  setScrollToBottom = (value: boolean) => {
    this.setState({
      scrollToBottom: value,
    });
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
      valueTransfersTotal,
      readOnly,
      totalBalance,
      translate,
      scrollToTop,
      scrollToBottom,
      addresses,
      somePending,
      selectServer,
    } = this.state;
    const { colors } = this.props.theme;

    const context = {
      //context
      navigation: this.state.navigation,
      netInfo: this.state.netInfo,
      wallet: this.state.wallet,
      totalBalance: this.state.totalBalance,
      addresses: this.state.addresses,
      valueTransfers: this.state.valueTransfers,
      valueTransfersTotal: this.state.valueTransfersTotal,
      valueTransfersFetchItems: this.state.valueTransfersFetchItems,
      messages: this.state.messages,
      messagesTotal: this.state.messagesTotal,
      messagesFetchItems: this.state.messagesFetchItems,
      walletSettings: this.state.walletSettings,
      syncingStatus: this.state.syncingStatus,
      info: this.state.info,
      zecPrice: this.state.zecPrice,
      uOrchardAddress: this.state.uOrchardAddress,
      sendPageState: this.state.sendPageState,
      setSendPageState: this.state.setSendPageState,
      background: this.state.background,
      translate: this.state.translate,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      snackbars: this.state.snackbars,
      addLastSnackbar: this.state.addLastSnackbar,
      addressBook: this.state.addressBook,
      launchAddressBook: this.state.launchAddressBook,
      addressBookCurrentAddress: this.state.addressBookCurrentAddress,
      addressBookOpenPriorModal: this.state.addressBookOpenPriorModal,
      shieldingAmount: this.state.shieldingAmount,
      restartApp: this.state.restartApp,
      somePending: this.state.somePending,
      showSwipeableIcons: this.state.showSwipeableIcons,
      doRefresh: this.state.doRefresh,
      setZecPrice: this.state.setZecPrice,
      zenniesDonationAddress: this.state.zenniesDonationAddress,

      // context settings
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

    const menu = <Menu onItemSelected={this.onMenuItemSelected} updateMenuState={this.updateMenuState} />;

    const fnTabBarIcon = (route: StackScreenProps<any>['route'], focused: boolean, navigation: any) => {
      var iconName;

      if (route.name === translate('loadedapp.history-menu')) {
        iconName = faList;
      } else if (route.name === translate('loadedapp.send-menu')) {
        if (
          mode === ModeEnum.basic &&
          !!totalBalance &&
          totalBalance.spendableOrchard + totalBalance.spendablePrivate === 0 &&
          somePending
        ) {
          iconName = faRefresh;
        } else {
          iconName = faUpload;
        }
      } else if (route.name === translate('loadedapp.receive-menu')) {
        iconName = faDownload;
      } else if (route.name === translate('loadedapp.messages-menu')) {
        iconName = faComments;
      } else {
        iconName = faCog;
      }

      return (
        <TouchableOpacity
          style={{ width: 70, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            navigation.navigate(route.name);
          }}>
          {focused ? (
            <FontAwesomeIcon size={30} icon={iconName} color={colors.background} />
          ) : (
            <FontAwesomeIcon size={20} icon={iconName} color={colors.money} />
          )}
        </TouchableOpacity>
      );
    };

    const fnTabBarLabel = (route: StackScreenProps<any>['route'], focused: boolean, navigation: any) => {
      return (
        <>
          {!focused && (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate(route.name);
              }}>
              <RegText style={{ fontSize: 14 }} color={colors.money}>
                {route.name}
              </RegText>
            </TouchableOpacity>
          )}
        </>
      );
    };

    //console.log('render LoadedAppClass - 3', this.state.selectServer, this.state.server);
    //console.log('vt', valueTransfers);
    //console.log('ad', addresses);
    //console.log('ba', totalBalance);

    return (
      <ContextAppLoadedProvider value={context}>
        <SideMenu menu={menu} isOpen={isMenuDrawerOpen} onChange={(isOpen: boolean) => this.updateMenuState(isOpen)}>
          <Modal
            animationType="slide"
            transparent={false}
            visible={aboutModalVisible}
            onRequestClose={() => this.setState({ aboutModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <About closeModal={() => this.setState({ aboutModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={infoModalVisible}
            onRequestClose={() => this.setState({ infoModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <Info closeModal={() => this.setState({ infoModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={syncReportModalVisible}
            onRequestClose={() => this.setState({ syncReportModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <SyncReport closeModal={() => this.setState({ syncReportModalVisible: false })} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={poolsModalVisible}
            onRequestClose={() => this.setState({ poolsModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <Pools
                closeModal={() => this.setState({ poolsModalVisible: false })}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={insightModalVisible}
            onRequestClose={() => this.setState({ insightModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <Insight
                closeModal={() => this.setState({ insightModalVisible: false })}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={rescanModalVisible}
            onRequestClose={() => this.setState({ rescanModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <Rescan closeModal={() => this.setState({ rescanModalVisible: false })} doRescan={this.doRescan} />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={settingsModalVisible}
            onRequestClose={() => this.setState({ settingsModalVisible: false })}>
            <Settings
              closeModal={() => this.setState({ settingsModalVisible: false })}
              setWalletOption={this.setWalletOption}
              setServerOption={this.setServerOption}
              setCurrencyOption={this.setCurrencyOption}
              setLanguageOption={this.setLanguageOption}
              setSendAllOption={this.setSendAllOption}
              setDonationOption={this.setDonationOption}
              setPrivacyOption={this.setPrivacyOption}
              setModeOption={this.setModeOption}
              setSecurityOption={this.setSecurityOption}
              setSelectServerOption={this.setSelectServerOption}
              setRescanMenuOption={this.setRescanMenuOption}
              setRecoveryWalletInfoOnDeviceOption={this.setRecoveryWalletInfoOnDeviceOption}
            />
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedViewModalVisible}
            onRequestClose={() => this.setState({ seedViewModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <Seed
                onClickOK={() => this.setState({ seedViewModalVisible: false })}
                onClickCancel={() => this.setState({ seedViewModalVisible: false })}
                action={SeedActionEnum.view}
                setPrivacyOption={this.setPrivacyOption}
                keepAwake={this.keepAwake}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedChangeModalVisible}
            onRequestClose={() => this.setState({ seedChangeModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <Seed
                onClickOK={async () => await this.onClickOKChangeWallet({ startingApp: false })}
                onClickCancel={() => this.setState({ seedChangeModalVisible: false })}
                action={SeedActionEnum.change}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedBackupModalVisible}
            onRequestClose={() => this.setState({ seedBackupModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <Seed
                onClickOK={async () => await this.onClickOKRestoreBackup()}
                onClickCancel={() => this.setState({ seedBackupModalVisible: false })}
                action={SeedActionEnum.backup}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={seedServerModalVisible}
            onRequestClose={() => this.setState({ seedServerModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <Seed
                onClickOK={async () => await this.onClickOKServerWallet()}
                onClickCancel={async () => {
                  // restart all the tasks again, nothing happen.
                  this.rpc.setInRefresh(false);
                  await this.rpc.clearTimers();
                  await this.rpc.configure();
                  this.setState({ seedServerModalVisible: false });
                }}
                action={SeedActionEnum.server}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={ufvkViewModalVisible}
            onRequestClose={() => this.setState({ ufvkViewModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <ShowUfvk
                onClickOK={() => this.setState({ ufvkViewModalVisible: false })}
                onClickCancel={() => this.setState({ ufvkViewModalVisible: false })}
                action={UfvkActionEnum.view}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={ufvkChangeModalVisible}
            onRequestClose={() => this.setState({ ufvkChangeModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <ShowUfvk
                onClickOK={async () => await this.onClickOKChangeWallet({ startingApp: false })}
                onClickCancel={() => this.setState({ ufvkChangeModalVisible: false })}
                action={UfvkActionEnum.change}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={ufvkBackupModalVisible}
            onRequestClose={() => this.setState({ ufvkBackupModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <ShowUfvk
                onClickOK={async () => await this.onClickOKRestoreBackup()}
                onClickCancel={() => this.setState({ ufvkBackupModalVisible: false })}
                action={UfvkActionEnum.backup}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={ufvkServerModalVisible}
            onRequestClose={() => this.setState({ ufvkServerModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <ShowUfvk
                onClickOK={async () => await this.onClickOKServerWallet()}
                onClickCancel={async () => {
                  // restart all the tasks again, nothing happen.
                  this.rpc.setInRefresh(false);
                  await this.rpc.clearTimers();
                  await this.rpc.configure();
                  this.setState({ ufvkServerModalVisible: false });
                }}
                action={UfvkActionEnum.server}
                setPrivacyOption={this.setPrivacyOption}
              />
            </Suspense>
          </Modal>

          <Modal
            animationType="slide"
            transparent={false}
            visible={computingModalVisible}
            onRequestClose={() => this.setState({ computingModalVisible: false })}>
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
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
            <Suspense fallback={<Loading backgroundColor={colors.background} spinColor={colors.primary} />}>
              <AddressBook
                closeModal={() =>
                  this.setState({
                    addressBookModalVisible: false,
                    addressBookCurrentAddress: '',
                    addressBookOpenPriorModal: () => {},
                  })
                }
                setAddressBook={this.setAddressBook}
              />
            </Suspense>
          </Modal>

          <Snackbars snackbars={snackbars} removeFirstSnackbar={this.removeFirstSnackbar} translate={translate} />

          {mode === ModeEnum.advanced ||
          (!!valueTransfersTotal && valueTransfersTotal > 0) ||
          (!readOnly && !!totalBalance && totalBalance.spendableOrchard + totalBalance.spendablePrivate > 0) ? (
            <Tab.Navigator
              initialRouteName={translate('loadedapp.messages-menu') as string}
              screenOptions={({ route, navigation }) => ({
                tabBarIcon: ({ focused }) => fnTabBarIcon(route, focused, navigation),
                tabBarLabelPosition: 'below-icon',
                tabBarActiveTintColor: 'transparent',
                tabBarActiveBackgroundColor: colors.primaryDisabled,
                tabBarInactiveTintColor: colors.money,
                tabBarLabel: ({ focused }) => fnTabBarLabel(route, focused, navigation),
                tabBarLabelStyle: { fontSize: 12 },
                tabBarStyle: {
                  borderRadius: 0,
                  borderTopColor: colors.primaryDisabled,
                  borderTopWidth: 1,
                },
                headerShown: false,
              })}>
              <Tab.Screen name={translate('loadedapp.messages-menu') as string}>
                {() => (
                  <Messages
                    toggleMenuDrawer={this.toggleMenuDrawer /* header */}
                    syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick /* header */}
                    setPrivacyOption={this.setPrivacyOption /* header */}
                    setScrollToTop={this.setScrollToTop /* chats */}
                    scrollToTop={scrollToTop /* chats */}
                    setScrollToBottom={this.setScrollToBottom /* messages */}
                    scrollToBottom={scrollToBottom /* messages */}
                    setUfvkViewModalVisible={this.setUfvkViewModalVisible /* header */}
                    sendTransaction={this.sendTransaction /* messages */}
                    setServerOption={this.setServerOption /* messages */}
                  />
                )}
              </Tab.Screen>
              {!readOnly &&
                selectServer !== SelectServerEnum.offline &&
                (mode === ModeEnum.advanced ||
                  (!!totalBalance && totalBalance.spendableOrchard + totalBalance.spendablePrivate > 0) ||
                  (!!totalBalance &&
                    totalBalance.spendableOrchard + totalBalance.spendablePrivate === 0 &&
                    somePending)) && (
                  <Tab.Screen name={translate('loadedapp.send-menu') as string}>
                    {() => (
                      <Send
                        toggleMenuDrawer={this.toggleMenuDrawer /* header */}
                        poolsMoreInfoOnClick={this.poolsMoreInfoOnClick /* header */}
                        syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick /* header */}
                        setPrivacyOption={this.setPrivacyOption /* header */}
                        setShieldingAmount={this.setShieldingAmount /* header */}
                        setComputingModalVisible={this.setComputingModalVisible /* header & send */}
                        setScrollToTop={this.setScrollToTop /* header & send */}
                        setScrollToBottom={this.setScrollToBottom /* header & send */}
                        setUfvkViewModalVisible={this.setUfvkViewModalVisible /* header */}
                        sendTransaction={this.sendTransaction /* send */}
                        setServerOption={this.setServerOption /* send */}
                        clearToAddr={this.clearToAddr /* send */}
                      />
                    )}
                  </Tab.Screen>
                )}
              <Tab.Screen name={translate('loadedapp.receive-menu') as string}>
                {() => (
                  <Receive
                    toggleMenuDrawer={this.toggleMenuDrawer /* header */}
                    syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick /* header */}
                    setUfvkViewModalVisible={this.setUfvkViewModalVisible /* header */}
                    alone={false /* receive */}
                  />
                )}
              </Tab.Screen>
              <Tab.Screen name={translate('loadedapp.history-menu') as string}>
                {() => (
                  <History
                    toggleMenuDrawer={this.toggleMenuDrawer /* header */}
                    poolsMoreInfoOnClick={this.poolsMoreInfoOnClick /* header */}
                    syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick /* header */}
                    setPrivacyOption={this.setPrivacyOption /* header */}
                    setShieldingAmount={this.setShieldingAmount /* header */}
                    setComputingModalVisible={this.setComputingModalVisible /* header */}
                    setScrollToTop={this.setScrollToTop /* header & history */}
                    scrollToTop={scrollToTop /* history */}
                    setScrollToBottom={this.setScrollToBottom /* header & messages */}
                    scrollToBottom={scrollToBottom /* messages */}
                    setUfvkViewModalVisible={this.setUfvkViewModalVisible /* header */}
                    sendTransaction={this.sendTransaction /* messages */}
                    setServerOption={this.setServerOption /* messages */}
                  />
                )}
              </Tab.Screen>
            </Tab.Navigator>
          ) : (
            <>
              {valueTransfersTotal === null || addresses === null || totalBalance === null ? (
                <Loading backgroundColor={colors.background} spinColor={colors.primary} />
              ) : (
                <Tab.Navigator
                  initialRouteName={translate('loadedapp.messages-menu') as string}
                  screenOptions={{
                    tabBarStyle: {
                      borderTopColor: colors.background,
                      borderTopWidth: 0,
                      height: 0,
                    },
                    headerShown: false,
                  }}>
                  <Tab.Screen name={translate('loadedapp.messages-menu') as string}>
                    {() => (
                      <Receive
                        toggleMenuDrawer={this.toggleMenuDrawer /* header */}
                        syncingStatusMoreInfoOnClick={this.syncingStatusMoreInfoOnClick /* header */}
                        setUfvkViewModalVisible={this.setUfvkViewModalVisible /* header */}
                        alone={true /* receive */}
                      />
                    )}
                  </Tab.Screen>
                </Tab.Navigator>
              )}
            </>
          )}
        </SideMenu>
      </ContextAppLoadedProvider>
    );
  }
}
