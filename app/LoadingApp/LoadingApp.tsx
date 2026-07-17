import React, { Component, useState, useMemo, useEffect } from 'react';
import {
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
import NetInfo, {
  NetInfoSubscription,
  NetInfoState,
} from '@react-native-community/netinfo/src/index';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import CustomServerModalHost from './components/CustomServerModalHost';
import { BottomSheetBackHandler } from '../hooks/useBottomSheetBackHandler';
import ConfirmBottomSheet from '../../components/Components/ConfirmBottomSheet';
import { showConfirm } from '../showConfirm';

import {
  createNewWallet,
  getVersionInfo,
  getWalletKind,
  loadExistingWallet,
  restoreExistingWalletBackup,
  restoreWalletFromSeed,
  restoreWalletFromUfvk,
  setCryptoDefaultProvider,
  walletBackupExists,
  walletExists as rpcWalletExists,
} from '../walletBackend';
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
  AppStateStatusEnum,
  GlobalConst,
  EventListenerEnum,
  AppContextLoading,
  ZecPriceType,
  RestoreFromTypeEnum,
  ScreenEnum,
  LaunchingModeEnum,
  BlockExplorerEnum,
} from '../AppState';
import { parseServerURI, serverUris, fetchServerList } from '../uris';
import SettingsFileImpl from '../../components/Settings/SettingsFileImpl';
import { fetchWallet } from '../walletBackend';
import { ThemeType } from '../types';
import { ContextAppLoadingProvider } from '../context';
import BackgroundFileImpl from '../../components/Background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '../createAlert';
import { getZingoVersion, substituteZingoName } from '../utils/ZingoAppData';
import Utils from '../utils';
import { RPCWalletKindType } from '../walletBackend/types/RPCWalletKindType';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../toastConfig';
import { RPCSeedType } from '../walletBackend/types/RPCSeedType';
import Launching from './components/Launching';
import simpleBiometrics from '../simpleBiometrics';
import selectingServer from '../selectingServer';
import { isEqual } from 'lodash';
import {
  createUpdateRecoveryWalletInfo,
  getRecoveryWalletInfo,
  hasRecoveryWalletInfo,
  removeRecoveryWalletInfo,
} from '../recoveryWalletInfo';

// no lazy load because slowing down screens.
import ImportUfvk from './components/ImportUfvk';
import { sendEmail } from '../sendEmail';
import { RPCWalletKindEnum } from '../walletBackend/enums/RPCWalletKindEnum';
import StartMenu from './components/StartMenu';
import { RPCUfvkType } from '../walletBackend/types/RPCUfvkType';
import { RPCPerformanceLevelEnum } from '../walletBackend/enums/RPCPerformanceLevelEnum';
import NewSeed from './components/NewSeed';
import { AppStackParamList } from '../types';

const en = require('../translations/en.json');
const es = require('../translations/es.json');
const pt = require('../translations/pt.json');
const ru = require('../translations/ru.json');
const tr = require('../translations/tr.json');

type LoadingAppProps = {
  navigation: StackScreenProps<
    AppStackParamList,
    RouteEnum.LoadingApp
  >['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadingApp>['route'];
  toggleTheme: (mode: ModeEnum) => void;
};

const SERVER_DEFAULT_0: ServerType = {
  uri: serverUris(() => {})[0].uri,
  chainName: serverUris(() => {})[0].chainName,
} as ServerType;

const activationHeight = {
  main: 419200,
  test: 280000,
  regtest: 1,
  '': 1,
};

export default function LoadingApp(props: LoadingAppProps) {
  const theme = useTheme() as ThemeType;
  const [language, setLanguage] = useState<LanguageEnum>(LanguageEnum.en);
  const [currency, setCurrency] = useState<CurrencyEnum>(
    CurrencyEnum.USDCurrency,
  ); // by default USD
  const [server, setServer] = useState<ServerType>(SERVER_DEFAULT_0);
  const [sendAll, setSendAll] = useState<boolean>(false);
  const [donation, setDonation] = useState<boolean>(false);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [mode, setMode] = useState<ModeEnum.basic | ModeEnum.advanced>(
    ModeEnum.advanced,
  ); // by default advanced
  const [backgroundSyncInfo, setBackgroundSyncInfo] = useState<BackgroundType>({
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  });
  const [firstLaunchingMessage, setFirstLaunchingMessage] =
    useState<LaunchingModeEnum>(LaunchingModeEnum.opening);
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
  const [donationAlert, setDonationAlert] = useState<boolean>(false);
  const [rescanMenu, setRescanMenu] = useState<boolean>(false);
  const [recoveryWalletInfoOnDevice, setRecoveryWalletInfoOnDevice] =
    useState<boolean>(false);
  const [performanceLevel, setPerformanceLevel] =
    useState<RPCPerformanceLevelEnum>(RPCPerformanceLevelEnum.Medium);
  const [blockExplorer, setBlockExplorer] = useState<BlockExplorerEnum>(
    BlockExplorerEnum.Zcashexplorer,
  );
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
    substituteZingoName(i18n.t(key) as TranslateType);

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      const { languageTag, isRTL } =
        RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

      // update layout direction
      I18nManager.forceRTL(isRTL);

      //I have to check what language and other things are in the settings
      const settings = await SettingsFileImpl.readSettings();

      console.log('^^^', settings);

      // checking the version of the App in settings
      if (settings.version === null) {
        // this is a fresh install
        setFirstLaunchingMessage(LaunchingModeEnum.installing);
      } else if (
        settings.version === '' ||
        settings.version !== getZingoVersion()
      ) {
        // this is an update
        setFirstLaunchingMessage(LaunchingModeEnum.updating);
        // The App needs to set the currency opt-in to USD by default
        // only if the currency have `none`
        if (settings.currency === CurrencyEnum.noCurrency) {
          await SettingsFileImpl.writeSettings(
            SettingsNameEnum.currency,
            CurrencyEnum.USDCurrency,
          );
        }
      }

      // new donation feature.
      if (settings.firstInstall || settings.firstUpdateWithDonation) {
        setDonationAlert(true);
      }

      // first I need to know if this launch is a fresh install...
      // if firstInstall is true -> 100% is the first time.
      if (settings.firstInstall) {
        // basic mode
        setMode(ModeEnum.basic);
        props.toggleTheme(ModeEnum.basic);
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.mode,
          ModeEnum.basic,
        );
      } else {
        if (
          settings.mode === ModeEnum.basic ||
          settings.mode === ModeEnum.advanced
        ) {
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
        settings.currency === CurrencyEnum.USDCurrency
      ) {
        setCurrency(settings.currency);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.currency,
          currency,
        );
      }
      if (settings.server) {
        // Offline (empty uri) still carries the user's chosen chain: create and
        // restore derive keys chain-specifically, so onboarding must never face
        // an empty chain. The wallet-open path ignores this value anyway — it
        // tries every chain and adopts the one the wallet deserializes under.
        // Only fall back to mainnet when a chain is genuinely absent (e.g. an
        // old config persisted before offline carried a chain), and persist
        // that migration once.
        const normalizedServer: ServerType =
          settings.server.uri || settings.server.chainName
            ? settings.server
            : { uri: '', chainName: ChainNameEnum.mainChainName };
        setServer(normalizedServer);
        if (!settings.server.uri && !settings.server.chainName) {
          await SettingsFileImpl.writeSettings(
            SettingsNameEnum.server,
            normalizedServer,
          );
        }
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
        settings.blockExplorer === BlockExplorerEnum.Zexplorer ||
        settings.blockExplorer === BlockExplorerEnum.None
      ) {
        setBlockExplorer(settings.blockExplorer);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.blockExplorer,
          blockExplorer,
        );
      }

      // if server uri is empty, fix this.
      // it is a weird edge case
      if (settings.server && !settings.server.uri) {
        if (
          (settings.selectServer &&
            settings.selectServer === SelectServerEnum.auto) ||
          settings.selectServer === SelectServerEnum.custom ||
          settings.selectServer === SelectServerEnum.list
        ) {
          await SettingsFileImpl.writeSettings(SettingsNameEnum.server, server);
        }
      }

      // reading background task info
      const backgroundSyncInfoJson = await BackgroundFileImpl.readBackground();
      setBackgroundSyncInfo(backgroundSyncInfoJson);

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
  navigationApp: StackScreenProps<
    AppStackParamList,
    RouteEnum.LoadingApp
  >['navigation'];
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

export class LoadingAppClass extends Component<
  LoadingAppClassProps,
  LoadingAppClassState
> {
  dim: EmitterSubscription;
  appstate: NativeEventSubscription;
  unsubscribeNetInfo: NetInfoSubscription;
  clipboardTimer: ReturnType<typeof setTimeout> | null = null;
  customServerModalRef: React.RefObject<React.ComponentRef<
    typeof BottomSheetModal
  > | null>;
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
      backgroundError: { title: '', error: '' },
      setBackgroundError: this.setBackgroundError,
      readOnly: false,
      orchardPool: true,
      saplingPool: true,
      transparentPool: true,
      addLastSnackbar: this.addLastSnackbar,
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
      screen:
        !!props.route.params && props.route.params.screen !== undefined
          ? props.route.params.screen
          : RouteEnum.Launching,
      actionButtonsDisabled: false,
      walletExists: false,
      hasBackupWallet: false,
      customServerUri: '',
      customServerChainName: ChainNameEnum.mainChainName,
      customServerOffline: false,
      customServerAuto: false,
      customServerCustom: false,
      biometricsFailed:
        !!props.route.params &&
        props.route.params.biometricsFailed !== undefined
          ? props.route.params.biometricsFailed
          : false,
      startingApp:
        !!props.route.params && props.route.params.startingApp !== undefined
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
    this.customServerModalRef = React.createRef();
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
      //actionButtonsDisabled: !netInfoState.isConnected ? true : false,
    });

    this.fetchZingolibVersion();

    // to start the App the first time in this session
    // the user have to pass the security of the device
    if (this.state.startingApp) {
      if (!this.state.biometricsFailed) {
        // (PIN or TouchID or FaceID)
        this.setState({ biometricsFailed: false });
        const resultBio = this.state.security.startApp
          ? await simpleBiometrics({ translate: this.state.translate })
          : true;
        // resultBio:
        // - true      -> authenticated (biometric, or device passcode via allowDeviceCredentials)
        // - false     -> user cancelled or failed the prompt
        // - undefined -> device has no auth method at all; allow (cannot lock the user out)
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
    const r = await setCryptoDefaultProvider();
    console.log('crypto provider result', r);

    // has the device the Wallet Keys stored?
    const has = await hasRecoveryWalletInfo();
    this.setState({ hasRecoveryWalletInfoSaved: has });

    // Boot-time server selection. `auto` refetches the live list and activates
    // the best server on every launch; `list` validates that the user's server
    // is still listed (else promotes to auto). `custom`/`offline` are respected.
    if (this.state.selectServer === SelectServerEnum.auto) {
      // Boot-time selection is silent — the app just picks the best server on
      // launch without announcing it.
      const someServerIsWorking = await this.selectServerOnBoot(
        !!netInfoState.isConnected,
      );
      console.log('some server is working?', someServerIsWorking);
    } else if (this.state.selectServer === SelectServerEnum.list) {
      await this.selectServerOnBoot(!!netInfoState.isConnected);
    }

    // Second, check if a wallet exists. Do it async so the basic screen has time to render
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    const exists = await rpcWalletExists();
    const backupExists = await walletBackupExists();
    if (backupExists) {
      this.setState({ hasBackupWallet: true });
    }

    if (exists) {
      this.setState({ walletExists: true });
      let result: string = await loadExistingWallet(
        this.state.server.uri,
        this.state.server.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );

      let error = false;
      let errorText = '';
      if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
        try {
          // here result can have an `error` field for watch-only which is actually OK.
          const resultJson: RPCSeedType & RPCUfvkType =
            await JSON.parse(result);
          if (!resultJson.error) {
            // Load the wallet and navigate to the vts screen
            let readOnly: boolean = false;
            let orchardPool: boolean = false;
            let saplingPool: boolean = false;
            let transparentPool: boolean = false;
            const walletKindStr: string = await getWalletKind();
            try {
              const walletKindJSON: RPCWalletKindType =
                await JSON.parse(walletKindStr);
              console.log('KIND... JSON', walletKindJSON);
              // there are 4 kinds:
              // 1. seed
              // 2. USK
              // 3. UFVK - watch-only wallet
              // 4. No keys - watch-only wallet (possibly an error)

              if (
                walletKindJSON.kind ===
                  RPCWalletKindEnum.LoadedFromUnifiedFullViewingKey ||
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
                const wallet = await fetchWallet(readOnly);
                if (wallet) {
                  await createUpdateRecoveryWalletInfo(wallet);
                }
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
              this.setState({
                readOnly,
                orchardPool,
                saplingPool,
                transparentPool,
                actionButtonsDisabled: false,
              });
              this.addLastSnackbar(walletKindStr);
            }
            // if the App is restoring another wallet backup...
            // needs to recalculate the Address Book.
            const newWallet =
              !!this.props.route.params &&
              this.props.route.params.newWallet !== undefined
                ? this.props.route.params.newWallet
                : false;
            this.navigateToLoadedApp(
              readOnly,
              orchardPool,
              saplingPool,
              transparentPool,
              newWallet,
              this.state.firstLaunchingMessage,
              // The wallet's own chain, surfaced by the native result (reliable
              // even Offline). The server's chain is only a pre-rebuild fallback.
              (resultJson.chain_name as ChainNameEnum) ||
                this.state.server.chainName,
            );
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
          Utils.humanizeChainTokens(errorText, this.state.translate),
          this.state.translate('loadingapp.readingwallet-label') as string,
          RouteEnum.StartMenu,
          true,
        );
      }
    } else {
      if (this.state.mode === ModeEnum.basic) {
        // setting the prop basicFirstViewSeed to false.
        // this means when the user have funds, the seed screen will show up.
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.basicFirstViewSeed,
          false,
        );
        if (this.state.hasRecoveryWalletInfoSaved) {
          // but first we need to check if exists some key stored in the device from a previous installation (IOS)
          await this.recoverRecoveryWalletInfo(false);
          // go to the initial menu, giving the opportunity to the user
          // to use the seed & birthday recovered from the device.
          this.setState({
            screen: RouteEnum.StartMenu,
            walletExists: false,
            actionButtonsDisabled: false,
          });
        } else {
          // if no wallet file & basic mode -> create a new wallet & go directly to history screen.
          // no seed screen.
          if (
            !netInfoState.isConnected ||
            this.state.selectServer === SelectServerEnum.offline
          ) {
            this.setState({
              screen: RouteEnum.StartMenu,
              walletExists: false,
              actionButtonsDisabled: false,
            });
          } else {
            await this.createNewWallet(false);
            this.setState({ actionButtonsDisabled: false });
            this.navigateToLoadedApp(
              false,
              true,
              true,
              true,
              true,
              this.state.firstLaunchingMessage,
              // create requires a live server → its chain is the wallet's chain.
              this.state.server.chainName,
            );
          }
        }
      } else {
        // if no wallet file & advanced mode -> go to the initial menu.
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.basicFirstViewSeed,
          true,
        );
        this.setState(state => ({
          screen:
            state.screen === RouteEnum.ImportUfvk
              ? RouteEnum.ImportUfvk
              : RouteEnum.StartMenu,
          walletExists: false,
          actionButtonsDisabled: false,
        }));
      }
    }

    this.appstate = AppState.addEventListener(
      EventListenerEnum.change,
      async nextAppState => {
        // let's catch the prior value
        const priorAppState = this.state.appStateStatus;
        this.setState({ appStateStatus: nextAppState });
        if (
          (priorAppState === AppStateStatusEnum.inactive ||
            priorAppState === AppStateStatusEnum.background) &&
          nextAppState === AppStateStatusEnum.active
        ) {
          // reading background task info
          this.fetchBackgroundSyncInfo();
          // setting value for background task Android
          await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
          if (
            this.state.backgroundError &&
            (this.state.backgroundError.title ||
              this.state.backgroundError.error)
          ) {
            showConfirm({
              title: this.state.backgroundError.title,
              message: this.state.backgroundError.error,
              buttons: [{ text: this.state.translate('close') as string }],
            });
            this.setBackgroundError('', '');
          }
        }
        if (
          (nextAppState === AppStateStatusEnum.inactive ||
            nextAppState === AppStateStatusEnum.background) &&
          priorAppState === AppStateStatusEnum.active
        ) {
          console.log('App LOADING is gone to the background!');
          // setting value for background task Android
          await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
        }
      },
    );

    this.unsubscribeNetInfo = NetInfo.addEventListener(
      (state: NetInfoState) => {
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
              isConnectionExpensive:
                state.details && state.details.isConnectionExpensive,
            },
            screen:
              screen === RouteEnum.ImportUfvk
                ? RouteEnum.ImportUfvk
                : screen !== RouteEnum.Launching
                  ? RouteEnum.StartMenu
                  : RouteEnum.Launching,
            //actionButtonsDisabled: true,
          });
          if (isConnected !== state.isConnected) {
            if (!state.isConnected) {
              this.customServerModalRef.current?.dismiss();
            } else {
              // Offline onboarding is no longer an empty dead-end (create /
              // restore are available), so we do not force the server modal
              // open on reconnect. The user opens it from the gear when they
              // want to change server/chain.
              if (screen !== RouteEnum.Launching) {
                this.setState({
                  screen:
                    screen === RouteEnum.ImportUfvk
                      ? RouteEnum.ImportUfvk
                      : RouteEnum.StartMenu,
                });
              }
            }
          }
        }
      },
    );

    // The server modal is no longer auto-presented for offline + no-wallet:
    // that onboarding state now offers create / restore directly, so it is not
    // an empty screen. The modal opens on demand from the gear button.
  };

  componentWillUnmount = () => {
    this.dim && typeof this.dim.remove === 'function' && this.dim.remove();
    this.appstate &&
      typeof this.appstate.remove === 'function' &&
      this.appstate.remove();
    this.unsubscribeNetInfo &&
      typeof this.unsubscribeNetInfo === 'function' &&
      this.unsubscribeNetInfo();
  };

  // Default server for a chain = the `default` entry for that chain in the
  // static `serverUris` list (mainnet and testnet both have one). Same lookup
  // for both chains, no per-chain special-casing.
  defaultServerForChain = (chainName: ChainNameEnum): ServerType => {
    const found = serverUris(this.state.translate).find(
      (s: ServerUrisType) => s.chainName === chainName && s.default,
    );
    return found
      ? { uri: found.uri, chainName: found.chainName }
      : SERVER_DEFAULT_0;
  };

  // Boot-time server selection driven by the persisted mode:
  //  - auto: refetch the live list every launch and activate the best server;
  //          if the registry is unreachable fall back to the static latency
  //          probe (staying in auto).
  //  - list: keep the user's server if it is still in the live list; if it has
  //          vanished, switch to the best server and promote the mode to auto.
  //  - custom / offline: respected, never touched here.
  selectServerOnBoot = async (isConnected: boolean): Promise<boolean> => {
    const mode = this.state.selectServer;
    const chainName = this.state.server.chainName;

    if (mode === SelectServerEnum.auto) {
      if (!isConnected) {
        const s = this.defaultServerForChain(chainName);
        this.setState({ server: s });
        await SettingsFileImpl.writeSettings(SettingsNameEnum.server, s);
        return false;
      }
      const list = await fetchServerList(chainName);
      if (list.length > 0) {
        const best: ServerType = {
          uri: list[0].uri,
          chainName: list[0].chainName,
        };
        this.setState({ server: best });
        await SettingsFileImpl.writeSettings(SettingsNameEnum.server, best);
        return true;
      }
      // Registry unreachable → current static latency probe, staying in auto.
      // Silent: this is still boot-time selection.
      return await this.selectTheBestServer(false, SelectServerEnum.auto, true);
    }

    if (mode === SelectServerEnum.list) {
      // Can't validate offline or with an unreachable registry: respect the
      // stored server and stay in list mode.
      if (!isConnected) {
        return true;
      }
      const list = await fetchServerList(chainName);
      if (list.length === 0) {
        return true;
      }
      const stillListed = list.some(
        (s: ServerUrisType) => s.uri === this.state.server.uri,
      );
      if (stillListed) {
        return true;
      }
      // The chosen server dropped off the list → activate the best one and
      // promote the mode to auto (it is no longer a manual list choice).
      const best: ServerType = {
        uri: list[0].uri,
        chainName: list[0].chainName,
      };
      this.setState({ server: best, selectServer: SelectServerEnum.auto });
      await SettingsFileImpl.writeSettings(SettingsNameEnum.server, best);
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.selectServer,
        SelectServerEnum.auto,
      );
      return true;
    }

    // custom / offline: respected.
    return true;
  };

  selectTheBestServer = async (
    aDifferentOne: boolean,
    targetMode: SelectServerEnum = SelectServerEnum.list,
    // Boot selection passes `silent` so it never announces the pick; mid-session
    // recovery leaves it false so the user is told the server was switched.
    silent: boolean = false,
  ): Promise<boolean> => {
    // avoiding obsolete ones
    let someServerIsWorking: boolean = true;
    const actualServer = this.state.server;
    const server = await selectingServer(
      serverUris(this.state.translate).filter(
        (s: ServerUrisType) =>
          !s.obsolete &&
          // stay on the active wallet's chain — the static list now also
          // carries a testnet default, and picking it for a mainnet wallet
          // (or vice versa) would swap chains under the wallet.
          s.chainName === actualServer.chainName &&
          s.uri !== (aDifferentOne ? actualServer.uri : ''),
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
    console.log(fasterServer);
    this.setState({
      server: fasterServer,
      selectServer: targetMode,
    });
    await SettingsFileImpl.writeSettings(SettingsNameEnum.server, fasterServer);
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.selectServer,
      targetMode,
    );
    // message with the result only for advanced users (never at boot)
    if (
      !silent &&
      this.state.mode === ModeEnum.advanced &&
      someServerIsWorking
    ) {
      if (isEqual(actualServer, fasterServer)) {
        this.addLastSnackbar(
          this.state.translate('loadedapp.selectingserversame') as string,
          SnackbarDurationEnum.long,
        );
      } else {
        this.addLastSnackbar(
          (this.state.translate('loadedapp.selectingserverbest') as string) +
            ' ' +
            fasterServer.uri,
          SnackbarDurationEnum.long,
        );
      }
    }
    return someServerIsWorking;
  };

  // On a wallet/RPC failure with an unreachable server, pick the next one with
  // the same pattern as boot: first the best from the live registry (excluding
  // the failed server, no probe), then fall back to the static list ranked by
  // latency (also excluding the failed server). The current mode is preserved.
  selectRecoveryServer = async (): Promise<boolean> => {
    const actualServer = this.state.server;
    const live = await fetchServerList(actualServer.chainName);
    const liveCandidates = live.filter(
      (s: ServerUrisType) => s.uri !== actualServer.uri,
    );
    if (liveCandidates.length > 0) {
      const best: ServerType = {
        uri: liveCandidates[0].uri,
        chainName: liveCandidates[0].chainName,
      };
      this.setState({ server: best });
      await SettingsFileImpl.writeSettings(SettingsNameEnum.server, best);
      if (this.state.mode === ModeEnum.advanced) {
        this.addLastSnackbar(
          (this.state.translate('loadedapp.selectingserverbest') as string) +
            ' ' +
            best.uri,
          SnackbarDurationEnum.long,
        );
      }
      return true;
    }
    // Registry empty/unreachable → static list ranked by latency, excluding the
    // failed server, staying in the current mode.
    return await this.selectTheBestServer(true, this.state.selectServer);
  };

  checkServer: (s: ServerType) => Promise<boolean> = async (
    server: ServerType,
  ) => {
    const s = {
      uri: server.uri,
      chainName: server.chainName,
      region: '',
      default: false,
      latency: null,
      obsolete: false,
    } as ServerUrisType;
    const serverChecked = await selectingServer([s]);
    return Boolean(serverChecked && serverChecked.latency);
  };

  walletErrorHandle = async (
    result: string,
    title: string,
    screen: RouteEnum,
    start: boolean,
  ) => {
    // first check the actual server
    // if the server is not working properly sometimes can take more than one minute to fail.
    if (
      start &&
      this.state.netInfo.isConnected &&
      this.state.selectServer !== SelectServerEnum.offline
    ) {
      this.addLastSnackbar(
        this.state.translate('restarting') as string,
        SnackbarDurationEnum.long,
      );
    }
    // if no internet connection -> show the error.
    // if Offline mode -> show the error.
    if (
      !this.state.netInfo.isConnected ||
      this.state.selectServer === SelectServerEnum.offline
    ) {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        title,
        result,
        false,
        this.state.translate,
        sendEmail,
        this.state.zingolibVersion,
      );
      this.setState({
        actionButtonsDisabled: false,
        serverErrorTries: 0,
        screen,
      });
    } else {
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
          this.state.zingolibVersion,
        );
        this.setState({
          actionButtonsDisabled: false,
          serverErrorTries: 0,
          screen,
        });
      } else {
        // Audit Issue S — custom server users opted out of automatic
        // server selection (almost always for privacy / self-hosting).
        // The checkServer probe above is a 15-second latency check, not
        // a causal diagnosis: even if it returns false, the original
        // wallet error may or may not be server-related. Silently
        // swapping the user's custom URI for a default would leak
        // metadata to that default server. Surface the situation and
        // let the user decide from Settings.
        if (this.state.selectServer === SelectServerEnum.custom) {
          createAlert(
            this.setBackgroundError,
            this.addLastSnackbar,
            title,
            this.state.translate(
              'loadingapp.customserver-unreachable',
            ) as string,
            false,
            this.state.translate,
            sendEmail,
            this.state.zingolibVersion,
          );
          this.setState({
            actionButtonsDisabled: false,
            serverErrorTries: 0,
            screen,
          });
          return;
        }

        // let's change to another server
        if (this.state.serverErrorTries === 0) {
          // first try
          this.setState({ screen, actionButtonsDisabled: true });
          this.addLastSnackbar(
            this.state.translate('loadingapp.serverfirsttry') as string,
            SnackbarDurationEnum.longer,
          );
          // a different server (live registry first, then static by latency).
          const someServerIsWorking = await this.selectRecoveryServer();
          if (someServerIsWorking) {
            if (start) {
              this.setState(
                { startingApp: false, serverErrorTries: 1, screen },
                () => {
                  this.componentDidMount();
                },
              );
            } else {
              createAlert(
                this.setBackgroundError,
                this.addLastSnackbar,
                title,
                result,
                false,
                this.state.translate,
                sendEmail,
                this.state.zingolibVersion,
              );
              this.setState({
                actionButtonsDisabled: false,
                serverErrorTries: 0,
                screen,
              });
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
              this.state.zingolibVersion,
            );
            this.setState({
              actionButtonsDisabled: false,
              serverErrorTries: 0,
              screen,
            });
          }
        } else {
          // second try
          this.addLastSnackbar(
            this.state.translate('loadingapp.serversecondtry') as string,
            SnackbarDurationEnum.longer,
          );
          setTimeout(() => {
            createAlert(
              this.setBackgroundError,
              this.addLastSnackbar,
              title,
              result,
              false,
              this.state.translate,
              sendEmail,
              this.state.zingolibVersion,
            );
            this.setState({
              actionButtonsDisabled: false,
              serverErrorTries: 0,
              screen,
            });
          }, 1 * 1000);
        }
      }
    }
  };

  fetchBackgroundSyncInfo = async () => {
    const backgroundSyncInfoJson: BackgroundType =
      await BackgroundFileImpl.readBackground();
    this.setState({ backgroundSyncInfo: backgroundSyncInfoJson });
  };

  setCustomServerUri = (customServerUri: string) => {
    this.setState({
      customServerUri,
    });
  };

  usingCustomServer = async () => {
    if (
      !this.state.customServerUri &&
      !this.state.customServerOffline &&
      !this.state.customServerAuto
    ) {
      return;
    }
    this.setState({ actionButtonsDisabled: true });
    if (this.state.customServerAuto) {
      // Automatic: enter `auto` mode on the user's chosen chain, then let the
      // standard boot-time picker fetch the live server list for that chain
      // (falling back to the static latency probe when the registry is
      // unreachable, and to the chain's static default when offline).
      // `selectServerOnBoot` reads `server.chainName`, so seed it with the
      // chosen chain's default; the best live server replaces it and shows in
      // the UI.
      const autoChainName = this.state.customServerChainName;
      const fallback = this.defaultServerForChain(autoChainName);
      await new Promise<void>(resolve =>
        this.setState(
          {
            selectServer: SelectServerEnum.auto,
            server: fallback,
            customServerUri: '',
            customServerChainName: this.state.server.chainName,
            customServerOffline: false,
            customServerAuto: false,
          },
          () => resolve(),
        ),
      );
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.selectServer,
        SelectServerEnum.auto,
      );
      await this.selectServerOnBoot(!!this.state.netInfo.isConnected);
      this.customServerModalRef.current?.dismiss();
      this.setState({ actionButtonsDisabled: false });
      return;
    }
    if (this.state.customServerOffline) {
      // Offline = no server, but the chain is still the user's choice. Create
      // and restore derive keys chain-specifically, so we always persist a
      // concrete chain — never an empty one — and onboarding never faces an
      // empty field. The wallet-open path ignores this value (it tries every
      // chain and adopts the wallet's real one), so a mismatch self-corrects on
      // open.
      const offlineChainName = this.state.customServerChainName;
      await SettingsFileImpl.writeSettings(SettingsNameEnum.server, {
        uri: '',
        chainName: offlineChainName,
      });
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.selectServer,
        SelectServerEnum.offline,
      );
      this.setState({
        selectServer: SelectServerEnum.offline,
        server: { uri: '', chainName: offlineChainName },
        customServerUri: '',
        customServerChainName: this.state.server.chainName,
        customServerOffline: false,
      });
      this.customServerModalRef.current?.dismiss();
    } else {
      const uri: string = parseServerURI(
        this.state.customServerUri,
        this.state.translate,
      );
      const chainName = this.state.customServerChainName;
      if (uri && uri.toLowerCase().startsWith(GlobalConst.error)) {
        // Surface the parser's specific message (bad URI, plaintext
        // HTTP not allowed, etc.) instead of the generic "fill out a
        // valid Server URI" snackbar so the user can fix the input.
        this.addLastSnackbar(uri);
        this.setState({ actionButtonsDisabled: false });
        return;
      }

      this.addLastSnackbar(
        this.state.translate('loadedapp.tryingnewserver') as string,
      );

      // In LoadingApp there is no lightclient instance yet, so we can't
      // use `checkServerURI` (which calls `changeServerProcess` /
      // `infoServerInfo` — both require an open wallet). The right probe
      // at this stage is a wallet-less latency check against the URI:
      // `getLatestBlockServerInfo` only hits the gRPC endpoint to fetch
      // the tip height, no client state needed. Chain selection is taken
      // from the user's toggle on the modal — it's a config choice, not
      // something we can introspect without a wallet.
      const cs = {
        uri,
        chainName,
        region: '',
        default: false,
        latency: null,
        obsolete: false,
      } as ServerUrisType;
      const serverChecked = await selectingServer([cs]);
      if (!serverChecked || !serverChecked.latency) {
        this.addLastSnackbar(
          (this.state.translate('loadedapp.changeservernew-error') as string) +
            uri,
        );
        this.setState({ actionButtonsDisabled: false });
        return;
      }
      await SettingsFileImpl.writeSettings(SettingsNameEnum.server, {
        uri,
        chainName,
      });
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.selectServer,
        SelectServerEnum.custom,
      );
      this.setState({
        selectServer: SelectServerEnum.custom,
        server: { uri, chainName },
        customServerUri: '',
        customServerChainName: this.state.server.chainName,
        customServerOffline: false,
      });
      this.customServerModalRef.current?.dismiss();
    }
    this.setState({ actionButtonsDisabled: false });
  };

  navigateToLoadedApp = (
    readOnly: boolean,
    orchardPool: boolean,
    saplingPool: boolean,
    transparentPool: boolean,
    newWallet: boolean,
    firstLaunchingMessage: LaunchingModeEnum,
    walletChainName: ChainNameEnum,
  ) => {
    this.setState(s => ({ wallet: { ...s.wallet, seed: '', ufvk: '' } }));
    this.props.navigationApp.reset({
      index: 0,
      routes: [
        {
          name: RouteEnum.LoadedApp,
          params: {
            readOnly,
            orchardPool,
            saplingPool,
            transparentPool,
            newWallet,
            firstLaunchingMessage,
            walletChainName,
          },
        },
      ],
    });
  };

  createNewWallet = async (goSeedScreen: boolean = true): Promise<void> => {
    const offline = this.state.selectServer === SelectServerEnum.offline;
    // Block only when the device is genuinely offline AND not in explicit
    // Offline mode. Offline mode is a deliberate no-server flow: the wallet is
    // created locally and simply won't sync until a server is chosen.
    if (!this.state.netInfo.isConnected && !offline) {
      this.addLastSnackbar(
        this.state.translate('loadedapp.connection-error') as string,
      );
      return;
    }
    this.setState({ actionButtonsDisabled: true });
    // Pass "0" in both modes. Online, the Indexer supplies the chain tip.
    // Offline (Indexerless), the FFI falls back to zingolib's Library Birthday
    // — a per-chain height already mined when the linked zingolib release was
    // cut, so a brand-new wallet starts its first sync from that recent floor
    // instead of scanning the whole chain from Sapling activation (zingolib
    // ADR 0007). A non-zero value here would act as an explicit override.
    const serverUri = offline ? '' : this.state.server.uri;
    const birthday = '0';
    let seed: string = await createNewWallet(
      serverUri,
      birthday,
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
          this.state.translate('loadingapp.creatingwallet-label') as string,
          e instanceof Error ? e.message : String(e),
          false,
          this.state.translate,
          sendEmail,
          this.state.zingolibVersion,
        );
        return;
      }
      const wallet: WalletType = {
        seed: seedJSON.seed_phrase || '',
        birthday: seedJSON.birthday || 0,
      };
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
        screen: goSeedScreen ? RouteEnum.NewSeed : state.screen,
        actionButtonsDisabled: false,
        walletExists: true,
      }));
    } else {
      this.walletErrorHandle(
        seed,
        this.state.translate('loadingapp.creatingwallet-label') as string,
        RouteEnum.StartMenu,
        false,
      );
    }
  };

  getwalletToRestore = async () => {
    this.setState({ wallet: {} as WalletType, screen: RouteEnum.ImportUfvk });
  };

  doRestore = async (seedUfvk: string, birthday: number) => {
    if (!seedUfvk) {
      // no reporting button, no needed.
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
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
      if (
        this.state.server.chainName === ChainNameEnum.mainChainName &&
        (seedUfvk.startsWith(GlobalConst.uviewtest) ||
          seedUfvk.startsWith(GlobalConst.uviewregtest))
      ) {
        // the ufvk is not correct
        parsingError = true;
      }
      if (
        this.state.server.chainName === ChainNameEnum.testChainName &&
        !seedUfvk.startsWith(GlobalConst.uviewtest)
      ) {
        // the ufvk is not correct
        parsingError = true;
      }
      if (
        this.state.server.chainName === ChainNameEnum.regtestChainName &&
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
    if (
      Number(walletBirthday) < activationHeight[this.state.server.chainName]
    ) {
      // no reporting button, no needed.
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
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
      result = await restoreWalletFromSeed(
        seedUfvk.toLowerCase(),
        walletBirthday || '0',
        this.state.server.uri,
        this.state.server.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
    } else {
      result = await restoreWalletFromUfvk(
        seedUfvk.toLowerCase(),
        walletBirthday || '0',
        this.state.server.uri,
        this.state.server.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
    }

    let error = false;
    let errorText = '';
    if (result && !result.toLowerCase().startsWith(GlobalConst.error)) {
      try {
        // here result can have an `error` field for watch-only which is actually OK.
        const resultJson: RPCSeedType & RPCUfvkType = await JSON.parse(result);
        if (!resultJson.error) {
          // when restore a wallet never the user needs that the seed screen shows up with the first funds received.
          await SettingsFileImpl.writeSettings(
            SettingsNameEnum.basicFirstViewSeed,
            true,
          );
          // Load the wallet and navigate to the vts screen
          let readOnly: boolean = false;
          let orchardPool: boolean = false;
          let saplingPool: boolean = false;
          let transparentPool: boolean = false;
          const walletKindStr: string = await getWalletKind();
          console.log('KIND...', walletKindStr);
          try {
            const walletKindJSON: RPCWalletKindType =
              await JSON.parse(walletKindStr);
            // there are 4 kinds:
            // 1. seed
            // 2. USK
            // 3. UFVK - watch-only wallet
            // 4. No keys - watch-only wallet (possibly an error)

            if (
              walletKindJSON.kind ===
                RPCWalletKindEnum.LoadedFromUnifiedFullViewingKey ||
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
              const wallet = await fetchWallet(readOnly);
              if (wallet) {
                await createUpdateRecoveryWalletInfo(wallet);
              }
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
            this.setState({
              readOnly,
              orchardPool,
              saplingPool,
              transparentPool,
              actionButtonsDisabled: false,
            });
            this.addLastSnackbar(walletKindStr);
          }
          this.navigateToLoadedApp(
            readOnly,
            orchardPool,
            saplingPool,
            transparentPool,
            true,
            this.state.firstLaunchingMessage,
            // restore requires a live server → its chain is the wallet's chain.
            this.state.server.chainName,
          );
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
      this.walletErrorHandle(
        errorText,
        this.state.translate('loadingapp.readingwallet-label') as string,
        RouteEnum.ImportUfvk,
        false,
      );
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
    // Reflect the current persisted mode in the modal's chips when it opens:
    // offline / auto / custom light the matching chip; `list` (which has no
    // chip here) opens with none selected so the user picks explicitly. The
    // active server itself is shown on the StartMenu behind the modal.
    const s = this.state.selectServer;
    this.setState(
      {
        customServerOffline: s === SelectServerEnum.offline,
        customServerAuto: s === SelectServerEnum.auto,
        customServerCustom: s === SelectServerEnum.custom,
        customServerChainName:
          this.state.server.chainName || ChainNameEnum.mainChainName,
        customServerUri:
          s === SelectServerEnum.custom ? this.state.server.uri : '',
      },
      () => {
        this.customServerModalRef.current?.present();
      },
    );
  };

  onPressServerChainName = (chain: ChainNameEnum) => {
    // Regtest has no public auto/offline server — it only works against a
    // locally-run node reachable via a custom URI, so selecting it forces the
    // Custom mode. Main/test keep the freedom to pick any of the three modes.
    if (chain === ChainNameEnum.regtestChainName) {
      this.setState({
        customServerChainName: chain,
        customServerOffline: false,
        customServerAuto: false,
        customServerCustom: true,
      });
    } else {
      this.setState({ customServerChainName: chain });
    }
  };

  onPressServerOffline = (value: boolean) => {
    // The three chips are mutually exclusive; turning one on clears the others.
    this.setState({
      customServerOffline: value,
      customServerAuto: value ? false : this.state.customServerAuto,
      customServerCustom: value ? false : this.state.customServerCustom,
    });
  };

  onPressServerAuto = (value: boolean) => {
    this.setState({
      customServerAuto: value,
      customServerOffline: value ? false : this.state.customServerOffline,
      customServerCustom: value ? false : this.state.customServerCustom,
    });
  };

  onPressServerCustom = (value: boolean) => {
    this.setState({
      customServerCustom: value,
      customServerOffline: value ? false : this.state.customServerOffline,
      customServerAuto: value ? false : this.state.customServerAuto,
    });
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

  changeMode = async (mode: ModeEnum.basic | ModeEnum.advanced) => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.mode, mode);
    this.props.toggleTheme(mode);
    // if the user selects advanced mode & wants to change to another wallet
    // and then the user wants to go to basic mode in the first screen
    // the result will be the same -> create a new wallet.
    this.setState({ mode, screen: RouteEnum.Launching }, () => {
      this.componentDidMount();
    });
  };

  recoverRecoveryWalletInfo = async (security: boolean) => {
    // recover the wallet keys from the device
    const wallet = await getRecoveryWalletInfo();
    // in IOS the App + OS needs some time to close the biometric screen
    // then the Alert can be too fast.
    if (wallet.seed || wallet.ufvk) {
      const txt = (wallet.seed || wallet.ufvk) + '\n\n' + wallet.birthday;
      const preview = wallet.seed
        ? (() => {
            const words = wallet.seed.split(' ');
            return `${words[0]} ... ${words[words.length - 1]}`;
          })()
        : `${(wallet.ufvk || '').slice(0, 5)} ... ${(wallet.ufvk || '').slice(-5)}`;
      setTimeout(
        () => {
          showConfirm({
            title: this.props.translate('loadedapp.walletseed-basic') as string,
            message:
              (security
                ? ''
                : ((this.props.translate('loadingapp.recoverkeysinstall') +
                    '\n\n') as string)) +
              preview +
              '\n\n' +
              // Audit Suggestion 5 — append the clipboard-exposure warning so
              // the existing recover-keys confirm makes the security risk
              // explicit before the user taps Copy.
              ((this.props.translate(
                Platform.OS === 'ios'
                  ? 'seed.clipboard-confirm-message-ios'
                  : 'seed.clipboard-confirm-message-android',
              ) as string) || ''),
            buttons: [
              {
                text: this.props.translate('copy') as string,
                onPress: () => {
                  if (this.clipboardTimer) {
                    clearTimeout(this.clipboardTimer);
                  }
                  Clipboard.setString(txt);
                  this.addLastSnackbar(
                    this.props.translate(
                      wallet.seed
                        ? 'seed.tapcopy-seed-message'
                        : 'seed.tapcopy-ufvk-message',
                    ) as string,
                    SnackbarDurationEnum.longer,
                  );
                  this.clipboardTimer = setTimeout(() => {
                    Clipboard.setString('');
                    this.clipboardTimer = null;
                    this.addLastSnackbar(
                      this.props.translate('seed.clipboard-cleared') as string,
                      SnackbarDurationEnum.long,
                    );
                  }, 60 * 1000);
                },
              },
              {
                text: this.props.translate('cancel') as string,
                style: 'cancel',
              },
            ],
          });
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

  restoreLastBackup = async () => {
    this.setState({ screen: RouteEnum.Launching, actionButtonsDisabled: true });
    const result = await restoreExistingWalletBackup();
    if (!result || result === GlobalConst.false) {
      this.addLastSnackbar(
        this.state.translate('rpc.backupnotfound-error') as string,
      );
      this.setState({
        screen: RouteEnum.StartMenu,
        actionButtonsDisabled: false,
      });
      return;
    }
    this.openCurrentWallet();
  };

  async fetchZingolibVersion(): Promise<void> {
    try {
      const start = Date.now();
      let zingolibStr: string = await getVersionInfo();
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > zingolib version - ',
          Date.now() - start,
        );
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
      hasBackupWallet,
      customServerUri,
      customServerChainName,
      customServerOffline,
      customServerAuto,
      firstLaunchingMessage,
      biometricsFailed,
      translate,
      hasRecoveryWalletInfoSaved,
      readOnly,
      orchardPool,
      saplingPool,
      transparentPool,
    } = this.state;

    const context = {
      // context
      netInfo: this.state.netInfo,
      zecPrice: this.state.zecPrice,
      backgroundSyncInfo: this.state.backgroundSyncInfo,
      translate: this.state.translate,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      orchardPool: this.state.orchardPool,
      saplingPool: this.state.saplingPool,
      transparentPool: this.state.transparentPool,
      addLastSnackbar: this.addLastSnackbar,
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
      <>
        <ContextAppLoadingProvider value={context}>
          <GestureHandlerRootView>
            <BottomSheetModalProvider>
              <BottomSheetBackHandler />
              <ConfirmBottomSheet />
              {screen === RouteEnum.Launching && (
                <Launching
                  translate={translate}
                  firstLaunchingMessage={firstLaunchingMessage}
                  biometricsFailed={biometricsFailed}
                  tryAgain={() => {
                    this.setState({ biometricsFailed: false }, () =>
                      this.componentDidMount(),
                    );
                  }}
                />
              )}
              {screen === RouteEnum.StartMenu && (
                <StartMenu
                  actionButtonsDisabled={actionButtonsDisabled}
                  hasRecoveryWalletInfoSaved={hasRecoveryWalletInfoSaved}
                  recoverRecoveryWalletInfo={this.recoverRecoveryWalletInfo}
                  changeMode={this.changeMode}
                  customServer={this.customServer}
                  walletExists={walletExists}
                  hasBackupWallet={hasBackupWallet}
                  openCurrentWallet={this.openCurrentWallet}
                  createNewWallet={this.createNewWallet}
                  getwalletToRestore={this.getwalletToRestore}
                  restoreLastBackup={this.restoreLastBackup}
                />
              )}
              <CustomServerModalHost
                ref={this.customServerModalRef}
                actionButtonsDisabled={actionButtonsDisabled}
                customServerOffline={customServerOffline}
                onPressServerOffline={this.onPressServerOffline}
                customServerAuto={customServerAuto}
                onPressServerAuto={this.onPressServerAuto}
                customServerChainName={customServerChainName}
                onPressServerChainName={this.onPressServerChainName}
                customServerUri={customServerUri}
                setCustomServerUri={this.setCustomServerUri}
                usingCustomServer={this.usingCustomServer}
                translate={translate}
              />
              {screen === RouteEnum.NewSeed && wallet && (
                <NewSeed
                  wallet={this.state.wallet}
                  onClickOK={() =>
                    this.navigateToLoadedApp(
                      readOnly,
                      orchardPool,
                      saplingPool,
                      transparentPool,
                      true,
                      firstLaunchingMessage,
                      // advanced create is online → server chain = wallet chain.
                      this.state.server.chainName,
                    )
                  }
                />
              )}
              {screen === RouteEnum.ImportUfvk && (
                <ImportUfvk
                  onClickOK={(s: string, b: number) => this.doRestore(s, b)}
                  onClickCancel={() =>
                    this.setState({ screen: RouteEnum.StartMenu })
                  }
                />
              )}
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </ContextAppLoadingProvider>
        <Toast config={toastConfig} />
      </>
    );
  }
}
