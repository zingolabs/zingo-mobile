import React, { Component, useState, useMemo, useEffect } from 'react';
import {
  Alert,
  I18nManager,
  EmitterSubscription,
  AppState,
  NativeEventSubscription,
  Linking,
  Platform,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { I18n } from 'i18n-js';
import { isEqual } from 'lodash';
import { StackScreenProps } from '@react-navigation/stack';
import { LoadingAppNavigationState } from '../types';
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
  SecurityType,
  MenuItemEnum,
  LanguageEnum,
  CurrencyEnum,
  SelectServerEnum,
  ChainNameEnum,
  SeedActionEnum,
  UfvkActionEnum,
  SettingsNameEnum,
  RouteEnum,
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
  UnifiedAddressClass,
  TransparentAddressClass,
  AddressKindEnum,
  ScreenEnum,
  LaunchingModeEnum,
  StakeType,
  StakingActionType,
  WalletBondsType,
  ScheduledActionType,
} from '../AppState';
import Utils from '../utils';
import { ThemeType } from '../types';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import { ContextAppLoadedProvider } from '../context';
import { parseZcashURI } from '../uris';
import BackgroundFileImpl from '../../components/Background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import { sendEmail } from '../sendEmail';
import Snackbars from '../../components/Components/Snackbars';
import { RPCSeedType } from '../rpc/types/RPCSeedType';
import { Launching } from '../LoadingApp';
import simpleBiometrics from '../simpleBiometrics';
import ShowAddressAlertAsync from '../../components/Send/components/ShowAddressAlertAsync';
import {
  createUpdateRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfov10';
import notifee, { EventType } from '@notifee/react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from 'react-native-toastier';
import { RPCSyncStatusType } from '../rpc/types/RPCSyncStatusType';
import { RPCUfvkType } from '../rpc/types/RPCUfvkType';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';
import { AppStackParamList } from '../types';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Send from '../../components/Send';
import Receive from '../../components/Receive';
import Faucet from '../../components/Faucet';
import { MainTabs } from './components/MainTabs';
import Computing from './components/Computing';
import ValueTransferDetail from '../../components/History/components/ValueTransferDetail';
import ScannerAddress from '../../components/Send/components/ScannerAddress';
import ComputingOK from './components/ComputingOK';
import ComputingError from './components/ComputingError';
import { AddStakeScreen, Unstake } from '../../components/Staking';
import { StakeJsonToTypeType } from '../AppState/types/ValueTransferType';
import Distribution from '../../components/Distribution';
import Redelegate from '../../components/Staking/components/Redelegate';
import Finalizers from '../../components/Finalizers/Finalizers';
import { reverseHex32Bytes } from '../utils/hex';
import SettingsNavigator from '../../components/Settings/SettingsNavigator';
import ScheduledActionsFileImpl from '../../components/ScheduledActions/ScheduledActionsFileImpl';
import ScheduledActionDetail from '../../components/ScheduledActions/ScheduledActionDetail';
import { FinalizerDetails } from '../../components/Staking/Finalizers/FinalizerDetails';

const LoadedAppStack = createNativeStackNavigator<LoadedAppStackParamList>();

type LoadedAppStackParamList = {
  [RouteEnum.MainTabs]: undefined;
  [RouteEnum.SettingsStack]: undefined;
  // [RouteEnum.SettingsMenu]: undefined;
  // [RouteEnum.SettingsServers]: undefined;
  // [RouteEnum.DebugInfo]: undefined;
  [RouteEnum.Send]: undefined;
  [RouteEnum.Receive]: undefined;
  [RouteEnum.Faucet]: undefined;
  [RouteEnum.Computing]: undefined;
  [RouteEnum.ComputingOK]: undefined;
  [RouteEnum.ComputingError]: undefined;
  [RouteEnum.ValueTransferDetail]: undefined;
  [RouteEnum.ScannerAddress]: undefined;
  // [RouteEnum.Seed]: undefined;
  [RouteEnum.Stake]: undefined;
  [RouteEnum.Unstake]: undefined;
  [RouteEnum.Distribution]: undefined;
  [RouteEnum.Redelegate]: undefined;
  [RouteEnum.Finalizers]: undefined;
  [RouteEnum.ScheduledActionDetail]: undefined;
  [RouteEnum.FinalizerDetails]: undefined;
};

const en = require('../translations/en.json');
const es = require('../translations/es.json');
const pt = require('../translations/pt.json');
const ru = require('../translations/ru.json');
const tr = require('../translations/tr.json');

// for testing
//const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type LoadedAppProps = {
  navigation: StackScreenProps<
    AppStackParamList,
    RouteEnum.LoadedApp
  >['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadedApp>['route'];
};

const SERVER_DEFAULT_0: ServerType = {
  uri: '',
  chainName: ChainNameEnum.testChainName,
} as ServerType;

export default function LoadedApp(props: LoadedAppProps) {
  const theme = useTheme() as ThemeType;
  const [loading, setLoading] = useState<boolean>(true);

  const [language, setLanguage] = useState<LanguageEnum>(LanguageEnum.en);

  const [indexerServer, setIndexerServer] =
    useState<ServerType>(SERVER_DEFAULT_0);
  const [selectIndexerServer, setSelectIndexerServer] =
    useState<SelectServerEnum>(SelectServerEnum.custom);
  const [sendAll, setSendAll] = useState<boolean>(true);
  const [donation, setDonation] = useState<boolean>(false);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [background, setBackground] = useState<BackgroundType>({
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  });
  const [security, setSecurity] = useState<SecurityType>({
    startApp: false,
    foregroundApp: false,
    sendConfirm: false,
    seedUfvkScreen: false,
    rescanScreen: false,
    settingsScreen: false,
    changeWalletScreen: false,
    restoreWalletBackupScreen: false,
  });
  const [rescanMenu, setRescanMenu] = useState<boolean>(true);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] =
    useState<boolean>(false);
  const [performanceLevel, setPerformanceLevel] =
    useState<RPCPerformanceLevelEnum>(RPCPerformanceLevelEnum.Medium);
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
  const firstLaunchingMessage =
    !!props.route.params &&
    props.route.params.firstLaunchingMessage !== undefined
      ? props.route.params.firstLaunchingMessage
      : LaunchingModeEnum.opening;

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      // only en
      //const { languageTag, isRTL } = RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

      const { languageTag, isRTL } = {
        languageTag: LanguageEnum.en,
        isRTL: false,
      };

      // update layout direction
      I18nManager.forceRTL(isRTL);

      // If the App is mounting this component,
      // I know I have to reset the firstInstall prop in settings.
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.firstInstall,
        false,
      );

      // If the App is mounting this component, I know I have to update the version prop in settings.
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.version,
        translate('version') as string,
      );

      //I have to check what language is in the settings
      const settings = await SettingsFileImpl.readSettings();
      //console.log('LoadedApp', settings);

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
        //console.log('apploaded settings', settings.language, settings.currency);
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
        //console.log('apploaded NO settings', languageTag);
      }

      // lightwallet server
      if (settings.indexerServer) {
        setIndexerServer(settings.indexerServer);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.indexerServer,
          indexerServer,
        );
      }
      if (
        settings.selectIndexerServer === SelectServerEnum.auto ||
        settings.selectIndexerServer === SelectServerEnum.custom ||
        settings.selectIndexerServer === SelectServerEnum.list ||
        settings.selectIndexerServer === SelectServerEnum.offline
      ) {
        setSelectIndexerServer(settings.selectIndexerServer);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.selectIndexerServer,
          selectIndexerServer,
        );
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
      if (settings.security) {
        setSecurity(settings.security);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.security,
          security,
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

      // reading background task info
      const backgroundJson = await BackgroundFileImpl.readBackground();
      setBackground(backgroundJson);

      const zenniesAddress = await Utils.getZenniesDonationAddress(
        indexerServer.chainName,
      );
      setZenniesDonationAddress(zenniesAddress);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //console.log('render LoadedApp - 2');

  if (loading) {
    return (
      <Launching
        empty={false}
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
        currency={CurrencyEnum.noCurrency}
        indexerServer={indexerServer}
        selectIndexerServer={selectIndexerServer}
        sendAll={sendAll}
        donation={donation}
        privacy={privacy}
        background={background}
        readOnly={readOnly}
        orchardPool={orchardPool}
        saplingPool={saplingPool}
        transparentPool={transparentPool}
        security={security}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
        zenniesDonationAddress={zenniesDonationAddress}
        firstLaunchingMessage={firstLaunchingMessage}
        performanceLevel={performanceLevel}
      />
    );
  }
}

type LoadedAppClassProps = {
  navigationApp: StackScreenProps<
    AppStackParamList,
    RouteEnum.LoadedApp
  >['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadedApp>['route'];
  translate: (key: string) => TranslateType;
  theme: ThemeType;
  language: LanguageEnum;
  currency: CurrencyEnum;
  indexerServer: ServerType;
  selectIndexerServer: SelectServerEnum;
  sendAll: boolean;
  donation: boolean;
  privacy: boolean;
  background: BackgroundType;
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  security: SecurityType;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  zenniesDonationAddress: string;
  firstLaunchingMessage: LaunchingModeEnum;
  performanceLevel: RPCPerformanceLevelEnum;
};

type LoadedAppClassState = AppStateLoaded & AppContextLoaded;

export class LoadedAppClass extends Component<
  LoadedAppClassProps,
  LoadedAppClassState
> {
  rpc: RPC;
  appstate: NativeEventSubscription;
  linking: EmitterSubscription;
  unsubscribeNetInfo: NetInfoSubscription;
  unsubscribeNotifee: any;
  screenName = ScreenEnum.LoadedApp;

  private lastBlockTimestamp: number | null = null;
  private lastKnownBlock: number | null = null;
  private blockTimes: number[] = [10]; // 10 seconds by default.
  private pendingOpenScheduledRef: boolean = false;

  constructor(props: LoadedAppClassProps) {
    super(props);

    this.state = {
      //context
      netInfo: {} as NetInfoType,
      totalBalance: null,
      staked: [],
      globalStaked: [],
      walletBonds: [],
      addresses: null,
      valueTransfers: null,
      valueTransfersTotal: null,
      messages: null,
      messagesTotal: null,
      sendPageState: new SendPageStateClass(new ToAddrClass(0)),
      setSendPageState: this.setSendPageState,
      info: {} as InfoType,
      syncingStatus: {} as RPCSyncStatusType,
      wallet: {} as WalletType,
      defaultUnifiedAddress: '',
      zecPrice: {
        zecPrice: 0,
        date: 0,
      } as ZecPriceType,
      background: props.background,
      translate: props.translate,
      backgroundError: {} as BackgroundErrorType,
      setBackgroundError: this.setBackgroundError,
      readOnly: props.readOnly,
      lastError: '',
      orchardPool: props.orchardPool,
      saplingPool: props.saplingPool,
      transparentPool: props.transparentPool,
      snackbars: [] as SnackbarType[],
      addLastSnackbar: this.addLastSnackbar,
      removeFirstSnackbar: this.removeFirstSnackbar,
      somePending: false,
      shieldingAmount: 0,
      showSwipeableIcons: true,
      doRefresh: this.doRefresh,
      setZecPrice: this.setZecPrice,
      zenniesDonationAddress: props.zenniesDonationAddress,
      zingolibVersion: '',
      setPrivacyOption: this.setPrivacyOption,
      requestFaucetFunds: this.requestFaucetFunds,
      stakingDay: false,
      timeToStakingDaySeconds: 0,
      timeLeftStakingDaySeconds: 0,
      blocksToStakingDay: 0,
      blocksLeftStakingDay: 0,
      blocksTotalStakingDay: 0,
      scheduledActions: [] as ScheduledActionType[],
      setScheduledActions: this.setScheduledActions,

      // context settings
      indexerServer: props.indexerServer,
      selectIndexerServer: props.selectIndexerServer,
      currency: props.currency,
      language: props.language,
      sendAll: props.sendAll,
      donation: props.donation,
      privacy: props.privacy,
      security: props.security,
      rescanMenu: props.rescanMenu,
      recoveryWalletInfoOnDevice: props.recoveryWalletInfoOnDevice,
      performanceLevel: props.performanceLevel,

      // state
      navigationHome: null,
      appStateStatus:
        Platform.OS === GlobalConst.platformOSios
          ? AppStateStatusEnum.active
          : AppState.currentState,
      newIndexerServer: {} as ServerType,
      newSelectIndexerServer: null,
      scrollToTop: false,
      scrollToBottom: false,
      isSeedViewModalOpen: false,
    };

    this.rpc = new RPC(
      this.setTotalBalance,
      this.setStaked,
      this.setGlobalStaked,
      this.setWalletBonds,
      this.setValueTransfersList,
      this.setMessagesList,
      this.setAllAddresses,
      this.setInfo,
      this.setSyncingStatus,
      props.translate,
      this.keepAwake,
      this.setZingolibVersion,
      this.setWallet,
      this.setLastError,
      this.onClickOKChangeWallet,
      props.readOnly,
      props.indexerServer,
      props.performanceLevel,
    );

    this.appstate = {} as NativeEventSubscription;
    this.linking = {} as EmitterSubscription;
    this.unsubscribeNetInfo = {} as NetInfoSubscription;
    this.unsubscribeNotifee = null;
  }

  private formatSeconds = (totalSeconds: number): string => {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${minutes}min ${seconds}sec`;
  };

  private getAverageBlockTime = (): number => {
    if (this.blockTimes.length === 0) {
      return 0;
    }

    const sum = this.blockTimes.reduce((acc, value) => acc + value, 0);
    return sum / this.blockTimes.length;
  };

  stakingDayCalculation = () => {
    const latest = this.state.info.latestBlock ?? 0;

    const cycle = 150;
    const activeWindow = 70;

    const mod = latest % cycle;
    const isStakingDay = mod < activeWindow;
    const remaining = isStakingDay ? 0 : cycle - mod;
    const left = isStakingDay ? activeWindow - mod : 0;

    console.log('BLOCKS', remaining, left);

    const avgBlockTime = this.getAverageBlockTime();

    this.setState({
      stakingDay: isStakingDay,
      timeToStakingDaySeconds: remaining * avgBlockTime,
      timeLeftStakingDaySeconds: left * avgBlockTime,
      blocksToStakingDay: remaining,
      blocksLeftStakingDay: left,
      blocksTotalStakingDay: activeWindow,
    });
  };

  openScheduledTab = () => {
    if (!this.props.navigationApp) {
      this.pendingOpenScheduledRef = true;
      return;
    }

    this.pendingOpenScheduledRef = false;

    console.log('NOTIFEE stakinghome -> tab');
    this.props.navigationApp.navigate(RouteEnum.LoadedApp, {
      screen: RouteEnum.MainTabs,
      params: {
        screen: RouteEnum.StakingHome,
        params: {
          tab: 'scheduled',
        },
      },
    });
  };

  componentDidMount = async () => {
    this.stakingDayCalculation();

    this.setScheduledActions(await ScheduledActionsFileImpl.listSA());

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

    //console.log('DID MOUNT APPLOADED...');

    // Configure the RPC to start doing refreshes
    await this.rpc.clearTimers();
    await this.rpc.configure();

    this.clearToAddr();

    this.appstate = AppState.addEventListener(
      EventListenerEnum.change,
      async nextAppState => {
        //console.log('LOADED', 'prior', this.state.appStateStatus, 'next', nextAppState);
        // let's catch the prior value
        const priorAppState = this.state.appStateStatus;
        if (Platform.OS === GlobalConst.platformOSios) {
          if (
            (priorAppState === AppStateStatusEnum.inactive &&
              nextAppState === AppStateStatusEnum.active) ||
            (priorAppState === AppStateStatusEnum.active &&
              nextAppState === AppStateStatusEnum.inactive)
          ) {
            //console.log('LOADED SAVED IOS do nothing', nextAppState);
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
            //console.log('&&&&& background yes in storage &&&&&');
            await this.rpc.clearTimers();
            //console.log('clear timers IOS');
            this.setSyncingStatus({} as RPCSyncStatusType);
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
          (priorAppState === AppStateStatusEnum.inactive ||
            priorAppState === AppStateStatusEnum.background) &&
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
            this.navigateToLoadingApp({
              startingApp: true,
              biometricsFailed: true,
            });
          } else {
            // reading background task info
            await this.fetchBackgroundSyncing();
            // setting value for background task Android
            await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
            //console.log('&&&&& background no in storage &&&&&');
            // needs this because when the App go from back to fore
            // it have to re-launch all the tasks.
            await this.rpc.clearTimers();
            await this.rpc.configure();
            //console.log('configure start timers Android & IOS');
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
          //console.log('&&&&& background yes in storage &&&&&');
          await this.rpc.clearTimers();
          //console.log('clear timers');
          this.setSyncingStatus({} as RPCSyncStatusType);
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
      },
    );

    const initialUrl = await Linking.getInitialURL();
    console.log('INITIAL URI', initialUrl);
    if (initialUrl !== null) {
      this.readUrl(initialUrl);

      this.state.navigationHome?.navigate(RouteEnum.Send);
    }

    this.linking = Linking.addEventListener(
      EventListenerEnum.url,
      async ({ url }) => {
        console.log('EVENT LISTENER URI', url);
        if (url !== null) {
          this.readUrl(url);
        }

        this.state.navigationHome?.navigate(RouteEnum.Send);
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
          //console.log('fetch net info');
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
              //console.log('EVENT Loaded: No internet connection.');
            } else {
              //console.log('EVENT Loaded: YES internet connection.');
              // restart the interval process again...
              await this.rpc.clearTimers();
              await this.rpc.configure();
            }
          }
        }
      },
    );

    // notifee...
    const initialNotification = await notifee.getInitialNotification();
    if (initialNotification) {
      const deeplink = initialNotification.notification.data?.deeplink;
      console.log('NOTIFEE CLOSED', deeplink, this.props.navigationApp);
      if (deeplink === 'delegator://reminder-opened') {
        this.openScheduledTab();
      }
    }

    this.unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        const deeplink = detail.notification?.data?.deeplink;
        console.log('NOTIFEE OPENED', deeplink, this.props.navigationApp);
        if (deeplink === 'delegator://reminder-opened') {
          this.openScheduledTab();
        }
      }
    });
  };

  componentDidUpdate(
    _prevProps: Readonly<LoadedAppClassProps>,
    prevState: Readonly<LoadedAppClassState>,
  ): void {
    const prevBlock = prevState.info.latestBlock;
    const currentBlock = this.state.info.latestBlock;

    if (prevBlock !== currentBlock) {
      const now = Date.now();

      if (
        this.lastBlockTimestamp !== null &&
        this.lastKnownBlock !== null &&
        currentBlock !== undefined &&
        currentBlock > this.lastKnownBlock
      ) {
        const elapsedSeconds = (now - this.lastBlockTimestamp) / 1000;
        const blockDiff = currentBlock - this.lastKnownBlock;
        const secondsPerBlock = elapsedSeconds / blockDiff;

        this.blockTimes.push(secondsPerBlock);

        if (this.blockTimes.length > 15) {
          this.blockTimes.shift();
        }
      }

      console.log(this.blockTimes);

      if (currentBlock !== undefined) {
        this.lastBlockTimestamp = now;
        this.lastKnownBlock = currentBlock;
      }

      this.stakingDayCalculation();
    }
  }

  componentWillUnmount = async () => {
    await this.rpc.clearTimers();
    this.appstate &&
      typeof this.appstate.remove === 'function' &&
      this.appstate.remove();
    this.linking && typeof this.linking === 'function' && this.linking.remove();
    this.unsubscribeNetInfo &&
      typeof this.unsubscribeNetInfo === 'function' &&
      this.unsubscribeNetInfo();
    this.unsubscribeNotifee &&
      typeof this.unsubscribeNotifee === 'function' &&
      this.unsubscribeNotifee();
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
      const { error, target } = await parseZcashURI(
        url,
        this.state.translate,
        this.state.indexerServer,
      );
      //console.log(targets);

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
        this.addLastSnackbar({ message: error, screenName: [this.screenName] });
      }
    }
  };

  fetchBackgroundSyncing = async () => {
    const backgroundJson: BackgroundType =
      await BackgroundFileImpl.readBackground();
    if (!isEqual(this.state.background, backgroundJson)) {
      //console.log('fetch background sync info');
      this.setState({ background: backgroundJson });
    }
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

  setStaked = (staked: StakeType[]) => {
    if (!isEqual(this.state.staked, staked)) {
      //console.log('fetch staked');
      //const start = Date.now();
      this.setState({ staked });
      //console.log('=========================================== > STAKED STORED SETSTATE - ', Date.now() - start);
    }
  };

  setGlobalStaked = (globalStaked: StakeType[]) => {
    if (!isEqual(this.state.globalStaked, globalStaked)) {
      //console.log('fetch global staked');
      //const start = Date.now();
      this.setState({ globalStaked });
      //console.log('=========================================== > GLOBAL STAKED STORED SETSTATE - ', Date.now() - start);
    }
  };

  setWalletBonds = (walletBonds: WalletBondsType[]) => {
    if (!isEqual(this.state.walletBonds, walletBonds)) {
      //console.log('fetch wallet bonds');
      //const start = Date.now();
      this.setState({ walletBonds });
      //console.log('=========================================== > WALLET BONDS STORED SETSTATE - ', Date.now() - start);
    }
  };

  setSyncingStatus = (syncingStatus: RPCSyncStatusType) => {
    // here is a good place to fetch the background task info
    this.fetchBackgroundSyncing();
    if (!isEqual(this.state.syncingStatus, syncingStatus)) {
      //console.log('fetch syncing status report');
      //const start = Date.now();
      this.setState({ syncingStatus });
      //console.log('=========================================== > SYNC STATUS STORED SETSTATE - ', Date.now() - start);
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
    //console.log('VALUE TRANSFERS', valueTransfers);
    const basicFirstViewSeed = (await SettingsFileImpl.readSettings())
      .basicFirstViewSeed;

    if (!basicFirstViewSeed) {
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.basicFirstViewSeed,
        true,
      );
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
          .forEach(async (vtOld: ValueTransferType) => {
            const vtNew = valueTransfers.filter(
              (vt: ValueTransferType) =>
                vt.txid === vtOld.txid &&
                vt.address === vtOld.address &&
                vt.poolType === vtOld.poolType,
            );
            //console.log('old', vtOld);
            //console.log('new', vtNew);
            // the ValueTransfer is confirmed when the confirmations are > 0
            if (vtNew.length > 0 && vtNew[0].confirmations > 0) {
              let message: string = '';
              let title: string = '';
              if (
                (vtNew[0].kind === ValueTransferKindEnum.Received ||
                  vtNew[0].kind === ValueTransferKindEnum.WithdrawBond) &&
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
              } else if (
                vtNew[0].kind === ValueTransferKindEnum.CreateBond &&
                vtNew[0].amount > 0
              ) {
                message =
                  (this.state.translate('loadedapp.payment-made') as string) +
                  'Staked' +
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
                  [this.screenName],
                  title,
                  message,
                  true,
                  this.state.translate,
                );
              }
              // here I know a new transaction is confirmed
              // lets check the scheduled actions & remove it
              if (
                this.state.scheduledActions.filter(
                  sa => sa.txid === vtNew[0].txid,
                ).length > 0
              ) {
                const list = await ScheduledActionsFileImpl.removeSA(
                  this.state.scheduledActions.filter(
                    sa => sa.txid === vtNew[0].txid,
                  )[0].id,
                );
                this.setScheduledActions(list);
              }
            }
            // the ValueTransfer is gone -> Likely Reverted by the server
            // this is really confusing...
            //if (vtNew.length === 0) {
            //  createAlert(
            //    this.setBackgroundError,
            //    this.addLastSnackbar,
            //    [this.screenName],
            //    this.state.translate('loadedapp.send-menu') as string,
            //    this.state.translate('loadedapp.valuetransfer-reverted') as string,
            //    true,
            //    this.state.translate,
            //  );
            //}
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
    if (
      !isEqual(this.state.messages, messages) ||
      this.state.messagesTotal !== messagesTotal
    ) {
      //console.log('fetch messages');
      //const start = Date.now();
      this.setState({ messages, messagesTotal });
      //console.log('=========================================== > MESSAGES STORED SETSTATE - ', Date.now() - start);
    }
  };

  setAllAddresses = (
    addresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => {
    if (!isEqual(this.state.addresses, addresses)) {
      //console.log('fetch addresses');
      //const start = Date.now();
      this.setState({ addresses });
      //console.log('=========================================== > ADDRESSES STORED SETSTATE - ', Date.now() - start);
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
            this.state.indexerServer.chainName === ChainNameEnum.mainChainName
              ? CurrencyNameEnum.ZEC
              : CurrencyNameEnum.cTAZ;
        }
      }
      if (!newInfo.chainName) {
        newInfo.chainName = this.state.indexerServer.chainName;
      }
      if (!newInfo.serverUri) {
        newInfo.serverUri = this.state.indexerServer.uri;
      }
      this.setState({ info: newInfo });
    }
  };

  setZingolibVersion = (newZingolibVersion: string) => {
    if (!this.state.zingolibVersion) {
      this.setState({ zingolibVersion: newZingolibVersion });
    }
  };

  sendTransaction = async (
    sendPageState: SendPageStateClass,
  ): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const { indexerServer, donation, defaultUnifiedAddress } = this.state;
      const sendJson = await Utils.getSendManyJSON(
        sendPageState,
        defaultUnifiedAddress,
        indexerServer,
        donation,
      );
      //const start = Date.now();
      const txid = await this.rpc.sendTransaction(sendJson);
      //console.log('&&&&&&&&&&&&&& send tx', Date.now() - start);

      return txid;
    } catch (err) {
      //console.log('route sendtx error', err);
      throw err;
    }
  };

  // Send a staking transaction using the send page state + staking action
  stakeTransaction = async (
    sendPageState: SendPageStateClass,
    stakingAction: StakingActionType,
  ): Promise<string> => {
    try {
      const stakeJson: StakeJsonToTypeType = {
        stakingAction,
        receivers: [],
      };

      const txid = await this.rpc.sendStakingTransaction(stakeJson);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  beginUnstakeTransaction = async (createBondTxid: string): Promise<string> => {
    try {
      const txid = await this.rpc.sendBeginUnstakingTx(createBondTxid);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  withdrawBondTransaction = async (createBondTxid: string): Promise<string> => {
    try {
      const txid = await this.rpc.sendWithdrawBondTx(createBondTxid);
      return txid;
    } catch (err) {
      throw err;
    }
  };

  redelegateTransaction = async (
    bondKey: string,
    finalizer: string,
  ): Promise<string> => {
    try {
      const txid = await this.rpc.sendRetargetBondTx(
        bondKey,
        reverseHex32Bytes(finalizer),
      );
      return txid;
    } catch (err) {
      throw err;
    }
  };

  requestFaucetFunds = async (address: string): Promise<string> => {
    try {
      const resp = await this.rpc.requestFaucetFunds(address);
      return resp;
    } catch (err) {
      console.log(`Error: ${err}`);
      return `Error: ${err}`;
    }
  };

  doRefresh = (screen: ScreenEnum) => {
    //console.log('================== MANUAL REFRESH ================== ', screen);
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

  setWallet = async (wallet: WalletType) => {
    //console.log(wallet, this.state.readOnly);
    if (!isEqual(this.state.wallet, wallet)) {
      //const start = Date.now();
      this.setState({ wallet });
      //console.log('=========================================== > WALLET STORED SETSTATE - ', Date.now() - start);
    }
  };

  onMenuItemSelected = async (item: MenuItemEnum) => {
    // Depending on the menu item, open the appropriate screen
    if (item === MenuItemEnum.About) {
      this.state.navigationHome?.navigate(RouteEnum.About);
      return;
    } else if (item === MenuItemEnum.Settings) {
      this.state.navigationHome?.navigate(RouteEnum.SettingsStack);
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
    } else if (item === MenuItemEnum.VoteForNym) {
      let update = false;
      if (
        this.state.sendPageState.toaddr.to &&
        this.state.sendPageState.toaddr.to !==
          (await Utils.getNymDonationAddress(
            this.state.indexerServer.chainName,
          ))
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

        to.to = await Utils.getNymDonationAddress(
          this.state.indexerServer.chainName,
        );
        to.amount = Utils.getNymDonationAmount();
        to.memo = Utils.getNymDonationMemo(this.state.translate);
        to.includeUAMemo = true;

        uriToAddr = to;

        newSendPageState.toaddr = uriToAddr;

        this.setSendPageState(newSendPageState);
      }
      this.state.navigationHome?.navigate(RouteEnum.Send);
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
        // 'regtest',
        value.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
      //console.log('load existing wallet', result);
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType & RPCUfvkType =
            await JSON.parse(result);
          if (!resultJson.error) {
            // Load the wallet and navigate to the ValueTransfers screen
            //console.log(`wallet loaded ok ${value.uri}`);
            if (toast && selectServer !== SelectServerEnum.offline) {
              this.addLastSnackbar({
                message: `${this.state.translate('loadedapp.readingwallet')} ${value.uri}`,
                screenName: [this.screenName],
              });
            }
            await SettingsFileImpl.writeSettings(
              SettingsNameEnum.indexerServer,
              value,
            );
            await SettingsFileImpl.writeSettings(
              SettingsNameEnum.selectIndexerServer,
              selectServer,
            );
            this.setState({
              indexerServer: value,
              selectIndexerServer: selectServer,
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
      //console.log(`Error Reading Wallet ${value} - ${error}`);
      if (toast) {
        this.addLastSnackbar({
          message: `${this.state.translate('loadedapp.readingwallet-error')} ${value.uri}`,
          screenName: [this.screenName],
        });
      }

      // we need to restore the old server because the new one doesn't have the seed of the current wallet.
      const oldSettings = await SettingsFileImpl.readSettings();
      await RPCModule.changeServerProcess(oldSettings.indexerServer.uri);

      // go to the seed screen for changing the wallet for another in the new server or cancel this action.
      this.setState({
        newIndexerServer: value as ServerType,
        newSelectIndexerServer: selectServer,
        indexerServer: oldSettings.indexerServer,
        selectIndexerServer: oldSettings.selectIndexerServer,
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
      //console.log('before CREATE ------------------- TOR CLIENT');
      const result = await RPCModule.createTorClientProcess();
      //console.log('after CREATE ------------------- TOR CLIENT', result);
      if (result && result.toLowerCase().startsWith(GlobalConst.error)) {
        this.setLastError(`Create tor client error: ${result}`);
      }
    } else {
      //console.log('before REMOVE ------------------- TOR CLIENT');
      const result = await RPCModule.removeTorClientProcess();
      //console.log('after REMOVE ------------------- TOR CLIENT', result);
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

  setSecurityOption = async (value: SecurityType): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.security, value);
    this.setState({
      security: value as SecurityType,
    });
  };

  setSelectServerOption = async (value: string): Promise<void> => {
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.selectIndexerServer,
      value,
    );
    this.setState({
      selectIndexerServer: value as SelectServerEnum,
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
      const wallet: WalletType = await RPC.rpcFetchWallet(this.state.readOnly);
      await createUpdateRecoveryWalletInfo(wallet);
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

  navigateToLoadingApp = async (state: LoadingAppNavigationState) => {
    await this.rpc.clearTimers();
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
    const { indexerServer } = this.state;

    // if the App is working with a test server
    // no need to do backups of the wallets.
    let resultStr = '';
    if (indexerServer.chainName === ChainNameEnum.mainChainName) {
      // backup
      resultStr = (await this.rpc.changeWallet()) as string;
    } else {
      // no backup
      resultStr = (await this.rpc.changeWalletNoBackup()) as string;
    }

    //console.log("jc change", resultStr);
    if (resultStr && resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error change wallet. ${resultStr}`);
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadedapp.changingwallet-label') as string,
        resultStr,
        false,
        this.state.translate,
      );
      return;
    }

    await ScheduledActionsFileImpl.resetSA();
    this.setScheduledActions([]);

    this.keepAwake(false);
    this.navigateToLoadingApp(state);
  };

  onClickOKRestoreBackup = async () => {
    const resultStr = (await this.rpc.restoreBackup()) as string;

    //console.log("jc restore", resultStr);
    if (resultStr && resultStr.toLowerCase().startsWith(GlobalConst.error)) {
      //console.log(`Error restore backup wallet. ${resultStr}`);
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        [this.screenName],
        this.state.translate('loadedapp.restoringwallet-label') as string,
        resultStr,
        false,
        this.state.translate,
      );
      return;
    }

    await ScheduledActionsFileImpl.resetSA();
    this.setScheduledActions([]);

    this.keepAwake(false);
    this.navigateToLoadingApp({ startingApp: false });
  };

  onClickOKServerWallet = async () => {
    if (this.state.newIndexerServer && this.state.newSelectIndexerServer) {
      const beforeServer = this.state.indexerServer;

      const resultStrServerPromise = await RPCModule.changeServerProcess(
        this.state.newIndexerServer.uri,
      );
      const timeoutServerPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Promise changeserver Timeout 30 seconds'));
        }, 30 * 1000);
      });

      const resultStrServer: string = await Promise.race([
        resultStrServerPromise,
        timeoutServerPromise,
      ]);
      //console.log(resultStrServer);

      if (
        resultStrServer &&
        resultStrServer.toLowerCase().startsWith(GlobalConst.error)
      ) {
        //console.log(`Error change server ${value} - ${resultStr}`);
        this.addLastSnackbar({
          message: `${this.state.translate('loadedapp.changeservernew-error')} ${resultStrServer}`,
          screenName: [this.screenName],
        });
        return;
      } else {
        //console.log(`change server ok ${value}`);
      }

      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.indexerServer,
        this.state.newIndexerServer,
      );
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.selectIndexerServer,
        this.state.newSelectIndexerServer,
      );
      this.setState({
        indexerServer: this.state.newIndexerServer,
        selectIndexerServer: this.state.selectIndexerServer,
        newIndexerServer: {} as ServerType,
        newSelectIndexerServer: null,
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
      if (
        resultStr2 &&
        resultStr2.toLowerCase().startsWith(GlobalConst.error)
      ) {
        //console.log(`Error change wallet. ${resultStr}`);
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          [this.screenName],
          this.state.translate('loadedapp.changingwallet-label') as string,
          resultStr2,
          false,
          this.state.translate,
        );
        //return;
      }

      await ScheduledActionsFileImpl.resetSA();
      this.setScheduledActions([]);

      // no need to restart the tasks because is about to restart the app.
      this.navigateToLoadingApp({ startingApp: false });
    }
  };

  setBackgroundError = (title: string, error: string) => {
    this.setState({ backgroundError: { title, error } });
  };

  addLastSnackbar = (snackbar: SnackbarType) => {
    const newSnackbars = this.state.snackbars;
    // if the last one is the same don't do anything.
    if (
      newSnackbars.length > 0 &&
      newSnackbars[newSnackbars.length - 1].message === snackbar.message
    ) {
      return;
    }
    newSnackbars.push(snackbar);
    this.setState({ snackbars: newSnackbars });
  };

  setLastError = (error: string) => {
    this.setState({ lastError: error });
  };

  removeFirstSnackbar = (screenName: ScreenEnum) => {
    const newSnackbars = this.state.snackbars.filter((s: SnackbarType) =>
      s.screenName.includes(screenName),
    );
    newSnackbars.shift();
    this.setState({ snackbars: newSnackbars });
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

  setScheduledActions = (scheduledActions: ScheduledActionType[]) => {
    this.setState({
      scheduledActions,
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
    const { snackbars, scrollToTop } = this.state;

    const context = {
      //context
      netInfo: this.state.netInfo,
      wallet: this.state.wallet,
      totalBalance: this.state.totalBalance,
      staked: this.state.staked,
      globalStaked: this.state.globalStaked,
      walletBonds: this.state.walletBonds,
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
      background: this.state.background,
      translate: this.state.translate,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      lastError: this.state.lastError,
      orchardPool: this.state.orchardPool,
      saplingPool: this.state.saplingPool,
      transparentPool: this.state.transparentPool,
      snackbars: this.state.snackbars,
      addLastSnackbar: this.state.addLastSnackbar,
      removeFirstSnackbar: this.state.removeFirstSnackbar,
      shieldingAmount: this.state.shieldingAmount,
      somePending: this.state.somePending,
      showSwipeableIcons: this.state.showSwipeableIcons,
      doRefresh: this.state.doRefresh,
      setZecPrice: this.state.setZecPrice,
      zenniesDonationAddress: this.state.zenniesDonationAddress,
      zingolibVersion: this.state.zingolibVersion,
      setPrivacyOption: this.setPrivacyOption,
      requestFaucetFunds: this.requestFaucetFunds,
      stakingDay: this.state.stakingDay,
      timeToStakingDaySeconds: this.state.timeToStakingDaySeconds,
      timeLeftStakingDaySeconds: this.state.timeLeftStakingDaySeconds,
      blocksToStakingDay: this.state.blocksToStakingDay,
      blocksLeftStakingDay: this.state.blocksLeftStakingDay,
      blocksTotalStakingDay: this.state.blocksTotalStakingDay,
      scheduledActions: this.state.scheduledActions,
      setScheduledActions: this.state.setScheduledActions,

      // context settings
      indexerServer: this.state.indexerServer,
      selectIndexerServer: this.state.selectIndexerServer,
      currency: this.state.currency,
      language: this.state.language,
      sendAll: this.state.sendAll,
      donation: this.state.donation,
      privacy: this.state.privacy,
      security: this.state.security,
      rescanMenu: this.state.rescanMenu,
      recoveryWalletInfoOnDevice: this.state.recoveryWalletInfoOnDevice,
      performanceLevel: this.state.performanceLevel,
    };

    //console.log('render LoadedApp');

    return (
      <ToastProvider>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={this.removeFirstSnackbar}
          screenName={this.screenName}
        />

        <ContextAppLoadedProvider value={context}>
          <GestureHandlerRootView>
            <LoadedAppStack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'simple_push',
              }}
            >
              <LoadedAppStack.Screen name={RouteEnum.MainTabs}>
                {() => (
                  <MainTabs
                    scrollToTop={scrollToTop}
                    setScrollToTop={this.setScrollToTop}
                    setScrollToBottom={this.setScrollToBottom}
                    setShieldingAmount={this.setShieldingAmount}
                  />
                )}
              </LoadedAppStack.Screen>

              {/* <LoadedAppStack.Screen name={RouteEnum.SettingsMenu}>
                {props => (
                  <SettingsMenu
                    {...props}
                    onClickOKChangeWallet={this.onClickOKChangeWallet}
                  />
                )}
              </LoadedAppStack.Screen> */}

              <LoadedAppStack.Screen name={RouteEnum.Send}>
                {props => (
                  <Send
                    toggleMenuDrawer={function (): void {
                      throw new Error('Function not implemented.');
                    }}
                    setShieldingAmount={this.setShieldingAmount}
                    setScrollToTop={this.setScrollToTop}
                    setScrollToBottom={this.setScrollToBottom}
                    setServerOption={this.setServerOption}
                    clearToAddr={this.clearToAddr}
                    setSecurityOption={this.setSecurityOption}
                    {...props}
                    sendTransaction={this.sendTransaction}
                  />
                )}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.Receive}>
                {props => (
                  <Receive
                    toggleMenuDrawer={function (): void {
                      throw new Error('Function not implemented.');
                    }}
                    setSecurityOption={this.setSecurityOption}
                    {...props}
                  />
                )}
              </LoadedAppStack.Screen>

              {/* <LoadedAppStack.Screen name={RouteEnum.SettingsServers}>
                {props => (
                  <SettingsServers
                    {...props}
                    navigateToLoadingApp={this.navigateToLoadingApp}
                  />
                )}
              </LoadedAppStack.Screen> */}

              <LoadedAppStack.Screen name={RouteEnum.Distribution}>
                {props => <Distribution {...props} />}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen
                name={RouteEnum.Finalizers}
                options={{ presentation: 'modal' }}
              >
                {props => <Finalizers {...props} />}
              </LoadedAppStack.Screen>

              {/* <LoadedAppStack.Screen name={RouteEnum.DebugInfo}>
                {props => <DebugInfo {...props} />}
              </LoadedAppStack.Screen> */}

              <LoadedAppStack.Screen name={RouteEnum.Faucet}>
                {props => <Faucet {...props} />}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.Computing}>
                {props => <Computing {...props} />}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.ComputingOK}>
                {props => <ComputingOK {...props} />}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.ComputingError}>
                {props => <ComputingError {...props} />}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.ValueTransferDetail}>
                {props => <ValueTransferDetail {...props} />}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.FinalizerDetails}>
                {props => <FinalizerDetails {...props} />}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.ScannerAddress}>
                {props => <ScannerAddress {...props} />}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.SettingsStack}>
                {props => (
                  <SettingsNavigator
                    {...props}
                    onClickOKChangeWallet={this.onClickOKChangeWallet}
                    navigateToLoadingApp={this.navigateToLoadingApp}
                  />
                )}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.Stake}>
                {props => (
                  <AddStakeScreen
                    {...props}
                    stakeTransaction={this.stakeTransaction}
                  />
                )}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.Unstake}>
                {props => (
                  <Unstake
                    {...props}
                    beginUnstakeTransaction={this.beginUnstakeTransaction}
                    withdrawBondTransaction={this.withdrawBondTransaction}
                  />
                )}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.Redelegate}>
                {props => (
                  <Redelegate
                    {...props}
                    redelegateTransaction={this.redelegateTransaction}
                  />
                )}
              </LoadedAppStack.Screen>

              <LoadedAppStack.Screen name={RouteEnum.ScheduledActionDetail}>
                {props => (
                  <ScheduledActionDetail
                    {...props}
                    beginUnstakeTransaction={this.beginUnstakeTransaction}
                    withdrawBondTransaction={this.withdrawBondTransaction}
                    stakeTransaction={this.stakeTransaction}
                    redelegateTransaction={this.redelegateTransaction}
                  />
                )}
              </LoadedAppStack.Screen>
            </LoadedAppStack.Navigator>
          </GestureHandlerRootView>
        </ContextAppLoadedProvider>
      </ToastProvider>
    );
  }
}
