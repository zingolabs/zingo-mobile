import React, { Component, useState, useMemo, useEffect } from 'react';
import { I18nManager, AppState, NativeEventSubscription } from 'react-native';

import { useTheme } from '@app/theme';
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
import { BottomSheetBackHandler } from '@app/hooks/useBottomSheetBackHandler';
import ConfirmBottomSheet from '@ui/widgets/ConfirmBottomSheet';
import { showConfirm } from '@app/services/showConfirm';

import {
  createNewWallet,
  deleteExistingWallet,
  getVersionInfo,
  getWalletKind,
  hasRepairableWalletFile,
  loadExistingWallet,
  repairDoubleWrappedWallet,
  repairSucceeded,
  resolvedTrue,
  restoreWalletFromSeed,
  restoreWalletFromUfvk,
  walletExists as rpcWalletExists,
  walletFileDiagnosis,
  WalletFileDiagnosis,
} from '@app/walletBackend';
import {
  AppStateLoading,
  BackgroundType,
  WalletType,
  TranslateType,
  NetInfoType,
  ServerType,
  nativeUri,
  offlineServer,
  remoteServer,
  ServerUrisType,
  LanguageEnum,
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
} from '@app/AppState';
import { parseServerURI, serverUris, fetchServerList } from '@app/uris';
import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { fetchWallet } from '@app/walletBackend';
import { AppTheme } from '@app/theme';
import { ContextAppLoadingProvider } from '@app/context';
import BackgroundFileImpl from '@app/services/BackgroundFileImpl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '@app/services/createAlert';
import { getZingoVersion, substituteZingoName } from '@app/utils/ZingoAppData';
import Utils from '@app/utils';
import { RPCWalletKindType } from '@app/walletBackend/types/RPCWalletKindType';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@ui/widgets/toastConfig';
import { RPCSeedType } from '@app/walletBackend/types/RPCSeedType';
import Launching from '@screens/Launching';
import {
  GateAnswer,
  askGate,
  dropWhileInFlight,
  enactGateAnswer,
  resolveTriggerGate,
  retireSentinelEntries,
} from '@app/services/gateController';
import selectingServer from '@app/services/selectingServer';
import { isEqual } from 'lodash';
import {
  createUpdateRecoveryWalletInfo,
  getRecoveryWalletInfo,
  hasRecoveryWalletInfo,
} from '@app/services/recoveryWalletInfo';

// no lazy load because slowing down screens.
import ImportUfvk from '@screens/ImportUfvk';
import ImportChooser from '@screens/ImportChooser';
import OnboardingStage from '@ui/widgets/OnboardingStage';
import SeedSheet from '@ui/widgets/SeedSheet';
import WalletProgress from '@screens/WalletProgress';
import WalletError from '@screens/WalletError';
import DeleteWalletSheet from '@ui/widgets/DeleteWalletSheet';
import { DeleteWalletContext } from '@app/AppState/types/DeleteWalletContext';
import { walletErrorKind } from './walletErrorKind';
import { sanitizePaths } from '@app/utils/sanitizePaths';
import { duration as motionDuration } from '@app/theme/motion';

import { sendEmail } from '@app/services/sendEmail';
import { RPCWalletKindEnum } from '@app/walletBackend/enums/RPCWalletKindEnum';
import StartMenu from '@screens/StartMenu';
import { RPCUfvkType } from '@app/walletBackend/types/RPCUfvkType';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { AppStackParamList } from '@app/types';

const en = require('@app/translations/en.json');
const es = require('@app/translations/es.json');
const pt = require('@app/translations/pt.json');
const ru = require('@app/translations/ru.json');
const tr = require('@app/translations/tr.json');

type LoadingAppProps = {
  navigation: StackScreenProps<
    AppStackParamList,
    RouteEnum.LoadingApp
  >['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadingApp>['route'];
};

const SERVER_DEFAULT_0: ServerType = remoteServer(
  serverUris(() => {})[0].uri,
  serverUris(() => {})[0].chainName,
);

const activationHeight = {
  main: 419200,
  test: 280000,
  regtest: 1,
  '': 1,
};

export default function LoadingApp(props: LoadingAppProps) {
  const theme = useTheme();
  const [language, setLanguage] = useState<LanguageEnum>(LanguageEnum.en);
  const [server, setServer] = useState<ServerType>(SERVER_DEFAULT_0);
  const [privacy, setPrivacy] = useState<boolean>(false);
  const [backgroundSyncInfo, setBackgroundSyncInfo] = useState<BackgroundType>({
    batches: 0,
    message: '',
    date: 0,
    dateEnd: 0,
  });
  const [firstLaunchingMessage, setFirstLaunchingMessage] =
    useState<LaunchingModeEnum>(LaunchingModeEnum.opening);
  const [loading, setLoading] = useState<boolean>(true);
  const [biometrics, setBiometrics] = useState<boolean>(true);
  const [selectServer, setSelectServer] = useState<SelectServerEnum>(
    SelectServerEnum.auto,
  );
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
      if (settings.server) {
        // Offline (empty uri) still carries the user's chosen chain: create and
        // restore derive keys chain-specifically, so onboarding must never face
        // an empty chain. The wallet-open path ignores this value anyway — it
        // tries every chain and adopts the one the wallet deserializes under.
        // Only fall back to mainnet when a chain is genuinely absent (e.g. an
        // old config persisted before offline carried a chain), and persist
        // that migration once.
        const normalizedServer =
          settings.server.kind === 'offline' && !settings.server.chainName
            ? offlineServer(ChainNameEnum.mainChainName)
            : settings.server;
        setServer(normalizedServer);
        setSelectServer(settings.selectServer);
        await SettingsFileImpl.writeServer(
          normalizedServer,
          settings.selectServer,
        );
      } else {
        await SettingsFileImpl.writeServer(server, selectServer);
      }
      if (settings.privacy === true || settings.privacy === false) {
        setPrivacy(settings.privacy);
      } else {
        await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, privacy);
      }
      if (settings.biometrics === true || settings.biometrics === false) {
        setBiometrics(settings.biometrics);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.biometrics,
          biometrics,
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
        biometricGate={{ kind: 'passed' }}
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
        server={server}
        privacy={privacy}
        backgroundSyncInfo={backgroundSyncInfo}
        firstLaunchingMessage={firstLaunchingMessage}
        biometrics={biometrics}
        selectServer={selectServer}
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
  translate: (key: string) => TranslateType;
  theme: AppTheme;
  language: LanguageEnum;
  server: ServerType;
  privacy: boolean;
  backgroundSyncInfo: BackgroundType;
  firstLaunchingMessage: LaunchingModeEnum;
  biometrics: boolean;
  selectServer: SelectServerEnum;
  performanceLevel: RPCPerformanceLevelEnum;
  blockExplorer: BlockExplorerEnum;
};

type LoadingAppClassState = AppStateLoading & AppContextLoading;

const RETRY_MIN_MS = 1400;

export class LoadingAppClass extends Component<
  LoadingAppClassProps,
  LoadingAppClassState
> {
  appstate?: NativeEventSubscription;
  unsubscribeNetInfo?: NetInfoSubscription;
  seedSheetRef = React.createRef<BottomSheetModal>();
  deleteSheetRef = React.createRef<BottomSheetModal>();
  // Runs once the hold completes; set with the sheet's context.
  afterDelete: () => void = () => {};
  retryStartedAt = 0;
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
      language: props.language,
      privacy: props.privacy,
      biometrics: props.biometrics,
      selectServer: props.selectServer,
      performanceLevel: props.performanceLevel,
      blockExplorer: props.blockExplorer,

      // state
      appStateStatus: AppState.currentState,
      screen:
        !!props.route.params && props.route.params.screen !== undefined
          ? props.route.params.screen
          : RouteEnum.Launching,
      actionButtonsDisabled: false,
      progressKind: 'import',
      walletExists: false,
      customServerUri: '',
      customServerChainName: ChainNameEnum.mainChainName,
      customServerOffline: false,
      customServerAuto: false,
      customServerCustom: false,
      // The gate outcome arrives with the navigation whole (see
      // LoadingAppNavigationState), never from module state.
      biometricGate: props.route.params?.biometricGate ?? { kind: 'passed' },
      startingApp:
        !!props.route.params && props.route.params.startingApp !== undefined
          ? props.route.params.startingApp
          : true,
      firstLaunchingMessage: props.firstLaunchingMessage,
      hasRecoveryWalletInfoSaved: false,
      recoveryWallet: null,
      walletError: null,
      retrying: false,
      errorShake: 0,
      deleteContext: 'import',
    };

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

    // Retire the keychain entries the replaced sentinel gate shipped:
    // nothing reads them, and an auth-gated key left under a known name
    // invites stale-entry reuse. Fire-and-forget, best-effort, idempotent.
    retireSentinelEntries();

    // to start the App the first time in this session
    // the user have to pass the security of the device
    if (this.state.startingApp) {
      if (this.state.biometricGate.kind === 'declined') {
        // A biometric fail, likely from the foreground check: keep the App
        // on the first screen so the user can try again.
        return;
      }
      // (PIN or TouchID or FaceID). Only a decline locks; a gate that
      // cannot run fails open with a notice (ADR 0007), because blocking
      // would trap the user out of the wallet. A retry's answer rides in
      // as data, so this trigger never runs a second ceremony behind it.
      const startGate: GateAnswer = await resolveTriggerGate(
        this.consumeRetryAnswer(),
        this.state.biometrics,
        { translate: this.state.translate },
      );
      const proceed = enactGateAnswer(
        startGate,
        {
          // The narrowed answer is the gate outcome, whole.
          lock: declined => this.setState({ biometricGate: declined }),
          notice: this.addLastSnackbar,
        },
        this.state.translate,
      );
      if (!proceed) {
        return;
      }
    }

    this.setState({ actionButtonsDisabled: true });

    // has the device the Wallet Keys stored?
    const has = await hasRecoveryWalletInfo();
    const recovery = has ? await getRecoveryWalletInfo() : null;
    this.setState({
      hasRecoveryWalletInfoSaved: has,
      recoveryWallet:
        recovery && (recovery.seed || recovery.ufvk) ? recovery : null,
    });

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

    // Second, check if a wallet exists. Do it async so the screen has time to render
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.no);
    const exists = await rpcWalletExists();

    if (exists) {
      this.setState({ walletExists: true });
      await this.loadExistingWalletOnBoot();
    } else {
      // no wallet file -> go to the initial menu.
      this.setState(state => ({
        screen:
          state.screen === RouteEnum.ImportUfvk
            ? RouteEnum.ImportUfvk
            : RouteEnum.StartMenu,
        walletExists: false,
        actionButtonsDisabled: false,
      }));
    }

    if (this.unmounted) {
      // The boot chain outlived this instance; attaching listeners here
      // would subscribe a dead component forever.
      return;
    }
    // Re-entry via the locked screen's tryAgain must not stack another
    // subscription pair on the one this mount already holds.
    this.detachListeners();
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
          if (isConnected !== state.isConnected && !state.isConnected) {
            this.customServerModalRef.current?.dismiss();
          }
        }
      },
    );

    // The server modal is no longer auto-presented for offline + no-wallet:
    // that onboarding state now offers create / restore directly, so it is not
    // an empty screen. The modal opens on demand from the gear button.
  };

  detachListeners = () => {
    this.appstate?.remove();
    this.appstate = undefined;
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = undefined;
  };

  unmounted = false;

  componentWillUnmount = () => {
    this.unmounted = true;
    this.detachListeners();
  };

  // Default server for a chain = the `default` entry for that chain in the
  // static `serverUris` list (mainnet and testnet both have one). Same lookup
  // for both chains, no per-chain special-casing.
  defaultServerForChain = (chainName: ChainNameEnum): ServerType => {
    const found = serverUris(this.state.translate).find(
      (s: ServerUrisType) => s.chainName === chainName && s.default,
    );
    return found ? remoteServer(found.uri, found.chainName) : SERVER_DEFAULT_0;
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
    const current = this.state.server;
    if (current.kind === 'offline') {
      return true;
    }
    const chainName = current.chainName;

    if (mode === SelectServerEnum.auto) {
      if (!isConnected) {
        const s = this.defaultServerForChain(chainName);
        this.setState({ server: s });
        await SettingsFileImpl.writeServer(s, mode);
        return false;
      }
      const list = await fetchServerList(chainName);
      if (list.length > 0) {
        const best = remoteServer(list[0].uri, list[0].chainName);
        this.setState({ server: best });
        await SettingsFileImpl.writeServer(best, mode);
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
        (s: ServerUrisType) => s.uri === current.uri,
      );
      if (stillListed) {
        return true;
      }
      // The chosen server dropped off the list → activate the best one and
      // promote the mode to auto (it is no longer a manual list choice).
      const best = remoteServer(list[0].uri, list[0].chainName);
      this.setState({ server: best, selectServer: SelectServerEnum.auto });
      await SettingsFileImpl.writeServer(best, SelectServerEnum.auto);
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
    if (actualServer.kind === 'offline') {
      return false;
    }
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
    let fasterServer = actualServer;
    if (server && server.latency) {
      fasterServer = remoteServer(server.uri, server.chainName);
    } else {
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
    await SettingsFileImpl.writeServer(fasterServer, targetMode);
    // message with the result (never at boot)
    if (!silent && someServerIsWorking) {
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

  // Loads the wallet file found on disk. Also the retry after a file repair.
  loadExistingWalletOnBoot = async () => {
    const result = await loadExistingWallet(
      nativeUri(this.state.server),
      this.state.server.chainName,
      this.state.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );

    let error = false;
    let errorText = '';
    if (result.ok && result.value) {
      try {
        // here result can have an `error` field for watch-only which is actually OK.
        const resultJson: RPCSeedType & RPCUfvkType = await JSON.parse(
          result.value,
        );
        if (!resultJson.error) {
          // Load the wallet and navigate to the vts screen
          let readOnly: boolean = false;
          let orchardPool: boolean = false;
          let saplingPool: boolean = false;
          let transparentPool: boolean = false;
          const walletKindResult = await getWalletKind();
          const walletKindStr: string = walletKindResult.ok
            ? walletKindResult.value
            : walletKindResult.error.message;
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
            // store this wallet's recovery info in the Keychain/Keystore; if
            // it can't be read, whatever the device holds is removed.
            await createUpdateRecoveryWalletInfo(await fetchWallet(readOnly));
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
      errorText = result.ok ? result.value : result.error.message;
    }
    if (error) {
      await this.walletLoadFailed(
        Utils.humanizeChainTokens(errorText, this.state.translate),
      );
    }
  };

  // A repairable file is repaired and reloaded once; anything else lands on
  // the error screen with the error text behind its details toggle.
  walletLoadFailed = async (errorText: string) => {
    const report = await walletFileDiagnosis();
    if (!this.state.retrying && hasRepairableWalletFile(report.files)) {
      this.addLastSnackbar(
        this.state.translate('loadingapp.walletrepair-running') as string,
      );
      const outcomes = await repairDoubleWrappedWallet();
      if (repairSucceeded(outcomes)) {
        this.addLastSnackbar(
          this.state.translate('loadingapp.walletrepair-success') as string,
        );
        await this.loadExistingWalletOnBoot();
        return;
      }
    }
    const diagnosisLines = this.walletFileDiagnosisLines(report.files);
    this.showWalletError(
      sanitizePaths(
        diagnosisLines ? `${errorText}\n\n${diagnosisLines}` : errorText,
      ),
    );
  };

  walletFileDiagnosisLines = (diagnosis: WalletFileDiagnosis[]): string =>
    diagnosis
      .filter(d => d.state !== 'missing')
      .map(
        d =>
          `${d.name}: ${this.state.translate(
            `loadingapp.walletfile-state-${d.state}`,
          )}`,
      )
      .join('\n');

  // A retry that fails again shakes the icon and says so; its dots stay up
  // for at least RETRY_MIN_MS so the attempt reads as one.
  showWalletError = (details: string) => {
    const kind = walletErrorKind(details);
    const again = this.state.screen === RouteEnum.WalletError;
    const apply = () => {
      if (again) {
        this.addLastSnackbar(
          this.state.translate(
            kind === 'server'
              ? 'walleterror.still-server'
              : 'walleterror.still-open',
          ) as string,
        );
      }
      this.setState(state => ({
        walletError: { kind, details },
        retrying: false,
        errorShake: again ? state.errorShake + 1 : state.errorShake,
        actionButtonsDisabled: false,
        screen: RouteEnum.WalletError,
      }));
    };
    const elapsed = Date.now() - this.retryStartedAt;
    const wait = this.state.retrying ? Math.max(0, RETRY_MIN_MS - elapsed) : 0;
    setTimeout(apply, wait);
  };

  retryOpenWallet = async () => {
    this.retryStartedAt = Date.now();
    this.setState({ retrying: true, actionButtonsDisabled: true });
    await this.loadExistingWalletOnBoot();
  };

  // The sheet's hold runs `next` after the wallet file is gone; replacing a
  // Keychain phrase has nothing to delete first.
  confirmDelete = (context: DeleteWalletContext, next: () => void) => {
    this.afterDelete = async () => {
      if (context !== 'replace') {
        const result = await deleteExistingWallet();
        if (!resolvedTrue(result)) {
          this.addLastSnackbar(
            this.state.translate('rpc.deletewallet-error') as string,
          );
          return;
        }
        this.setState({ walletExists: false, walletError: null });
      }
      next();
    };
    this.setState({ deleteContext: context }, () =>
      this.deleteSheetRef.current?.present(),
    );
  };

  createNewWalletChecked = () => {
    if (this.state.walletExists) {
      this.confirmDelete('create', this.createNewWallet);
    } else if (this.state.recoveryWallet) {
      this.confirmDelete('replace', this.createNewWallet);
    } else {
      this.createNewWallet();
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
      await SettingsFileImpl.writeServer(fallback, SelectServerEnum.auto);
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
      const offline = offlineServer(this.state.customServerChainName);
      await SettingsFileImpl.writeServer(offline, this.state.selectServer);
      this.setState({
        server: offline,
        customServerUri: '',
        customServerChainName: this.state.server.chainName,
        customServerOffline: false,
      });
      this.customServerModalRef.current?.dismiss();
    } else {
      const parsed = parseServerURI(this.state.customServerUri);
      const chainName = this.state.customServerChainName;
      if (parsed.kind === 'error') {
        // Surface the parser's specific message (bad URI, plaintext
        // HTTP not allowed, etc.) instead of the generic "fill out a
        // valid Server URI" snackbar so the user can fix the input.
        this.addLastSnackbar(this.state.translate(parsed.errorKey) as string);
        this.setState({ actionButtonsDisabled: false });
        return;
      }
      const uri = parsed.uri;

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
      const custom = remoteServer(uri, chainName);
      await SettingsFileImpl.writeServer(custom, SelectServerEnum.custom);
      this.setState({
        selectServer: SelectServerEnum.custom,
        server: custom,
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

  createNewWallet = async (): Promise<void> => {
    const offline = this.state.server.kind === 'offline';
    // Block only when the device is genuinely offline AND not in explicit
    // Offline mode. Offline mode is a deliberate no-server flow: the wallet is
    // created locally and simply won't sync until a server is chosen.
    if (!this.state.netInfo.isConnected && !offline) {
      this.addLastSnackbar(
        this.state.translate('loadedapp.connection-error') as string,
      );
      return;
    }
    this.setState({
      actionButtonsDisabled: true,
      progressKind: 'create',
    });
    const showProgress = setTimeout(
      () => this.setState({ screen: RouteEnum.WalletProgress }),
      motionDuration.emphasized,
    );
    // Pass "0" in both modes. Online, the Indexer supplies the chain tip.
    // Offline (Indexerless), the FFI falls back to zingolib's Library Birthday
    // — a per-chain height already mined when the linked zingolib release was
    // cut, so a brand-new wallet starts its first sync from that recent floor
    // instead of scanning the whole chain from Sapling activation (zingolib
    // ADR 0007). A non-zero value here would act as an explicit override.
    const serverUri = nativeUri(this.state.server);
    const birthday = '0';
    const seed = await createNewWallet(
      serverUri,
      birthday,
      this.state.server.chainName,
      this.state.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );

    if (seed.ok && seed.value) {
      let seedJSON = {} as RPCSeedType;
      try {
        seedJSON = await JSON.parse(seed.value);
        if (seedJSON.error) {
          clearTimeout(showProgress);
          this.setState({
            actionButtonsDisabled: false,
            screen: RouteEnum.StartMenu,
          });
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
        clearTimeout(showProgress);
        this.setState({
          actionButtonsDisabled: false,
          screen: RouteEnum.StartMenu,
        });
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
      await createUpdateRecoveryWalletInfo(wallet);
      clearTimeout(showProgress);
      this.setState({
        wallet,
        actionButtonsDisabled: false,
        walletExists: true,
      });
      this.navigateToLoadedApp(
        this.state.readOnly,
        this.state.orchardPool,
        this.state.saplingPool,
        this.state.transparentPool,
        true,
        this.state.firstLaunchingMessage,
        this.state.server.chainName,
      );
    } else {
      clearTimeout(showProgress);
      this.setState({
        actionButtonsDisabled: false,
        screen: RouteEnum.StartMenu,
      });
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadingapp.creatingwallet-label') as string,
        seed.ok ? seed.value : seed.error.message,
        false,
        this.state.translate,
        sendEmail,
        this.state.zingolibVersion,
      );
    }
  };

  getwalletToRestore = async () => {
    this.setState({
      wallet: {} as WalletType,
      screen: this.state.recoveryWallet
        ? RouteEnum.ImportChooser
        : RouteEnum.ImportUfvk,
    });
  };

  leaveImport = () => {
    this.setState({
      screen: this.state.recoveryWallet
        ? RouteEnum.ImportChooser
        : RouteEnum.StartMenu,
    });
  };

  doRestore = async (
    seedUfvk: string,
    birthday: number,
    origin: RouteEnum = RouteEnum.ImportUfvk,
  ) => {
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

    this.setState({
      actionButtonsDisabled: true,
      progressKind: 'import',
    });
    const showImporting = setTimeout(
      () => this.setState({ screen: RouteEnum.WalletProgress }),
      motionDuration.emphasized,
    );
    let type: RestoreFromTypeEnum = RestoreFromTypeEnum.seedRestoreFrom;
    if (
      seedUfvk.toLowerCase().startsWith(GlobalConst.uview) ||
      seedUfvk.toLowerCase().startsWith(GlobalConst.uviewtest) ||
      seedUfvk.toLowerCase().startsWith(GlobalConst.uviewregtest)
    ) {
      // this is a UFVK
      type = RestoreFromTypeEnum.ufvkRestoreFrom;
    }

    let result: Awaited<ReturnType<typeof restoreWalletFromSeed>>;
    if (type === RestoreFromTypeEnum.seedRestoreFrom) {
      result = await restoreWalletFromSeed(
        seedUfvk.toLowerCase(),
        walletBirthday || '0',
        nativeUri(this.state.server),
        this.state.server.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
    } else {
      result = await restoreWalletFromUfvk(
        seedUfvk.toLowerCase(),
        walletBirthday || '0',
        nativeUri(this.state.server),
        this.state.server.chainName,
        this.state.performanceLevel,
        GlobalConst.minConfirmations.toString(),
      );
    }

    let error = false;
    let errorText = '';
    if (result.ok && result.value) {
      try {
        // here result can have an `error` field for watch-only which is actually OK.
        const resultJson: RPCSeedType & RPCUfvkType = await JSON.parse(
          result.value,
        );
        if (!resultJson.error) {
          // Load the wallet and navigate to the vts screen
          let readOnly: boolean = false;
          let orchardPool: boolean = false;
          let saplingPool: boolean = false;
          let transparentPool: boolean = false;
          const walletKindResult = await getWalletKind();
          const walletKindStr: string = walletKindResult.ok
            ? walletKindResult.value
            : walletKindResult.error.message;
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
            // store this wallet's recovery info in the Keychain/Keystore; if
            // it can't be read, whatever the device holds is removed.
            await createUpdateRecoveryWalletInfo(await fetchWallet(readOnly));
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
          clearTimeout(showImporting);
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
      errorText = result.ok ? result.value : result.error.message;
    }
    if (error) {
      clearTimeout(showImporting);
      this.setState({ actionButtonsDisabled: false, screen: origin });
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadingapp.readingwallet-label') as string,
        errorText,
        false,
        this.state.translate,
        sendEmail,
        this.state.zingolibVersion,
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
    const { server } = this.state;
    const remote = server.kind === 'remote';
    this.setState(
      {
        customServerOffline: !remote,
        customServerAuto: remote && s === SelectServerEnum.auto,
        customServerCustom: remote && s === SelectServerEnum.custom,
        customServerChainName: server.chainName || ChainNameEnum.mainChainName,
        customServerUri:
          remote && s === SelectServerEnum.custom ? server.uri : '',
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

  // The retry's non-declined answer, parked for the boot path to consume
  // as data instead of running a second ceremony.
  retryAnswer: GateAnswer | undefined;

  consumeRetryAnswer = (): GateAnswer | undefined => {
    const carried = this.retryAnswer;
    this.retryAnswer = undefined;
    return carried;
  };

  // The locked screen's retry runs its own ceremony unconditionally: the
  // biometrics switch enables triggers, it never bypasses a retry
  // (ADR 0007). The answer rides into the boot path as data, so the
  // startApp trigger consumes it instead of asking again and the
  // fail-open notice shows once, from the boot path's own handling.
  // Re-entrant taps are dropped for the whole flight, ceremony and boot,
  // so a double tap cannot run two concurrent boots against one wallet.
  retryGate = dropWhileInFlight(async () => {
    const retry = await askGate({ translate: this.state.translate });
    if (retry.kind === 'declined') {
      this.setState({ biometricGate: retry });
      return;
    }
    this.retryAnswer = retry;
    await new Promise<void>(resolve => {
      this.setState({ biometricGate: { kind: 'passed' } }, resolve);
    });
    await this.componentDidMount();
  });

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

  importRecoveryWallet = () => {
    const wallet = this.state.recoveryWallet;
    if (!wallet) {
      return;
    }
    this.doRestore(
      wallet.seed || wallet.ufvk || '',
      wallet.birthday,
      this.state.screen,
    );
  };

  viewRecoveryWallet = async () => {
    const answer = await askGate({ translate: this.state.translate });
    if (answer.kind === 'declined') {
      return;
    }
    this.seedSheetRef.current?.present();
  };

  openCurrentWallet = () => {
    // to avoid the biometric security
    this.setState({
      startingApp: false,
    });
    this.componentDidMount();
  };

  async fetchZingolibVersion(): Promise<void> {
    const zingolibResult = await getVersionInfo();
    let zingolibStr: string;
    if (!zingolibResult.ok) {
      // The version display still needs a value when the FFI rejects.
      zingolibStr = GlobalConst.zingolibError;
    } else if (!zingolibResult.value) {
      zingolibStr = GlobalConst.zingolibNone;
    } else {
      zingolibStr = zingolibResult.value;
    }

    this.setState({
      zingolibVersion: zingolibStr,
    });
  }

  render() {
    const {
      screen,
      actionButtonsDisabled,
      walletExists,
      customServerUri,
      customServerChainName,
      customServerOffline,
      customServerAuto,
      firstLaunchingMessage,
      biometricGate,
      translate,
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
      language: this.state.language,
      privacy: this.state.privacy,
      biometrics: this.state.biometrics,
      selectServer: this.state.selectServer,
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
                  biometricGate={biometricGate}
                  tryAgain={this.retryGate}
                />
              )}
              {screen !== RouteEnum.Launching && (
                <OnboardingStage screen={screen}>
                  {screen === RouteEnum.StartMenu && (
                    <StartMenu
                      actionButtonsDisabled={actionButtonsDisabled}
                      recoveryWallet={this.state.recoveryWallet}
                      importRecoveryWallet={this.importRecoveryWallet}
                      viewRecoveryWallet={this.viewRecoveryWallet}
                      customServer={this.customServer}
                      walletExists={walletExists}
                      openCurrentWallet={this.openCurrentWallet}
                      createNewWallet={this.createNewWalletChecked}
                      getwalletToRestore={this.getwalletToRestore}
                    />
                  )}
                  {screen === RouteEnum.WalletProgress && (
                    <WalletProgress kind={this.state.progressKind} />
                  )}
                  {screen === RouteEnum.ImportChooser && (
                    <ImportChooser
                      busy={actionButtonsDisabled}
                      onPrevious={this.importRecoveryWallet}
                      onSeed={() =>
                        this.setState({ screen: RouteEnum.ImportUfvk })
                      }
                      onBack={() =>
                        this.setState({ screen: RouteEnum.StartMenu })
                      }
                    />
                  )}
                  {screen === RouteEnum.WalletError &&
                    this.state.walletError && (
                      <WalletError
                        kind={this.state.walletError.kind}
                        details={this.state.walletError.details}
                        busy={this.state.retrying}
                        shake={this.state.errorShake}
                        onRetry={this.retryOpenWallet}
                        onImport={() =>
                          this.confirmDelete('import', this.getwalletToRestore)
                        }
                        onCreate={() =>
                          this.confirmDelete('create', this.createNewWallet)
                        }
                        onServer={this.customServer}
                      />
                    )}
                  {screen === RouteEnum.ImportUfvk && (
                    <ImportUfvk
                      busy={this.state.actionButtonsDisabled}
                      onClickOK={(s: string, b: number) => this.doRestore(s, b)}
                      onClickCancel={this.leaveImport}
                    />
                  )}
                </OnboardingStage>
              )}
              <SeedSheet
                ref={this.seedSheetRef}
                wallet={this.state.recoveryWallet}
                translate={translate}
              />
              <DeleteWalletSheet
                ref={this.deleteSheetRef}
                context={this.state.deleteContext}
                translate={translate}
                onConfirmed={() => this.afterDelete()}
                onReleasedEarly={() =>
                  this.addLastSnackbar(
                    translate('deletesheet.keep-holding') as string,
                    SnackbarDurationEnum.short,
                  )
                }
              />
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
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </ContextAppLoadingProvider>
        <Toast config={toastConfig} />
      </>
    );
  }
}
