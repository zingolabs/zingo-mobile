/* eslint-disable react-native/no-inline-styles */
import React, { Component, useState, useMemo, useEffect } from 'react';
import {
  View,
  Alert,
  I18nManager,
  EmitterSubscription,
  AppState,
  NativeEventSubscription,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faDownload,
  faCog,
  faRefresh,
  faPaperPlane,
  faClockRotateLeft,
  faComments,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@react-navigation/native';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { isEqual } from 'lodash';
import { StackScreenProps } from '@react-navigation/stack';
import { LoadingAppNavigationState, AppDrawerParamList } from '../types';
import NetInfo, {
  NetInfoSubscription,
  NetInfoState,
} from '@react-native-community/netinfo/src/index';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '@sayem314/react-native-keep-awake';

import RPC from '../rpc';
import RPCModule from '../RPCModule';
import {
  AppStateLoaded,
  TotalBalanceClass,
  SendPageStateClass,
  InfoType,
  ToAddrClass,
  ZecPriceType,
  BackgroundType,
  TranslateType,
  ServerType,
  AddressBookFileClass,
  SecurityType,
  MenuItemEnum,
  LanguageEnum,
  ModeEnum,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  SeedActionEnum,
  UfvkActionEnum,
  SettingsNameEnum,
  RouteEnum,
  AppStateStatusEnum,
  GlobalConst,
  EventListenerEnum,
  AppContextLoaded,
  NetInfoType,
  ValueTransferType,
  ValueTransferKindEnum,
  CurrencyNameEnum,
  UnifiedAddressClass,
  TransparentAddressClass,
  AddressKindEnum,
  AddressBookFileClassObsolete,
  ScreenEnum,
  LaunchingModeEnum,
  BlockExplorerEnum,
  SnackbarDurationEnum,
} from '../AppState';
import Utils from '../utils';
import { ThemeType } from '../types';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import { ContextAppLoadedProvider } from '../context';
import { parseZcashURI, serverUris } from '../uris';
import BackgroundFileImpl from '../../components/Background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import { sendEmail } from '../sendEmail';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../toastConfig';
import { RPCSeedType } from '../rpc/types/RPCSeedType';
import { Launching } from '../LoadingApp';
import { AddressBook } from '../../components/AddressBook';
import { AddressBookFileImpl } from '../../components/AddressBook';
import simpleBiometrics from '../simpleBiometrics';
import ShowAddressAlertAsync from '../../components/Send/components/ShowAddressAlertAsync';
import {
  createUpdateRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfov10';

import History from '../../components/History';
import Send from '../../components/Send';
import Receive from '../../components/Receive';
import Settings from '../../components/Settings';
import { PlatformPressable } from '@react-navigation/elements';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Drawer from '../../components/Drawer';
import MessageList from '../../components/Messages/components/MessageList';
import { RPCSyncStatusType } from '../rpc/types/RPCSyncStatusType';
import { RPCUfvkType } from '../rpc/types/RPCUfvkType';
import { RPCCheckAddressType } from '../rpc/types/RPCCheckAddressType';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';
import { AddressList } from '../../components/AddressList';
import ScannerAddress from '../../components/Send/components/ScannerAddress';
import ValueTransferDetail from '../../components/History/components/ValueTransferDetail';
import { MessagesAddress, MessagesAll } from '../../components/Messages';
import Memo from '../../components/Memo';
import Confirm from '../../components/Send/components/Confirm';
import { AppStackParamList } from '../types';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const About = React.lazy(() => import('../../components/About'));
const Seed = React.lazy(() => import('../../components/Seed'));
const Info = React.lazy(() => import('../../components/Info'));
const SyncReport = React.lazy(() => import('../../components/SyncReport'));
const Rescan = React.lazy(() => import('../../components/Rescan'));
const Pools = React.lazy(() => import('../../components/Pools'));
const Insight = React.lazy(() => import('../../components/Insight'));
const ShowUfvk = React.lazy(() => import('../../components/Ufvk/ShowUfvk'));
const ComputingTxContent = React.lazy(
  () => import('./components/ComputingTxContent'),
);

const en = require('../translations/en.json');
const es = require('../translations/es.json');
const pt = require('../translations/pt.json');
const ru = require('../translations/ru.json');
const tr = require('../translations/tr.json');

const Tab = createBottomTabNavigator<AppDrawerParamList>();
const Stack = createNativeStackNavigator<AppDrawerParamList>();

// for testing
//const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type LoadedAppProps = {
  navigation: StackScreenProps<
    AppStackParamList,
    RouteEnum.LoadedApp
  >['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadedApp>['route'];
  toggleTheme: (mode: ModeEnum) => void;
};

const SERVER_DEFAULT_0: ServerType = {
  uri: serverUris(() => {})[0].uri,
  chainName: serverUris(() => {})[0].chainName,
} as ServerType;

export default function LoadedApp(props: LoadedAppProps) {
  const theme = useTheme() as ThemeType;
  const [language, setLanguage] = useState<LanguageEnum>(LanguageEnum.en);
  const [currency, setCurrency] = useState<CurrencyEnum>(
    CurrencyEnum.USDCurrency,
  );
  const [server, setServer] = useState<ServerType>(SERVER_DEFAULT_0);
  const [sendAll, setSendAll] = useState<boolean>(false);
  const [donation, setDonation] = useState<boolean>(false);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [mode, setMode] = useState<ModeEnum>(ModeEnum.advanced); // by default advanced
  const [backgroundSyncInfo, setBackgroundSyncInfo] = useState<BackgroundType>({
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  });
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
  const [selectServer, setSelectServer] = useState<SelectServerEnum>(
    SelectServerEnum.auto,
  );
  const [rescanMenu, setRescanMenu] = useState<boolean>(false);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] =
    useState<boolean>(false);
  const [performanceLevel, setPerformanceLevel] =
    useState<RPCPerformanceLevelEnum>(RPCPerformanceLevelEnum.Medium);
  const [blockExplorer, setBlockExplorer] = useState<BlockExplorerEnum>(
    BlockExplorerEnum.Zcashexplorer,
  );
  const [nym, setNym] = useState<boolean>(false);
  const [zenniesDonationAddress, setZenniesDonationAddress] =
    useState<string>('');
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

  const translate: (key: string) => TranslateType = (key: string) =>
    i18n.t(key);
  const readOnly =
    !!props.route.params && props.route.params.readOnly !== undefined
      ? props.route.params.readOnly
      : false;
  const orchardPool =
    !!props.route.params && props.route.params.orchardPool !== undefined
      ? props.route.params.orchardPool
      : false;
  const saplingPool =
    !!props.route.params && props.route.params.saplingPool !== undefined
      ? props.route.params.saplingPool
      : false;
  const transparentPool =
    !!props.route.params && props.route.params.transparentPool !== undefined
      ? props.route.params.transparentPool
      : false;
  const newWallet =
    !!props.route.params && props.route.params.newWallet !== undefined
      ? props.route.params.newWallet
      : false;
  const firstLaunchingMessage =
    !!props.route.params &&
    props.route.params.firstLaunchingMessage !== undefined
      ? props.route.params.firstLaunchingMessage
      : LaunchingModeEnum.opening;

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      const { languageTag, isRTL } =
        RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

      // update layout direction
      I18nManager.forceRTL(isRTL);

      // If the App is mounting this component,
      // I know I have to reset the firstInstall & firstUpdateWithDonation prop in settings.
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.firstInstall,
        false,
      );
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.firstUpdateWithDonation,
        false,
      );

      // If the App is mounting this component, I know I have to update the version prop in settings.
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.version,
        translate('version') as string,
      );

      //I have to check what language is in the settings
      const settings = await SettingsFileImpl.readSettings();

      // for testing
      //await delay(5000);

      if (
        settings.language === LanguageEnum.en ||
        settings.language === LanguageEnum.es ||
        settings.language === LanguageEnum.pt ||
        settings.language === LanguageEnum.ru ||
        settings.language === LanguageEnum.tr
      ) {
        setLanguage(settings.language);
        i18n.locale = settings.language;
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
      }
      if (
        settings.currency === CurrencyEnum.noCurrency ||
        settings.currency === CurrencyEnum.USDCurrency ||
        settings.currency === CurrencyEnum.USDTORCurrency
      ) {
        setCurrency(settings.currency);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.currency,
          currency,
        );
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
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.donation,
          donation,
        );
      }
      if (settings.privacy === true || settings.privacy === false) {
        setPrivacy(settings.privacy);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, privacy);
      }
      if (
        settings.mode === ModeEnum.basic ||
        settings.mode === ModeEnum.advanced
      ) {
        setMode(settings.mode);
        props.toggleTheme(settings.mode);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, mode);
        props.toggleTheme(mode);
      }
      if (settings.security) {
        setSecurity(settings.security);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.security,
          security,
        );
      }
      if (
        settings.selectServer === SelectServerEnum.auto ||
        settings.selectServer === SelectServerEnum.custom ||
        settings.selectServer === SelectServerEnum.list ||
        settings.selectServer === SelectServerEnum.offline
      ) {
        setSelectServer(settings.selectServer);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.selectServer,
          selectServer,
        );
      }
      if (settings.rescanMenu === true || settings.rescanMenu === false) {
        setRescanMenu(settings.rescanMenu);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.rescanMenu,
          rescanMenu,
        );
      }
      if (
        settings.recoveryWalletInfoOnDevice === true ||
        settings.recoveryWalletInfoOnDevice === false
      ) {
        setRecoveryWalletInfoOnDevice(settings.recoveryWalletInfoOnDevice);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.recoveryWalletInfoOnDevice,
          recoveryWalletInfoOnDevice,
        );
      }
      if (
        settings.performanceLevel === RPCPerformanceLevelEnum.High ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Low ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Maximum ||
        settings.performanceLevel === RPCPerformanceLevelEnum.Medium
      ) {
        setPerformanceLevel(settings.performanceLevel);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.performanceLevel,
          performanceLevel,
        );
      }
      if (
        settings.blockExplorer === BlockExplorerEnum.Cipherscan ||
        settings.blockExplorer === BlockExplorerEnum.Zcashexplorer ||
        settings.blockExplorer === BlockExplorerEnum.Zypherscan
      ) {
        setBlockExplorer(settings.blockExplorer);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.blockExplorer,
          blockExplorer,
        );
      }
      if (settings.nym === true || settings.nym === false) {
        setNym(settings.nym);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.nym, false);
      }

      // reading background task info
      const backgroundSyncInfoJson = await BackgroundFileImpl.readBackground();
      setBackgroundSyncInfo(backgroundSyncInfoJson);

      let sort: boolean = false;
      const zenniesAddress = await Utils.getZenniesDonationAddress(
        server.chainName,
      );
      setZenniesDonationAddress(zenniesAddress);

      // adding `Zenny Tips` address always.
      let ab = await AddressBookFileImpl.readAddressBook();
      if (
        ab.filter((a: AddressBookFileClass) => a.address === zenniesAddress)
          .length === 0
      ) {
        ab = await AddressBookFileImpl.writeAddressBookItem(
          translate('zenny-tips-ab') as string,
          zenniesAddress,
          '',
          false,
        );
        sort = true;
      }

      // now make no sense to have two UA's in the same contact
      // if `uOrchardAddress` exists then it will be removed.
      let toUpdate: AddressBookFileClassObsolete[] = ab.filter(
        // if have orchard address or NOT have color or NOT have own flag...
        (a: AddressBookFileClassObsolete) =>
          a.hasOwnProperty('uOrchardAddress') ||
          !a.hasOwnProperty('color') ||
          !a.hasOwnProperty('own'),
      );
      console.log('Address Book -> TO UPDATE', toUpdate);
      console.log('Address Book items', ab.length);
      if (toUpdate.length > 0) {
        const randomColors = Utils.generateColorList(toUpdate.length);
        for (let i = 0; i < toUpdate.length; i++) {
          const a = toUpdate[i];
          let own: boolean;
          if (!a.hasOwnProperty('own')) {
            // verify this address as own or not
            const checkStr = await RPCModule.checkMyAddressInfo(a.address);
            if (
              checkStr &&
              !checkStr.toLowerCase().startsWith(GlobalConst.error)
            ) {
              try {
                const checkJSON: RPCCheckAddressType = JSON.parse(checkStr);
                own = checkJSON.is_wallet_address;
              } catch {
                own = false;
              }
            } else {
              // error
              own = false;
            }
          } else {
            // no value
            own = a.own !== undefined ? a.own : false;
          }
          let color: string;
          if (!a.hasOwnProperty('color')) {
            color = randomColors[i];
          } else {
            // no value
            color = a.color !== undefined ? a.color : randomColors[i];
          }
          if (
            a.hasOwnProperty('uOrchardAddress') ||
            !a.hasOwnProperty('own') ||
            !a.hasOwnProperty('color')
          ) {
            ab = await AddressBookFileImpl.updateColorAndOwnItem(
              a.label,
              a.address,
              color,
              own,
            );
          }
        }
        sort = true;
        console.log('Address Book -> UPDATED', ab.length);
      }
      // if new wallet or restore from seed/ufvk
      // the App needs to calculate if the Addresses
      // in the Address Book belong to this new/restored wallet.
      if (newWallet) {
        toUpdate = ab.filter((a: AddressBookFileClass) => !!a.address);
        // always have one -> Zennies.
        if (toUpdate.length > 1) {
          for (let i = 0; i < toUpdate.length; i++) {
            const a = toUpdate[i];
            let own: boolean;
            // verify this address as own or not
            const checkStr = await RPCModule.checkMyAddressInfo(a.address);
            if (
              checkStr &&
              !checkStr.toLowerCase().startsWith(GlobalConst.error)
            ) {
              try {
                const checkJSON: RPCCheckAddressType = JSON.parse(checkStr);
                own = checkJSON.is_wallet_address;
              } catch {
                own = false;
              }
            } else {
              // error
              own = false;
            }
            ab = await AddressBookFileImpl.updateColorAndOwnItem(
              a.label,
              a.address,
              a.color ? a.color : '',
              own,
            );
          }
          sort = true;
        }
      }
      let abSorted = [] as AddressBookFileClass[];
      if (sort) {
        // this is a good place to sort properly these data
        // if anything changed.
        abSorted = ab.sort((a, b) => {
          const aLabel = a.label;
          const bLabel = b.label;
          return aLabel.localeCompare(bLabel);
        });
      } else {
        abSorted = ab;
      }
      setAddressBook(abSorted);
      await AddressBookFileImpl.writeAddressBook(abSorted);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Launching
        translate={translate}
        firstLaunchingMessage={LaunchingModeEnum.opening}
        biometricsFailed={false}
      />
    );
  } else {
    return (
      <LoadedAppClass
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
        readOnly={readOnly}
        orchardPool={orchardPool}
        saplingPool={saplingPool}
        transparentPool={transparentPool}
        addressBook={addressBook}
        security={security}
        selectServer={selectServer}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
        zenniesDonationAddress={zenniesDonationAddress}
        firstLaunchingMessage={firstLaunchingMessage}
        performanceLevel={performanceLevel}
        blockExplorer={blockExplorer}
        nym={nym}
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
      }}
    >
      <ActivityIndicator size="large" color={spinColor} />
    </View>
  );
};

type LoadedAppClassProps = {
  navigationApp: StackScreenProps<
    AppStackParamList,
    RouteEnum.LoadedApp
  >['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadedApp>['route'];
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
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  addressBook: AddressBookFileClass[];
  security: SecurityType;
  selectServer: SelectServerEnum;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  zenniesDonationAddress: string;
  firstLaunchingMessage: LaunchingModeEnum;
  performanceLevel: RPCPerformanceLevelEnum;
  blockExplorer: BlockExplorerEnum;
  nym: boolean;
};

type LoadedAppClassState = AppStateLoaded & AppContextLoaded;

const TabPressable: React.FC<
  BottomTabBarButtonProps & { colors: ThemeType }
> = ({ colors, ...props }) => {
  return (
    <PlatformPressable {...props} android_ripple={{ color: colors.primary }} />
  );
};

const renderTabPressable =
  (colors: ThemeType) => (props: BottomTabBarButtonProps) => (
    <TabPressable {...props} colors={colors} />
  );

export class LoadedAppClass extends Component<
  LoadedAppClassProps,
  LoadedAppClassState
> {
  rpc: RPC;
  appstate: NativeEventSubscription;
  linking: EmitterSubscription;
  unsubscribeNetInfo: NetInfoSubscription;
  screenName = ScreenEnum.LoadedApp;

  constructor(props: LoadedAppClassProps) {
    super(props);

    this.state = {
      //context
      netInfo: {} as NetInfoType,
      totalBalance: null,
      addresses: null,
      valueTransfers: null,
      valueTransfersTotal: null,
      messages: null,
      messagesTotal: null,
      sendPageState: new SendPageStateClass(new ToAddrClass(0)),
      setSendPageState: this.setSendPageState,
      info: {} as InfoType,
      syncingStatus: {} as RPCSyncStatusType,
      birthday: 0,
      defaultUnifiedAddress: '',
      zecPrice: {
        zecPrice: 0,
        date: 0,
      } as ZecPriceType,
      translate: props.translate,
      readOnly: props.readOnly,
      backgroundSyncInfo: props.backgroundSyncInfo,
      setBackgroundSyncErrorInfo: this.setBackgroundSyncErrorInfo,
      backgroundError: { title: '', error: '' },
      setBackgroundError: this.setBackgroundError,
      lastError: '',
      setLastError: this.setLastError,
      orchardPool: props.orchardPool,
      saplingPool: props.saplingPool,
      transparentPool: props.transparentPool,
      addLastSnackbar: this.addLastSnackbar,
      restartApp: this.navigateToLoadingApp,
      somePending: false,
      addressBook: props.addressBook,
      launchAddressBook: this.launchAddressBook,
      shieldingAmount: 0,
      showSwipeableIcons: true,
      doRefresh: this.doRefresh,
      setZecPrice: this.setZecPrice,
      zenniesDonationAddress: props.zenniesDonationAddress,
      zingolibVersion: '',
      setPrivacyOption: this.setPrivacyOption,
      setNymOption: this.setNymOption,
      setModeOption: this.setModeOption,

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
      nym: props.nym,

      // state
      navigationHome: null,
      appStateStatus:
        Platform.OS === GlobalConst.platformOSios
          ? AppStateStatusEnum.active
          : AppState.currentState,
      newServer: {} as ServerType,
      newSelectServer: null,
      scrollToTop: false,
      scrollToBottom: false,
      isSeedViewModalOpen: false,
    };

    this.rpc = new RPC(
      this.setTotalBalance,
      this.setValueTransfersList,
      this.setMessagesList,
      this.setAllAddresses,
      this.setInfo,
      this.setSyncingStatus,
      props.translate,
      this.keepAwake,
      this.setZingolibVersion,
      this.setBirthday,
      this.setLastError,
      props.readOnly,
      props.server,
      props.performanceLevel,
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
        isConnectionExpensive:
          netInfoState.details && netInfoState.details.isConnectionExpensive,
      },
    });

    // not for fresh installing
    if (this.props.firstLaunchingMessage !== LaunchingModeEnum.installing) {
      // migration from Z1 to Z2. Wallet version 32 (first of Z2).
      const version = await this.rpc.getWalletVersion();
      if (version && version < 32) {
        Alert.alert(
          `${this.state.translate('loadedapp.migration-title')} v:${version}`,
          this.state.translate('loadedapp.migration-body') as string,
        );
      }
    }

    // Configure the RPC to start doing refreshes
    await this.rpc.clearTimers();
    await this.rpc.configure();

    this.clearToAddr();

    this.appstate = AppState.addEventListener(
      EventListenerEnum.change,
      async nextAppState => {
        // let's catch the prior value
        const priorAppState = this.state.appStateStatus;
        if (Platform.OS === GlobalConst.platformOSios) {
          if (
            (priorAppState === AppStateStatusEnum.inactive &&
              nextAppState === AppStateStatusEnum.active) ||
            (priorAppState === AppStateStatusEnum.active &&
              nextAppState === AppStateStatusEnum.inactive)
          ) {
            this.setState({ appStateStatus: nextAppState });
            return;
          }
          if (
            priorAppState === AppStateStatusEnum.inactive &&
            nextAppState === AppStateStatusEnum.background
          ) {
            console.log('App LOADED IOS is gone to the background!');
            this.setState({ appStateStatus: nextAppState });
            // setting value for background task Android
            await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
            await this.rpc.clearTimers();
            this.setSyncingStatus({} as RPCSyncStatusType);
            // We need to save the wallet file here because
            // sometimes the App can lose the last synced chunk
            await RPCModule.doSave();
            return;
          }
        }
        if (Platform.OS === GlobalConst.platformOSandroid) {
          if (priorAppState !== nextAppState) {
            this.setState({ appStateStatus: nextAppState });
          }
        }
        if (
          (priorAppState === AppStateStatusEnum.inactive ||
            priorAppState === AppStateStatusEnum.background) &&
          nextAppState === AppStateStatusEnum.active
        ) {
          if (Platform.OS === GlobalConst.platformOSios) {
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
          if (resultBio === false) {
            this.navigateToLoadingApp({
              startingApp: true,
              biometricsFailed: true,
            });
          } else {
            // reading background task info
            await this.fetchBackgroundSyncInfo();
            // setting value for background task Android
            await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
            // needs this because when the App go from back to fore
            // it have to re-launch all the tasks.
            await this.rpc.clearTimers();
            await this.rpc.configure();
            if (
              this.state.backgroundError &&
              (this.state.backgroundError.title ||
                this.state.backgroundError.error)
            ) {
              Alert.alert(
                this.state.backgroundError.title,
                this.state.backgroundError.error,
              );
              this.setBackgroundError('', '');
            }
          }
        } else if (
          priorAppState === AppStateStatusEnum.active &&
          (nextAppState === AppStateStatusEnum.inactive ||
            nextAppState === AppStateStatusEnum.background)
        ) {
          console.log('App LOADED is gone to the background!');
          // setting value for background task Android
          await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
          await this.rpc.clearTimers();
          this.setSyncingStatus({} as RPCSyncStatusType);
          // We need to save the wallet file here because
          // sometimes the App can lose the last synced chunk
          await RPCModule.doSave();
          if (Platform.OS === GlobalConst.platformOSios) {
            this.setState({ appStateStatus: nextAppState });
          }
        } else {
          if (Platform.OS === GlobalConst.platformOSios) {
            if (priorAppState !== nextAppState) {
              this.setState({ appStateStatus: nextAppState });
            }
          }
        }
      },
    );

    const initialUrl = await Linking.getInitialURL();
    console.log('Received initial deep link URI');
    if (initialUrl !== null) {
      await this.readUrl(initialUrl);

      this.state.navigationHome?.navigate(RouteEnum.HomeStack, {
        screen: RouteEnum.Send,
      });
    }

    this.linking = Linking.addEventListener(
      EventListenerEnum.url,
      async ({ url }) => {
        console.log('Received deep link URI event');
        if (url !== null) {
          await this.readUrl(url);
        }

        this.state.navigationHome?.navigate(RouteEnum.HomeStack, {
          screen: RouteEnum.Send,
        });
      },
    );

    this.unsubscribeNetInfo = NetInfo.addEventListener(
      async (state: NetInfoState) => {
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
              isConnectionExpensive:
                state.details && state.details.isConnectionExpensive,
            },
          });
          if (isConnected !== state.isConnected) {
            if (!state.isConnected) {
            } else {
              // restart the interval process again...
              await this.rpc.clearTimers();
              await this.rpc.configure();
            }
          }
        }
      },
    );
  };

  componentWillUnmount = async () => {
    await this.rpc.clearTimers();
    const safeRemove = (listener: unknown, name: string) => {
      try {
        if (
          listener &&
          typeof (listener as { remove: () => void }).remove === 'function'
        ) {
          (listener as { remove: () => void }).remove();
        } else if (typeof listener === 'function') {
          (listener as () => void)();
        }
      } catch (e) {
        console.log(`Error removing listener ${name}`, e);
      }
    };
    safeRemove(this.appstate, 'appstate');
    safeRemove(this.linking, 'linking');
    safeRemove(this.unsubscribeNetInfo, 'netInfo');
  };

  keepAwake = (keep: boolean): void => {
    if (keep) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  };

  readUrl = async (url: string) => {
    // Attempt to parse as URI if it starts with zcash
    // only if it is a spendable wallet
    if (url && url.startsWith(GlobalConst.zcash) && !this.state.readOnly) {
      const { error, target } = await parseZcashURI(
        url,
        this.state.translate,
        this.state.server,
      );

      if (target) {
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
            .catch((e: unknown) => {
              // user cancelled the alert — expected, log unexpected errors
              if (e && (e as Error).message !== 'cancelled') {
                console.log('ShowAddressAlert unexpected error', e);
              }
            });
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
            to.amount = tgt.amount
              ? Utils.parseNumberFloatToStringLocale(tgt.amount, 8)
              : '';
            to.memo = tgt.memoString || '';

            uriToAddr = to;
          });

          newSendPageState.toaddr = uriToAddr;

          this.setSendPageState(newSendPageState);
        }
      }
      if (error) {
        // Show the error message as a toast
        this.addLastSnackbar(error);
      }
    }
  };

  fetchBackgroundSyncInfo = async () => {
    const backgroundSyncInfoJson: BackgroundType =
      await BackgroundFileImpl.readBackground();
    if (!isEqual(this.state.backgroundSyncInfo, backgroundSyncInfoJson)) {
      this.setState({ backgroundSyncInfo: backgroundSyncInfoJson });
    }
  };

  setBackgroundSyncErrorInfo = async (error: string) => {
    const newBackgroundSyncInfo = { ...this.state.backgroundSyncInfo, error };
    this.setState({ backgroundSyncInfo: newBackgroundSyncInfo });
    await BackgroundFileImpl.writeBackground(newBackgroundSyncInfo);
  };

  setShieldingAmount = (value: number) => {
    //const start = Date.now();
    this.setState({ shieldingAmount: value });
  };

  setShowSwipeableIcons = (value: boolean) => {
    this.setState({ showSwipeableIcons: value });
  };

  setTotalBalance = (totalBalance: TotalBalanceClass) => {
    if (!isEqual(this.state.totalBalance, totalBalance)) {
      //const start = Date.now();
      this.setState({ totalBalance });
    }
  };

  setSyncingStatus = (syncingStatus: RPCSyncStatusType) => {
    // here is a good place to fetch the background task info
    this.fetchBackgroundSyncInfo();
    if (!isEqual(this.state.syncingStatus, syncingStatus)) {
      //const start = Date.now();
      this.setState({ syncingStatus });
    }
  };

  setIsSeedViewModalOpen = (value: boolean) => {
    this.setState({
      isSeedViewModalOpen: value,
    });
  };

  setValueTransfersList = async (
    valueTransfers: ValueTransferType[],
    valueTransfersTotal: number,
  ) => {
    const basicFirstViewSeed = (await SettingsFileImpl.readSettings())
      .basicFirstViewSeed;
    // only for basic mode
    if (this.state.mode === ModeEnum.basic) {
      // only if the user doesn't see the seed the first time
      if (!basicFirstViewSeed) {
        // only if the App are in foreground
        const background = await AsyncStorage.getItem(GlobalConst.background);
        // only if the wallet have some ValueTransfers
        if (background === GlobalConst.no && valueTransfersTotal > 0) {
          // I need to check this out in the seed screen.
          if (!this.state.isSeedViewModalOpen) {
            this.setIsSeedViewModalOpen(true);
            this.state.navigationHome?.navigate(RouteEnum.Seed, {
              action: SeedActionEnum.view,
            });
          }
        }
      }
    } else {
      // for advanced mode
      if (!basicFirstViewSeed) {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.basicFirstViewSeed,
          true,
        );
      }
    }
    if (
      !isEqual(this.state.valueTransfers, valueTransfers) ||
      this.state.valueTransfersTotal !== valueTransfersTotal
    ) {
      // set somePending as well here when I know there is something new in ValueTransfers
      const pending: number =
        valueTransfersTotal > 0
          ? valueTransfers.filter(
              (vt: ValueTransferType) =>
                vt.confirmations >= 0 &&
                vt.confirmations < GlobalConst.minConfirmations,
            ).length
          : 0;
      // if a ValueTransfer go from 3 confirmations to > 3 -> Show a message about a ValueTransfer is confirmed
      this.state.valueTransfers &&
        this.state.valueTransfersTotal !== null &&
        this.state.valueTransfersTotal > 0 &&
        this.state.valueTransfers
          .filter((vtOld: ValueTransferType) => vtOld.confirmations === 0) // not confirmed
          .forEach((vtOld: ValueTransferType) => {
            const vtNew = valueTransfers.filter(
              (vt: ValueTransferType) =>
                vt.txid === vtOld.txid &&
                vt.address === vtOld.address &&
                vt.poolType === vtOld.poolType,
            );
            // the ValueTransfer is confirmed when the confirmations are > 0
            if (vtNew.length > 0 && vtNew[0].confirmations > 0) {
              let message: string = '';
              let title: string = '';
              if (
                vtNew[0].kind === ValueTransferKindEnum.Received &&
                vtNew[0].amount > 0
              ) {
                message =
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.MemoToSelf &&
                vtNew[0].fee &&
                vtNew[0].fee > 0
              ) {
                message =
                  (this.state.translate(
                    'loadedapp.valuetransfer-confirmed',
                  ) as string) +
                  (this.state.translate('history.memotoself') as string) +
                  (vtNew[0].fee
                    ? ((' ' + this.state.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].fee, 8) +
                      ' ' +
                      this.state.info.currencyName
                    : '');
                title = this.state.translate('loadedapp.send-menu') as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.SendToSelf &&
                vtNew[0].fee &&
                vtNew[0].fee > 0
              ) {
                message =
                  (this.state.translate(
                    'loadedapp.valuetransfer-confirmed',
                  ) as string) +
                  (this.state.translate('history.sendtoself') as string) +
                  (vtNew[0].fee
                    ? ((' ' + this.state.translate('send.fee')) as string) +
                      ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].fee, 8) +
                      ' ' +
                      this.state.info.currencyName
                    : '');
                title = this.state.translate('loadedapp.send-menu') as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Rejection &&
                vtNew[0].amount > 0
              ) {
                // not so sure about this `kind`...
                // I guess the wallet is receiving some refund from a TEX sent.
                message =
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.received') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Shield &&
                vtNew[0].amount > 0
              ) {
                message =
                  (this.state.translate('loadedapp.incoming-funds') as string) +
                  (this.state.translate('history.shield') as string) +
                  ' ' +
                  Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                  ' ' +
                  this.state.info.currencyName;
                title = this.state.translate(
                  'loadedapp.receive-menu',
                ) as string;
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.Sent &&
                vtNew[0].amount > 0
              ) {
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
                createAlert(
                  this.setBackgroundError,
                  this.addLastSnackbar,
                  title,
                  message,
                  true,
                  this.state.translate,
                );
              }
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
      //  '=========================================== > VALUE TRANSFERS STORED SETSTATE - ',
      //  Date.now() - start,
      //);
    }
  };

  setMessagesList = (messages: ValueTransferType[], messagesTotal: number) => {
    if (
      !isEqual(this.state.messages, messages) ||
      this.state.messagesTotal !== messagesTotal
    ) {
      //const start = Date.now();
      this.setState({ messages, messagesTotal });
    }
  };

  setAllAddresses = (
    addresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => {
    if (!isEqual(this.state.addresses, addresses)) {
      //const start = Date.now();
      this.setState({ addresses });
    }
    if (addresses.length > 0) {
      // the last Unified Address created.
      const defaultUAArray = addresses.filter(
        (a: UnifiedAddressClass | TransparentAddressClass) =>
          a.addressKind === AddressKindEnum.u,
      );
      const defaultUA: string =
        defaultUAArray[defaultUAArray.length - 1].address;
      if (this.state.defaultUnifiedAddress !== defaultUA) {
        this.setState({ defaultUnifiedAddress: defaultUA });
      }
    } else {
      this.setState({ defaultUnifiedAddress: '' });
    }
  };

  setSendPageState = (sendPageState: SendPageStateClass) => {
    //const start = Date.now();
    this.setState({ sendPageState });
  };

  clearToAddr = () => {
    const newToAddr = new ToAddrClass(0);

    // Create the new state object
    const newState = new SendPageStateClass(new ToAddrClass(0));
    newState.toaddr = newToAddr;

    this.setSendPageState(newState);
  };

  setZecPrice = (newZecPrice: number, newDate: number) => {
    const zecPrice = {
      zecPrice: newZecPrice,
      date: newDate,
    } as ZecPriceType;
    if (!isEqual(this.state.zecPrice, zecPrice)) {
      this.setState({ zecPrice });
    }
  };

  setInfo = (newInfo: InfoType) => {
    if (!isEqual(this.state.info, newInfo)) {
      // if currencyName is empty,
      // I need to rescue the last value from the state,
      // or rescue the value from server.chainName.
      if (!newInfo.currencyName) {
        if (this.state.info.currencyName) {
          newInfo.currencyName = this.state.info.currencyName;
        } else {
          newInfo.currencyName =
            this.state.server.chainName === ChainNameEnum.mainChainName
              ? CurrencyNameEnum.ZEC
              : CurrencyNameEnum.TAZ;
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
    }
  };

  setZingolibVersion = (newZingolibVersion: string) => {
    if (!this.state.zingolibVersion) {
      //const start = Date.now();
      this.setState({ zingolibVersion: newZingolibVersion });
    }
  };

  sendTransaction = async (
    sendPageState: SendPageStateClass,
  ): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const { server, donation, defaultUnifiedAddress } = this.state;
      const sendJson = await Utils.getSendManyJSON(
        sendPageState,
        defaultUnifiedAddress,
        server,
        donation,
      );
      //const start = Date.now();
      const txid = await this.rpc.sendTransaction(sendJson);

      return txid;
    } catch (err) {
      throw err;
    }
  };

  doRefresh = (screen: ScreenEnum) => {
    if (screen === ScreenEnum.History || screen === ScreenEnum.ContactList) {
      // Value Transfers
      this.rpc.fetchTandZandOValueTransfers();
    } else {
      // Messeges
      this.rpc.fetchTandZandOMessages();
    }
  };

  doRescan = async () => {
    // in the rescan case if the shield button is visible
    // we need to hide it fast.
    this.setShieldingAmount(0);
    await this.rpc.refreshSync(true);
  };

  setBirthday = async (birthday: number) => {
    if (!isEqual(this.state.birthday, birthday)) {
      //const start = Date.now();
      this.setState({ birthday });
    }
  };

  onMenuItemSelected = async (item: MenuItemEnum) => {
    // Depending on the menu item, open the appropriate screen
    if (item === MenuItemEnum.About) {
      this.state.navigationHome?.navigate(RouteEnum.About);
      return;
    } else if (item === MenuItemEnum.Rescan) {
      this.state.navigationHome?.navigate(RouteEnum.Rescan);
      return;
    } else if (item === MenuItemEnum.Info) {
      this.state.navigationHome?.navigate(RouteEnum.Info);
      return;
    } else if (item === MenuItemEnum.SyncReport) {
      this.state.navigationHome?.navigate(RouteEnum.SyncReport);
      return;
    } else if (item === MenuItemEnum.FundPools) {
      this.state.navigationHome?.navigate(RouteEnum.Pools);
      return;
    } else if (item === MenuItemEnum.Insight) {
      this.state.navigationHome?.navigate(RouteEnum.InsightStack, {
        screen: RouteEnum.Insight,
      });
      return;
    } else if (item === MenuItemEnum.WalletSeedUfvk) {
      if (this.state.readOnly) {
        this.state.navigationHome?.navigate(RouteEnum.Ufvk, {
          action: UfvkActionEnum.view,
        });
      } else {
        this.state.navigationHome?.navigate(RouteEnum.Seed, {
          action: SeedActionEnum.view,
        });
      }
      return;
    } else if (item === MenuItemEnum.ChangeWallet) {
      if (this.state.readOnly) {
        this.state.navigationHome?.navigate(RouteEnum.Ufvk, {
          action: UfvkActionEnum.change,
        });
      } else {
        this.state.navigationHome?.navigate(RouteEnum.Seed, {
          action: SeedActionEnum.change,
        });
      }
      return;
    } else if (item === MenuItemEnum.RestoreWalletBackup) {
      if (this.state.readOnly) {
        this.state.navigationHome?.navigate(RouteEnum.Ufvk, {
          action: UfvkActionEnum.backup,
        });
      } else {
        this.state.navigationHome?.navigate(RouteEnum.Seed, {
          action: SeedActionEnum.backup,
        });
      }
      return;
    } else if (item === MenuItemEnum.LoadWalletFromSeed) {
      const { translate } = this.state;
      Alert.alert(
        translate('loadedapp.restorewallet-title') as string,
        translate('loadedapp.restorewallet-alert') as string,
        [
          {
            text: translate('confirm') as string,
            onPress: async () =>
              await this.onClickOKChangeWallet({
                screen: 3,
                startingApp: false,
              }),
          },
          { text: translate('cancel') as string, style: 'cancel' },
        ],
        { cancelable: false },
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
        { cancelable: false },
      );
    } else if (item === MenuItemEnum.AddressBook) {
      this.launchAddressBook('', this.screenName);
      return;
    } else if (item === MenuItemEnum.VoteForNym) {
      let update = false;
      if (
        this.state.sendPageState.toaddr.to &&
        this.state.sendPageState.toaddr.to !==
          (await Utils.getNymDonationAddress(this.state.server.chainName))
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
      this.state.navigationHome?.navigate(RouteEnum.HomeStack, {
        screen: RouteEnum.Send,
      });
    } else if (item === MenuItemEnum.Support) {
      this.setShowSwipeableIcons(false);
      await sendEmail(this.state.translate, this.state.zingolibVersion);
      this.setShowSwipeableIcons(true);
    }
  };

  setServerOption = async (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ): Promise<void> => {
    // here I know the server was changed, clean all the tasks before anything.
    await this.rpc.clearTimers();
    this.setSyncingStatus({} as RPCSyncStatusType);
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
      let result: string = await RPCModule.loadExistingWallet(
        value.uri,
        value.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType & RPCUfvkType =
            await JSON.parse(result);
          if (!resultJson.error) {
            // Load the wallet and navigate to the ValueTransfers screen
            if (toast && selectServer !== SelectServerEnum.offline) {
              this.addLastSnackbar(
                `${this.state.translate('loadedapp.readingwallet')} ${value.uri}`,
              );
            }
            await SettingsFileImpl.writeSettings(
              SettingsNameEnum.server,
              value,
            );
            await SettingsFileImpl.writeSettings(
              SettingsNameEnum.selectServer,
              selectServer,
            );
            this.setState({
              server: value,
              selectServer: selectServer,
            });
            // the server is changed, the App needs to restart the timeout tasks from the beginning
            await this.rpc.clearTimers();
            await this.rpc.configure();
            // creating tor cliente if needed
            // we have two buttons to fetch -> we need tor client Just in case.
            if (
              this.state.currency === CurrencyEnum.USDTORCurrency ||
              this.state.currency === CurrencyEnum.USDCurrency
            ) {
              const resp: string = await RPCModule.createTorClientProcess();
              if (resp && resp.toLowerCase().startsWith(GlobalConst.error)) {
                this.setLastError(`Create tor client error: ${resp}`);
              }
            }
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
      // I need to open the modal ASAP, and keep going with the toast.
      if (this.state.readOnly) {
        this.state.navigationHome?.navigate(RouteEnum.Ufvk, {
          action: UfvkActionEnum.server,
        });
      } else {
        this.state.navigationHome?.navigate(RouteEnum.Seed, {
          action: SeedActionEnum.server,
        });
      }
      if (toast) {
        this.addLastSnackbar(
          `${this.state.translate('loadedapp.readingwallet-error')} ${value.uri}`,
        );
      }

      // we need to restore the old server because the new one doesn't have the seed of the current wallet.
      const oldSettings = await SettingsFileImpl.readSettings();
      await RPCModule.changeServerProcess(oldSettings.server.uri);

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

    if (
      value === CurrencyEnum.USDTORCurrency ||
      value === CurrencyEnum.USDCurrency
    ) {
      // when the user select USD
      // the App have to create a Tor Client
      const result = await RPCModule.createTorClientProcess();
      if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
        this.setLastError(`Create tor client error: ${result}`);
      }
    } else {
      const result = await RPCModule.removeTorClientProcess();
      if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
        this.setLastError(`Remove tor client error: ${result}`);
      }
    }
  };

  setLanguageOption = async (value: string, reset: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.language, value);
    this.setState({
      language: value as LanguageEnum,
    });
    if (reset) {
      this.navigateToLoadingApp({ startingApp: false });
    }
  };

  setSendAllOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.sendAll, value);
    this.setState({
      sendAll: value as boolean,
    });
  };

  setDonationOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.donation, value);
    this.setState({
      donation: value as boolean,
    });
  };

  setPrivacyOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, value);
    this.setState({
      privacy: value as boolean,
    });
  };

  setModeOption = async (value: string): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, value);
    this.setState({
      mode: value as ModeEnum,
    });
    // this function change the Theme in the App component.
    this.props.toggleTheme(value as ModeEnum);
  };

  setSecurityOption = async (value: SecurityType): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.security, value);
    this.setState({
      security: value as SecurityType,
    });
  };

  setSelectServerOption = async (value: string): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.selectServer, value);
    this.setState({
      selectServer: value as SelectServerEnum,
    });
  };

  setRescanMenuOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.rescanMenu, value);
    this.setState({
      rescanMenu: value as boolean,
    });
  };

  setRecoveryWalletInfoOnDeviceOption = async (
    value: boolean,
  ): Promise<void> => {
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.recoveryWalletInfoOnDevice,
      value,
    );
    this.setState({
      recoveryWalletInfoOnDevice: value as boolean,
    });

    if (!value) {
      await removeRecoveryWalletInfo();
    } else {
      const wallet = await RPC.rpcFetchWallet(this.state.readOnly);
      if (wallet) {
        await createUpdateRecoveryWalletInfo(wallet);
      }
    }
  };

  setPerformanceLevelOption = async (
    value: RPCPerformanceLevelEnum,
  ): Promise<void> => {
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.performanceLevel,
      value,
    );
    this.setState({
      performanceLevel: value as RPCPerformanceLevelEnum,
    });

    // change it in zingolib as well.
    const setConfigWallet = await RPCModule.setConfigWalletToProdProcess(
      this.state.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );
    console.log(
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ SET CONFIG WALLET',
      setConfigWallet,
    );
    if (
      setConfigWallet &&
      setConfigWallet.toLowerCase().startsWith(GlobalConst.error)
    ) {
      this.setLastError(`Set performance level error: ${setConfigWallet}`);
    }
  };

  setBlockExplorerOption = async (value: BlockExplorerEnum): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.blockExplorer, value);
    this.setState({
      blockExplorer: value as BlockExplorerEnum,
    });
  };

  setNymOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.nym, value);
    this.setState({
      nym: value,
    });
  };

  navigateToLoadingApp = async (state: LoadingAppNavigationState) => {
    await this.rpc.clearTimers();
    if (!!state.screen && state.screen === 3) {
      await this.setModeOption(ModeEnum.advanced);
    }
    this.props.navigationApp.reset({
      index: 0,
      routes: [
        {
          name: RouteEnum.LoadingApp,
          params: state,
        },
      ],
    });
  };

  onClickOKChangeWallet = async (state: LoadingAppNavigationState) => {
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

    if (resultStr) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadedapp.changingwallet-label') as string,
        resultStr,
        false,
        this.state.translate,
        sendEmail,
        this.state.zingolibVersion,
      );
      return;
    }

    this.keepAwake(false);
    this.navigateToLoadingApp(state);
  };

  onClickOKRestoreBackup = async () => {
    const resultStr = (await this.rpc.restoreBackup()) as string;

    if (resultStr) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadedapp.restoringwallet-label') as string,
        resultStr,
        false,
        this.state.translate,
        sendEmail,
        this.state.zingolibVersion,
      );
      return;
    }

    this.keepAwake(false);
    this.navigateToLoadingApp({ startingApp: false, newWallet: true });
  };

  onClickOKServerWallet = async () => {
    if (this.state.newServer && this.state.newSelectServer) {
      const beforeServer = this.state.server;

      const resultStrServerPromise = await RPCModule.changeServerProcess(
        this.state.newServer.uri,
      );
      const timeoutServerPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Promise changeserver Timeout 15 seconds'));
        }, 15 * 1000);
      });

      const resultStrServer: string = await Promise.race([
        resultStrServerPromise,
        timeoutServerPromise,
      ]);

      if (
        resultStrServer &&
        resultStrServer.toLowerCase().startsWith(GlobalConst.error)
      ) {
        this.addLastSnackbar(
          `${this.state.translate('loadedapp.changeservernew-error')} ${resultStrServer}`,
        );
        return;
      } else {
      }

      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.server,
        this.state.newServer,
      );
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.selectServer,
        this.state.newSelectServer,
      );
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

      if (
        resultStr2 &&
        resultStr2.toLowerCase().startsWith(GlobalConst.error)
      ) {
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          this.state.translate('loadedapp.changingwallet-label') as string,
          resultStr2,
          false,
          this.state.translate,
          sendEmail,
          this.state.zingolibVersion,
        );
        //return;
      }

      // no need to restart the tasks because is about to restart the app.
      this.navigateToLoadingApp({ startingApp: false });
    }
  };

  setBackgroundError = (title: string, error: string) => {
    this.setState({ backgroundError: { title, error } });
  };

  setAddressBook = (addressBook: AddressBookFileClass[]) => {
    this.setState({ addressBook });
  };

  addLastSnackbar = (message: string, duration?: SnackbarDurationEnum) => {
    Toast.show({
      type: 'appInfo',
      text1: message,
      visibilityTime:
        duration === SnackbarDurationEnum.longer
          ? 9000
          : duration === SnackbarDurationEnum.short
            ? 2000
            : 5000,
      position: 'bottom',
      bottomOffset: 80,
    });
  };

  setLastError = (error: string) => {
    // irrelevant errors ignored.
    // don't store time-out errors
    // don't store silly sync errors
    if (
      error
        .toLowerCase()
        .includes(
          'Deadline expired before operation could complete'.toLowerCase(),
        ) ||
      error.toLowerCase().includes('Sync is not running'.toLowerCase()) ||
      error.toLowerCase().includes('Sync is already running'.toLowerCase())
    ) {
      return;
    }
    this.setState({ lastError: error });
  };

  // close modal make sense because this is called
  // in a component which can live in differents screens
  launchAddressBook = (address: string, screenName: ScreenEnum) => {
    if (screenName === ScreenEnum.LoadedApp || screenName === ScreenEnum.Send) {
      this.state.navigationHome?.navigate(RouteEnum.AddressBookStack, {
        screen: RouteEnum.AddressBook,
        params: {
          currentAddress: address,
          routeStack: RouteEnum.AddressBookStack,
        },
      });
    } else if (screenName === ScreenEnum.ValueTransferDetail) {
      this.state.navigationHome?.navigate(RouteEnum.ValueTransferDetailStack, {
        screen: RouteEnum.AddressBook,
        params: {
          currentAddress: address,
          routeStack: RouteEnum.ValueTransferDetailStack,
        },
      });
    } else if (screenName === ScreenEnum.Confirm) {
      this.state.navigationHome?.navigate(RouteEnum.ConfirmStack, {
        screen: RouteEnum.AddressBook,
        params: {
          currentAddress: address,
          routeStack: RouteEnum.ConfirmStack,
        },
      });
    } else if (screenName === ScreenEnum.Insight) {
      this.state.navigationHome?.navigate(RouteEnum.InsightStack, {
        screen: RouteEnum.AddressBook,
        params: {
          currentAddress: address,
          routeStack: RouteEnum.InsightStack,
        },
      });
    }
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

  setNavigationHome = (
    navigationHome: DrawerContentComponentProps['navigation'],
  ) => {
    if (!this.state.navigationHome) {
      this.setState({
        navigationHome,
      });
    }
  };

  render() {
    const {
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
      netInfo: this.state.netInfo,
      birthday: this.state.birthday,
      totalBalance: this.state.totalBalance,
      addresses: this.state.addresses,
      valueTransfers: this.state.valueTransfers,
      valueTransfersTotal: this.state.valueTransfersTotal,
      messages: this.state.messages,
      messagesTotal: this.state.messagesTotal,
      syncingStatus: this.state.syncingStatus,
      info: this.state.info,
      zecPrice: this.state.zecPrice,
      defaultUnifiedAddress: this.state.defaultUnifiedAddress,
      sendPageState: this.state.sendPageState,
      setSendPageState: this.state.setSendPageState,
      translate: this.state.translate,
      backgroundSyncInfo: this.state.backgroundSyncInfo,
      setBackgroundSyncErrorInfo: this.state.setBackgroundSyncErrorInfo,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      lastError: this.state.lastError,
      setLastError: this.state.setLastError,
      orchardPool: this.state.orchardPool,
      saplingPool: this.state.saplingPool,
      transparentPool: this.state.transparentPool,
      addLastSnackbar: this.addLastSnackbar,
      addressBook: this.state.addressBook,
      launchAddressBook: this.state.launchAddressBook,
      shieldingAmount: this.state.shieldingAmount,
      restartApp: this.state.restartApp,
      somePending: this.state.somePending,
      showSwipeableIcons: this.state.showSwipeableIcons,
      doRefresh: this.state.doRefresh,
      setZecPrice: this.state.setZecPrice,
      zenniesDonationAddress: this.state.zenniesDonationAddress,
      zingolibVersion: this.state.zingolibVersion,
      setPrivacyOption: this.setPrivacyOption,
      setNymOption: this.setNymOption,
      setModeOption: this.setModeOption,

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
      performanceLevel: this.state.performanceLevel,
      blockExplorer: this.state.blockExplorer,
      nym: this.state.nym,
    };

    const fnTabBarIcon = (
      route: { name: string; key: string },
      focused: boolean,
    ) => {
      var iconName;

      if (route.name === RouteEnum.History) {
        iconName = faClockRotateLeft;
      } else if (route.name === RouteEnum.Send) {
        if (
          mode === ModeEnum.basic &&
          !!totalBalance &&
          ((totalBalance.totalOrchardBalance > 0 &&
            totalBalance.confirmedOrchardBalance === 0) ||
            (totalBalance.totalSaplingBalance > 0 &&
              totalBalance.confirmedSaplingBalance === 0) ||
            (totalBalance.totalTransparentBalance > 0 &&
              totalBalance.confirmedTransparentBalance === 0)) &&
          somePending
        ) {
          iconName = faRefresh;
        } else {
          iconName = faPaperPlane;
        }
      } else if (route.name === RouteEnum.Receive) {
        iconName = faDownload;
      } else if (route.name === RouteEnum.Messages) {
        iconName = faComments;
      } else {
        iconName = faCog;
      }

      return (
        <View>
          <FontAwesomeIcon
            size={25}
            icon={iconName}
            color={focused ? colors.background : colors.money}
          />
        </View>
      );
    };

    return (
      <>
        <ContextAppLoadedProvider value={context}>
          <GestureHandlerRootView>
            <Drawer
              onMenuItemSelected={this.onMenuItemSelected}
              initialRouteName={RouteEnum.HomeStack}
              screenName={this.screenName}
            >
              <Drawer.Screen name={RouteEnum.HomeStack}>
                {props => {
                  useEffect(() => {
                    this.setNavigationHome(props.navigation);
                  });
                  return (
                    <>
                      {mode === ModeEnum.advanced ||
                      (valueTransfersTotal !== null &&
                        valueTransfersTotal > 0) ||
                      (!readOnly &&
                        !!totalBalance &&
                        totalBalance.confirmedOrchardBalance +
                          totalBalance.confirmedSaplingBalance >
                          0) ? (
                        <Tab.Navigator
                          detachInactiveScreens={true}
                          initialRouteName={RouteEnum.History}
                          screenOptions={({
                            route,
                          }: {
                            route: { name: string; key: string };
                          }) => ({
                            tabBarIcon: ({ focused }) =>
                              fnTabBarIcon(route, focused),
                            tabBarIconStyle: {
                              alignSelf: 'center',
                              marginBottom: 2,
                            },
                            tabBarLabel:
                              route.name === RouteEnum.History
                                ? (translate(
                                    'loadedapp.history-menu',
                                  ) as string)
                                : route.name === RouteEnum.Send
                                  ? (translate('loadedapp.send-menu') as string)
                                  : route.name === RouteEnum.Receive
                                    ? (translate(
                                        'loadedapp.receive-menu',
                                      ) as string)
                                    : route.name === RouteEnum.Messages
                                      ? (translate(
                                          'loadedapp.messages-menu',
                                        ) as string)
                                      : '',
                            tabBarLabelPosition: 'below-icon',
                            tabBarLabelStyle: {
                              alignSelf: 'center',
                              fontSize: 14,
                            },
                            tabBarItemStyle: {
                              height: 60,
                            },
                            tabBarActiveTintColor: colors.background,
                            tabBarActiveBackgroundColor: colors.primaryDisabled,
                            tabBarInactiveTintColor: colors.money,
                            tabBarInactiveBackgroundColor:
                              colors.sideMenuBackground,
                            tabBarStyle: {
                              borderTopWidth: 1,
                              height: 60,
                            },
                            headerShown: false,
                            tabBarButton: renderTabPressable(colors),
                          })}
                        >
                          <Tab.Screen name={RouteEnum.History}>
                            {propsTab => (
                              <History
                                {...propsTab}
                                toggleMenuDrawer={
                                  () =>
                                    props.navigation.toggleDrawer() /* header */
                                }
                                setShieldingAmount={
                                  this.setShieldingAmount /* header */
                                }
                                setScrollToTop={
                                  this.setScrollToTop /* header & history */
                                }
                                scrollToTop={scrollToTop /* history */}
                                setScrollToBottom={
                                  this.setScrollToBottom /* header & messages */
                                }
                              />
                            )}
                          </Tab.Screen>
                          {!readOnly &&
                            selectServer !== SelectServerEnum.offline &&
                            (mode === ModeEnum.advanced ||
                              (!!totalBalance &&
                                totalBalance.confirmedOrchardBalance +
                                  totalBalance.confirmedSaplingBalance >
                                  0) ||
                              (!!totalBalance &&
                                ((totalBalance.totalOrchardBalance > 0 &&
                                  totalBalance.confirmedOrchardBalance === 0) ||
                                  (totalBalance.totalSaplingBalance > 0 &&
                                    totalBalance.confirmedSaplingBalance ===
                                      0)) &&
                                somePending)) && (
                              <Tab.Screen name={RouteEnum.Send}>
                                {propsTab => (
                                  <Send
                                    {...propsTab}
                                    toggleMenuDrawer={
                                      () =>
                                        props.navigation.toggleDrawer() /* header */
                                    }
                                    setShieldingAmount={
                                      this.setShieldingAmount /* header */
                                    }
                                    setScrollToTop={
                                      this.setScrollToTop /* header & send */
                                    }
                                    setScrollToBottom={
                                      this.setScrollToBottom /* header & send */
                                    }
                                    sendTransaction={
                                      this.sendTransaction /* send */
                                    }
                                    setServerOption={
                                      this.setServerOption /* send */
                                    }
                                    clearToAddr={this.clearToAddr /* send */}
                                    setSecurityOption={
                                      this.setSecurityOption /* send */
                                    }
                                  />
                                )}
                              </Tab.Screen>
                            )}
                          <Tab.Screen name={RouteEnum.Receive}>
                            {propsTab => (
                              <Receive
                                {...propsTab}
                                toggleMenuDrawer={
                                  () =>
                                    props.navigation.toggleDrawer() /* header */
                                }
                                alone={false /* receive */}
                                setSecurityOption={this.setSecurityOption}
                                setAddressBook={this.setAddressBook}
                              />
                            )}
                          </Tab.Screen>
                          <Tab.Screen name={RouteEnum.Messages}>
                            {propsTab => (
                              <MessageList
                                {...propsTab}
                                toggleMenuDrawer={
                                  () =>
                                    props.navigation.toggleDrawer() /* header */
                                }
                                setScrollToBottom={
                                  this.setScrollToBottom /* header & messages */
                                }
                                scrollToBottom={scrollToBottom /* messages */}
                                sendTransaction={
                                  this.sendTransaction /* messages */
                                }
                                setServerOption={
                                  this.setServerOption /* messages */
                                }
                              />
                            )}
                          </Tab.Screen>
                        </Tab.Navigator>
                      ) : (
                        <>
                          {addresses === null ? (
                            <Loading
                              backgroundColor={colors.background}
                              spinColor={colors.primary}
                            />
                          ) : (
                            <Tab.Navigator
                              initialRouteName={RouteEnum.Receive}
                              screenOptions={{
                                tabBarStyle: {
                                  display: 'none',
                                },
                                headerShown: false,
                              }}
                            >
                              <Tab.Screen name={RouteEnum.Receive}>
                                {propsTab => (
                                  <Receive
                                    {...propsTab}
                                    toggleMenuDrawer={
                                      () =>
                                        props.navigation.toggleDrawer() /* header */
                                    }
                                    alone={true /* receive */}
                                    setSecurityOption={this.setSecurityOption}
                                    setAddressBook={this.setAddressBook}
                                  />
                                )}
                              </Tab.Screen>
                            </Tab.Navigator>
                          )}
                        </>
                      )}
                    </>
                  );
                }}
              </Drawer.Screen>
              <Drawer.Screen name={RouteEnum.Settings}>
                {props => (
                  <Settings
                    {...props}
                    setServerOption={this.setServerOption}
                    setCurrencyOption={this.setCurrencyOption}
                    setLanguageOption={this.setLanguageOption}
                    setSendAllOption={this.setSendAllOption}
                    setDonationOption={this.setDonationOption}
                    setSecurityOption={this.setSecurityOption}
                    setSelectServerOption={this.setSelectServerOption}
                    setRescanMenuOption={this.setRescanMenuOption}
                    setRecoveryWalletInfoOnDeviceOption={
                      this.setRecoveryWalletInfoOnDeviceOption
                    }
                    setPerformanceLevelOption={this.setPerformanceLevelOption}
                    setBlockExplorerOption={this.setBlockExplorerOption}
                    setNymOption={this.setNymOption}
                    toggleMenuDrawer={
                      () => props.navigation.toggleDrawer() /* header */
                    }
                  />
                )}
              </Drawer.Screen>
              <Drawer.Screen name={RouteEnum.About} component={About} />
              <Drawer.Screen name={RouteEnum.Rescan}>
                {props => <Rescan {...props} doRescan={this.doRescan} />}
              </Drawer.Screen>
              <Drawer.Screen name={RouteEnum.Info} component={Info} />
              <Drawer.Screen name={RouteEnum.InsightStack}>
                {() => {
                  return (
                    <Stack.Navigator
                      initialRouteName={RouteEnum.Insight}
                      screenOptions={{ headerShown: false, animation: 'none' }}
                    >
                      <Stack.Screen
                        name={RouteEnum.Insight}
                        component={Insight}
                      />
                      <Stack.Screen name={RouteEnum.AddressBook}>
                        {props => (
                          <AddressBook
                            {...props}
                            setAddressBook={this.setAddressBook}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen
                        name={RouteEnum.ScannerAddress}
                        component={ScannerAddress}
                      />
                    </Stack.Navigator>
                  );
                }}
              </Drawer.Screen>
              <Drawer.Screen name={RouteEnum.Ufvk}>
                {props => {
                  const action =
                    !!props.route.params &&
                    props.route.params.action !== undefined
                      ? props.route.params.action
                      : UfvkActionEnum.view;
                  if (action === UfvkActionEnum.view) {
                    return (
                      <ShowUfvk
                        {...props}
                        onClickOK={() => {}}
                        onClickCancel={() => {}}
                      />
                    );
                  } else if (action === UfvkActionEnum.change) {
                    return (
                      <ShowUfvk
                        {...props}
                        onClickOK={async () =>
                          await this.onClickOKChangeWallet({
                            startingApp: false,
                          })
                        }
                        onClickCancel={() => {}}
                      />
                    );
                  } else if (action === UfvkActionEnum.backup) {
                    return (
                      <ShowUfvk
                        {...props}
                        onClickOK={async () =>
                          await this.onClickOKRestoreBackup()
                        }
                        onClickCancel={() => {}}
                      />
                    );
                  } else if (action === UfvkActionEnum.server) {
                    return (
                      <ShowUfvk
                        {...props}
                        onClickOK={async () =>
                          await this.onClickOKServerWallet()
                        }
                        onClickCancel={async () => {
                          // restart all the tasks again, nothing happen.
                          await this.rpc.clearTimers();
                          await this.rpc.configure();
                        }}
                      />
                    );
                  }
                }}
              </Drawer.Screen>
              <Drawer.Screen name={RouteEnum.Seed}>
                {props => {
                  const action =
                    !!props.route.params &&
                    props.route.params.action !== undefined
                      ? props.route.params.action
                      : SeedActionEnum.view;
                  if (action === SeedActionEnum.view) {
                    return (
                      <Seed
                        {...props}
                        onClickOK={() => {}}
                        onClickCancel={() => {}}
                        keepAwake={this.keepAwake}
                        setIsSeedViewModalOpen={this.setIsSeedViewModalOpen}
                      />
                    );
                  } else if (action === SeedActionEnum.change) {
                    return (
                      <Seed
                        {...props}
                        onClickOK={async () =>
                          await this.onClickOKChangeWallet({
                            startingApp: false,
                          })
                        }
                        onClickCancel={() => {}}
                      />
                    );
                  } else if (action === SeedActionEnum.backup) {
                    return (
                      <Seed
                        {...props}
                        onClickOK={async () =>
                          await this.onClickOKRestoreBackup()
                        }
                        onClickCancel={() => {}}
                      />
                    );
                  } else if (action === SeedActionEnum.server) {
                    return (
                      <Seed
                        {...props}
                        onClickOK={async () =>
                          await this.onClickOKServerWallet()
                        }
                        onClickCancel={async () => {
                          // restart all the tasks again, nothing happen.
                          await this.rpc.clearTimers();
                          await this.rpc.configure();
                        }}
                      />
                    );
                  }
                }}
              </Drawer.Screen>
              <Drawer.Screen
                name={RouteEnum.SyncReport}
                component={SyncReport}
              />
              <Drawer.Screen name={RouteEnum.Pools} component={Pools} />
              <Drawer.Screen name={RouteEnum.AddressBookStack}>
                {() => {
                  return (
                    <Stack.Navigator
                      initialRouteName={RouteEnum.AddressBook}
                      screenOptions={{ headerShown: false, animation: 'none' }}
                    >
                      <Stack.Screen name={RouteEnum.AddressBook}>
                        {props => (
                          <AddressBook
                            {...props}
                            setAddressBook={this.setAddressBook}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen
                        name={RouteEnum.ScannerAddress}
                        component={ScannerAddress}
                      />
                    </Stack.Navigator>
                  );
                }}
              </Drawer.Screen>
              <Drawer.Screen name={RouteEnum.ValueTransferDetailStack}>
                {() => {
                  return (
                    <Stack.Navigator
                      initialRouteName={RouteEnum.ValueTransferDetail}
                      screenOptions={{ headerShown: false, animation: 'none' }}
                    >
                      <Stack.Screen
                        name={RouteEnum.ValueTransferDetail}
                        component={ValueTransferDetail}
                      />
                      <Stack.Screen name={RouteEnum.AddressBook}>
                        {props => (
                          <AddressBook
                            {...props}
                            setAddressBook={this.setAddressBook}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen
                        name={RouteEnum.ScannerAddress}
                        component={ScannerAddress}
                      />
                    </Stack.Navigator>
                  );
                }}
              </Drawer.Screen>
              <Drawer.Screen
                name={RouteEnum.AddressList}
                component={AddressList}
              />
              <Drawer.Screen
                name={RouteEnum.ScannerAddress}
                component={ScannerAddress}
              />
              <Drawer.Screen
                name={RouteEnum.MessagesAddress}
                component={MessagesAddress}
              />
              <Drawer.Screen
                name={RouteEnum.MessagesAll}
                component={MessagesAll}
              />
              <Drawer.Screen name={RouteEnum.Memo} component={Memo} />
              <Drawer.Screen name={RouteEnum.ConfirmStack}>
                {() => {
                  return (
                    <Stack.Navigator
                      initialRouteName={RouteEnum.Confirm}
                      screenOptions={{ headerShown: false, animation: 'none' }}
                    >
                      <Stack.Screen
                        name={RouteEnum.Confirm}
                        component={Confirm}
                      />
                      <Stack.Screen name={RouteEnum.AddressBook}>
                        {props => (
                          <AddressBook
                            {...props}
                            setAddressBook={this.setAddressBook}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen
                        name={RouteEnum.ScannerAddress}
                        component={ScannerAddress}
                      />
                    </Stack.Navigator>
                  );
                }}
              </Drawer.Screen>
              <Drawer.Screen
                name={RouteEnum.Computing}
                component={ComputingTxContent}
              />
            </Drawer>
          </GestureHandlerRootView>
        </ContextAppLoadedProvider>
        <Toast config={toastConfig} />
      </>
    );
  }
}
