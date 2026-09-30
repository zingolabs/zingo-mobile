import React, {
  Component,
  useState,
  useMemo,
  useEffect,
  memo,
  forwardRef,
} from 'react';
import { Provider, createStore, useAtomValue } from 'jotai';
import {
  I18nManager,
  EmitterSubscription,
  AppState,
  NativeEventSubscription,
  Linking,
  Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@app/theme';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { isEqual } from 'lodash';
import { StackScreenProps } from '@react-navigation/stack';
import { LoadingAppNavigationState, AppDrawerParamList } from '@app/types';
import NetInfo, {
  NetInfoSubscription,
  NetInfoState,
} from '@react-native-community/netinfo/src/index';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '@sayem314/react-native-keep-awake';

import WalletBackend from '@app/walletBackend';
import {
  changeServer,
  doSave,
  isWalletAddress,
  loadExistingWallet,
  parseAddress,
  reconcileMigration,
  setConfigWalletToProd,
} from '@app/walletBackend';
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
  nativeUri,
  offlineServer,
  remoteServer,
  ServerUrisType,
  SetServerResult,
  AddressBookFileClass,
  MenuItemEnum,
  LanguageEnum,
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
  AddressBookFileClassObsolete,
  ScreenEnum,
  LaunchingModeEnum,
  BlockExplorerEnum,
  SnackbarDurationEnum,
} from '@app/AppState';
import Utils from '@app/utils';
import { getZingoVersion, substituteZingoName } from '@app/utils/ZingoAppData';
import { AppTheme } from '@app/theme';
import {
  walletViewSourceAtom,
  walletViewAtom,
} from '@app/AppState/walletViewAtoms';
import type { WalletViewSource } from '@app/AppState/walletView';
import {
  syncStatusAtom,
  syncMachineAtom,
  observeAtom,
  snapshotObservation,
} from '@app/AppState/syncAtoms';
import { initialMachine } from '@app/walletBackend/controller/syncController';
import {
  callbackEpochAtom,
  boundaryDispatchAtom,
} from '@app/AppState/callbackBoundary';
import {
  appStateStatusAtom,
  seedModalOpenAtom,
  addTagModalAtom,
} from '@app/AppState/uiAtoms';
import { classifyLifecycle } from '@app/AppState/lifecycle';
import { changes, lastUnified } from '@app/AppState/statePatch';
import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import { priceFetcherStore } from '@ui/widgets/priceFetcherStore';
import { ContextAppLoadedProvider } from '@app/context';
import { parseZcashURI, serverUris, fetchServerList } from '@app/uris';
import selectingServer from '@app/services/selectingServer';
import BackgroundFileImpl from '@app/services/BackgroundFileImpl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '@app/services/createAlert';
import { sendEmail } from '@app/services/sendEmail';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@ui/widgets/toastConfig';
import { RPCSeedType } from '@app/walletBackend/types/RPCSeedType';
import Launching from '@screens/Launching';
import { AddressBook } from '@screens/AddressBook';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import {
  GateAnswer,
  enactGateAnswer,
  resolveTriggerGate,
} from '@app/services/gateController';
import ShowAddressAlertAsync from '@app/services/showAddressAlertAsync';

import History from '@screens/History';
import Send from '@screens/Send';
import Receive from '@screens/Receive';
import Settings from '@screens/Settings';
import CustomTabBar from '@app/navigation/CustomTabBar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import AddTagModalHost from './components/AddTagModalHost';
import { BottomSheetBackHandler } from '@app/hooks/useBottomSheetBackHandler';
import ConfirmBottomSheet from '@ui/widgets/ConfirmBottomSheet';
import { showConfirm } from '@app/services/showConfirm';
import RootNavigator from '@app/navigation/RootNavigator';
import {
  OptionsPanelProvider,
  toggleOptionsPanel,
} from '@app/context/optionsPanel';
import LoadedAppOptionsPanelHost from './LoadedAppOptionsPanelHost';
import { MessageList } from '@screens/Messages';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RPCUfvkType } from '@app/walletBackend/types/RPCUfvkType';
import {
  INITIAL_MIXNET_VIEW,
  MixnetView,
} from '@app/walletBackend/transforms/mixnetView';
import {
  startMixnetTransport,
  stopMixnetTransport,
} from '@app/walletBackend/utils/nymTransport';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { AddressList } from '@screens/AddressList';
import ValueTransferDetail from '@screens/ValueTransferDetail';
import Confirm from '@screens/Confirm';
import { AppStackParamList } from '@app/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

const About = React.lazy(() => import('@screens/About'));
const MixnetDoctor = React.lazy(() => import('@screens/MixnetDoctor'));
const Seed = React.lazy(() => import('@screens/Seed'));
const SyncReport = React.lazy(() => import('@screens/SyncReport'));
const Rescan = React.lazy(() => import('@screens/Rescan'));
const Pools = React.lazy(() => import('@screens/Pools'));
const MeetIronwood = React.lazy(() => import('@screens/MeetIronwood'));
const MigrationStrategy = React.lazy(
  () => import('@screens/MigrationStrategy'),
);
const MigrationTransactions = React.lazy(
  () => import('@screens/MigrationTransactions'),
);
const MigrationSending = React.lazy(() => import('@screens/MigrationSending'));
const MigrationSplitPlan = React.lazy(
  () => import('@screens/MigrationSplitPlan'),
);
const MigrationSplitting = React.lazy(
  () => import('@screens/MigrationSplitting'),
);
const MigrationCadence = React.lazy(() => import('@screens/MigrationCadence'));
const MigrationSchedule = React.lazy(
  () => import('@screens/MigrationSchedule'),
);
const MigrationStatus = React.lazy(() => import('@screens/MigrationStatus'));
const MigrationBatchSending = React.lazy(
  () => import('@screens/MigrationBatchSending'),
);
const Insight = React.lazy(() => import('@screens/Insight'));
const ShowUfvk = React.lazy(() => import('@screens/Ufvk/ShowUfvk'));
const ComputingTxContent = React.lazy(() => import('@screens/Computing'));

const en = require('@app/translations/en.json');
const es = require('@app/translations/es.json');
const pt = require('@app/translations/pt.json');
const ru = require('@app/translations/ru.json');
const tr = require('@app/translations/tr.json');

const Tab = createBottomTabNavigator<AppDrawerParamList>();

// The `Zenny Tips` contact older versions wrote into every address book on
// their own, in the five languages that could have created it, and the UA it
// always pointed at. Donations are gone, so the contact is removed — matching
// both the label and the address, to never delete a contact of the user's.
const OBSOLETE_ZENNY_TIPS_LABELS: string[] = [
  'Zenny Tips',
  'Zenny Propinas',
  'Zenny Gorjetas',
  'Поддержать Zenny',
  'Zenny Tavsiyeleri',
];
const OBSOLETE_ZENNY_TIPS_ADDRESS: string =
  'u1p32nu0pgev5cr0u6t4ja9lcn29kaw37xch8nyglwvp7grl07f72c46hxvw0u3q58ks43ntg324fmulc2xqf4xl3pv42s232m25vaukp05s6av9z76s3evsstax4u6f5g7tql5yqwuks9t4ef6vdayfmrsymenqtshgxzj59hdydzygesqa7pdpw463hu7afqf4an29m69kfasdwr494';

// for testing
//const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type LoadedAppProps = {
  navigation: StackScreenProps<
    AppStackParamList,
    RouteEnum.LoadedApp
  >['navigation'];
  route: StackScreenProps<AppStackParamList, RouteEnum.LoadedApp>['route'];
};

const SERVER_DEFAULT_0: ServerType = remoteServer(
  serverUris(() => {})[0].uri,
  serverUris(() => {})[0].chainName,
);

export default function LoadedApp(props: LoadedAppProps) {
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
  const [addressBook, setAddressBook] = useState<AddressBookFileClass[]>([]);
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

  // `translate` carries `language` in its memo deps so its identity changes
  // when the user switches language. Memoized children that include
  // `translate` in their useMemo/useCallback deps then re-evaluate with
  // the new locale — without this, `i18n.locale` mutates but cached
  // translated strings (panel labels, screen titles set at mount, etc.)
  // stay in the old language until the next remount.

  // `language` is intentionally in the deps even though the body doesn't
  // reference it: i18n-js mutates `i18n.locale` in place, so `i18n`'s
  // identity is stable across language switches. The state bump on
  // `language` is what forces this memo to rebuild and gives `translate` a
  // fresh identity that downstream useMemo/useCallback deps can observe.
  const translate: (key: string) => TranslateType = useMemo(
    () => (key: string) => substituteZingoName(i18n.t(key) as TranslateType),
    [i18n, language], // eslint-disable-line react-hooks/exhaustive-deps
  );
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
  // The opened wallet's own chain, resolved by LoadingApp at open time (reliable
  // even Offline). Empty when unknown.
  const walletChainName =
    !!props.route.params && props.route.params.walletChainName !== undefined
      ? props.route.params.walletChainName
      : ChainNameEnum.noneChainName;

  useEffect(() => {
    (async () => {
      // fallback if no available language fits
      const fallback = { languageTag: LanguageEnum.en, isRTL: false };

      const { languageTag, isRTL } =
        RNLocalize.findBestLanguageTag(Object.keys(file)) || fallback;

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
        getZingoVersion(),
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
      if (settings.server) {
        // Offline has no chain. Normalize any residual chainName to the empty
        // sentinel so a stale value never reaches the wallet open (the real
        // chain is derived from the wallet). Persist it only when we actually
        // cleared a residual, so we don't rewrite on every boot.
        const residual =
          settings.server.kind === 'offline' &&
          settings.server.chainName !== ChainNameEnum.noneChainName;
        const normalizedServer = residual
          ? offlineServer(ChainNameEnum.noneChainName)
          : settings.server;
        setServer(normalizedServer);
        setSelectServer(settings.selectServer);
        if (residual) {
          await SettingsFileImpl.writeServer(
            normalizedServer,
            settings.selectServer,
          );
        }
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

      let sort: boolean = false;
      let ab = await AddressBookFileImpl.readAddressBook();

      // dropping the obsolete `Zenny Tips` contact wherever it is still stored.
      const zennyTips: AddressBookFileClass[] = ab.filter(
        (a: AddressBookFileClass) =>
          a.address === OBSOLETE_ZENNY_TIPS_ADDRESS &&
          OBSOLETE_ZENNY_TIPS_LABELS.includes(a.label),
      );
      for (const a of zennyTips) {
        ab = await AddressBookFileImpl.removeAddressBookItem(
          a.label,
          a.address,
        );
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
      // Audit Issue K — do not log the toUpdate array (contains labels +
      // addresses from the user's address book).
      console.log('Address Book items', ab.length);
      if (toUpdate.length > 0) {
        const randomColors = Utils.generateColorList(toUpdate.length);
        for (let i = 0; i < toUpdate.length; i++) {
          const a = toUpdate[i];
          let own: boolean;
          if (!a.hasOwnProperty('own')) {
            // verify this address as own or not
            own = await isWalletAddress(a.address);
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
        if (toUpdate.length > 0) {
          for (let i = 0; i < toUpdate.length; i++) {
            const a = toUpdate[i];
            // verify this address as own or not
            const own = await isWalletAddress(a.address);
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
      // Multi-chain migration (first boot with the feature): stamp `swapChain`
      // and `chain` on any entry that predates them. Existing contacts are all
      // Zcash → swapChain 'ZEC'; the Zcash network is read from the address
      // itself via parseAddress (main/test/regtest), defaulting to mainnet.
      if (
        ab.some(
          (a: AddressBookFileClassObsolete) =>
            !a.hasOwnProperty('swapChain') || !a.hasOwnProperty('chain'),
        )
      ) {
        const migrated: AddressBookFileClass[] = [];
        for (const a of ab as AddressBookFileClassObsolete[]) {
          if (a.hasOwnProperty('swapChain') && a.hasOwnProperty('chain')) {
            migrated.push(a as AddressBookFileClass);
            continue;
          }
          let chain: ChainNameEnum = ChainNameEnum.mainChainName;
          try {
            const parseResult = await parseAddress(a.address);
            if (parseResult.ok) {
              const parsed = JSON.parse(parseResult.value);
              if (parsed && parsed.chain_name) {
                chain = parsed.chain_name as ChainNameEnum;
              }
            }
          } catch {
            // unparseable address → keep the mainnet default
          }
          migrated.push({
            ...(a as AddressBookFileClass),
            swapChain: GlobalConst.zecSwapChain,
            chain,
          });
        }
        ab = migrated;
        sort = true;
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
        biometricGate={{ kind: 'passed' }}
      />
    );
  } else {
    return (
      <LoadedAppClass
        {...props}
        navigationApp={props.navigation}
        theme={theme}
        translate={translate}
        setI18nLocale={(locale: string) => {
          // Mutate the shared i18n instance AND lift `language` to the
          // outer state so `translate` (memoized on language) is rebuilt
          // — this is what makes the in-place language switch propagate
          // without a `navigateToLoadingApp` reset.
          i18n.locale = locale;
          setLanguage(locale as LanguageEnum);
        }}
        language={language}
        server={server}
        privacy={privacy}
        backgroundSyncInfo={backgroundSyncInfo}
        readOnly={readOnly}
        orchardPool={orchardPool}
        saplingPool={saplingPool}
        transparentPool={transparentPool}
        addressBook={addressBook}
        biometrics={biometrics}
        selectServer={selectServer}
        walletChainName={walletChainName}
        firstLaunchingMessage={firstLaunchingMessage}
        performanceLevel={performanceLevel}
        blockExplorer={blockExplorer}
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
  // Mutates the i18n instance's active locale. Needed so language changes
  // applied without remounting LoadedApp (reset=false in setLanguageOption)
  // still take effect immediately for snackbars and any RPC error text
  // produced after the change.
  setI18nLocale: (locale: string) => void;
  theme: AppTheme;
  language: LanguageEnum;
  server: ServerType;
  privacy: boolean;
  backgroundSyncInfo: BackgroundType;
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  addressBook: AddressBookFileClass[];
  biometrics: boolean;
  selectServer: SelectServerEnum;
  walletChainName: ChainNameEnum;
  firstLaunchingMessage: LaunchingModeEnum;
  performanceLevel: RPCPerformanceLevelEnum;
  blockExplorer: BlockExplorerEnum;
};

type LoadedAppClassState = AppStateLoaded & AppContextLoaded;

const renderTabBar = (
  props: import('@react-navigation/bottom-tabs').BottomTabBarProps,
) => <CustomTabBar {...props} />;

export class LoadedAppClass extends Component<
  LoadedAppClassProps,
  LoadedAppClassState
> {
  rpc: WalletBackend;
  recoveringServer: boolean = false;
  appstate: NativeEventSubscription;
  linking: EmitterSubscription;
  unsubscribeNetInfo: NetInfoSubscription;
  addTagModalRef: React.RefObject<React.ComponentRef<
    typeof BottomSheetModal
  > | null>;
  screenName = ScreenEnum.LoadedApp;
  private drawerNav: NativeStackNavigationProp<AppDrawerParamList> | null =
    null;
  // The per-instance controller store. Holds the view slice, the sync slice,
  // and the price slice: the class publishes each field here and the derived
  // atoms gate re-renders to the slice that actually changed.
  private controllerStore = createStore();
  // The callback-boundary epoch this instance was wired under. Every
  // backend-callback write carries it; componentWillUnmount bumps the store's
  // epoch past it, so a callback resolving after teardown drops.
  private boundaryEpoch = this.controllerStore.get(callbackEpochAtom);
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
      launchAddTagModal: this.launchAddTagModal,
      shieldingAmount: 0,
      showSwipeableIcons: true,
      doRefresh: this.doRefresh,
      setZecPrice: this.setZecPrice,
      zingolibVersion: '',
      setPrivacyOption: this.setPrivacyOption,

      // context settings
      server: props.server,
      language: props.language,
      privacy: props.privacy,
      biometrics: props.biometrics,
      selectServer: props.selectServer,
      walletChainName: props.walletChainName,
      performanceLevel: props.performanceLevel,
      blockExplorer: props.blockExplorer,

      mixnetView: INITIAL_MIXNET_VIEW,
      reenableMixnet: this.reenableMixnet,

      // state
      pendingServer: { kind: 'none' },
      scrollToTop: false,
      scrollToBottom: false,
    };

    this.rpc = new WalletBackend({
      onBalanceChanged: this.setTotalBalance,
      onValueTransfersChanged: this.setValueTransfersList,
      onMessagesChanged: this.setMessagesList,
      onAddressesChanged: this.setAllAddresses,
      onInfoChanged: this.setInfo,
      onSyncStatusChanged: this.setSyncingStatus,
      keepAwake: this.keepAwake,
      onZingolibVersionChanged: this.setZingolibVersion,
      onBirthdayChanged: this.setBirthday,
      onError: this.setLastError,
      onPersistentSyncFailure: this.recoverServer,
      onMixnetViewChanged: this.setMixnetView,
      startMixnetTransport: startMixnetTransport,
      stopMixnetTransport: stopMixnetTransport,
      mixnetSupported: true,
      readOnly: props.readOnly,
      server: props.server,
      performanceLevel: props.performanceLevel,
    });

    this.appstate = {} as NativeEventSubscription;
    this.linking = {} as EmitterSubscription;
    this.unsubscribeNetInfo = {} as NetInfoSubscription;
    this.addTagModalRef = React.createRef();
    this.controllerStore.set(
      syncMachineAtom,
      initialMachine(nativeUri(props.server)),
    );
    this.controllerStore.set(
      appStateStatusAtom,
      Platform.OS === GlobalConst.platformOSios
        ? AppStateStatusEnum.active
        : (AppState.currentState as AppStateStatusEnum),
    );
    this.publishWalletView();
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
        showConfirm({
          title: `${this.state.translate('loadedapp.migration-title')} v:${version}`,
          message: this.state.translate('loadedapp.migration-body') as string,
          buttons: [{ text: this.state.translate('close') as string }],
        });
      }
    }

    // Configure the RPC to start doing refreshes
    await this.rpc.clearTimers();
    await this.rpc.configure();

    // ZIP 318: classify the private migration's parts on every launch and
    // apply what is safe unattended (promotions, expiries, rebuilds,
    // completion). Never syncs, offline-safe, a no-op without a migration.
    // The app-facing actions need no handling here: the History banner reads
    // migration_status on focus and routes the user to the right screen.
    // reconcileMigration never rejects (FfiResult); a transient failure just
    // defers the cleanup to the next launch.
    reconcileMigration();

    this.clearToAddr();

    this.appstate = AppState.addEventListener(
      EventListenerEnum.change,
      async nextAppState => {
        const prior = this.controllerStore.get(appStateStatusAtom);
        const next = nextAppState as AppStateStatusEnum;
        const transition = classifyLifecycle(Platform.OS, prior, next);
        if (transition === 'ignore') {
          return;
        }
        // The fg/bg edge writes the UI atom; the container never reads it, so
        // recording the status here does not re-render the container.
        this.controllerStore.set(appStateStatusAtom, next);
        if (transition === 'suspend') {
          await this.suspendForBackground();
        } else if (transition === 'resume') {
          // A parked earlier pass resumes with this same event and acts
          // once; a second concurrent actor would double-run the restore
          // work or the navigation reset.
          if (this.foregroundGateBusy) {
            return;
          }
          this.foregroundGateBusy = true;
          try {
            await this.runForegroundGate();
          } finally {
            this.foregroundGateBusy = false;
          }
        }
      },
    );

    const initialUrl = await Linking.getInitialURL();
    console.log('Received initial deep link URI');
    if (initialUrl !== null) {
      await this.readUrl(initialUrl);

      // Nested navigate: HomeStack hosts the tab navigator; jump to the
      // Send tab. Cast through `any` because AppDrawerParamList doesn't
      // declare HomeStack's nested-screen params (would require
      // refactoring to NavigatorScreenParams).
      (this.drawerNav?.navigate as (...args: unknown[]) => void)?.(
        RouteEnum.HomeStack,
        { screen: RouteEnum.Send },
      );
    }

    this.linking = Linking.addEventListener(
      EventListenerEnum.url,
      async ({ url }) => {
        console.log('Received deep link URI event');
        if (url !== null) {
          await this.readUrl(url);
        }

        (this.drawerNav?.navigate as (...args: unknown[]) => void)?.(
          RouteEnum.HomeStack,
          { screen: RouteEnum.Send },
        );
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

  // The single suspend path, driven by the fg/bg listener's `suspend`
  // outcome. Pause the sync tasks, blank the live status, and save so a
  // background kill cannot lose the last synced chunk.
  private suspendForBackground = async () => {
    await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
    await this.rpc.clearTimers();
    this.setSyncingStatus({} as RPCSyncStatusType);
    await doSave();
  };

  // Sync the externally-rebuilt `translate` (the outer functional
  // LoadedApp rebuilds its memoized translate on every language change)
  // into `state.translate`. Without this, memoized children whose
  // useMemo / React.memo deps include `translate` (notably the
  // OptionsPanel grid built in LoadedAppOptionsPanelHost) keep the
  // identity-stable closure captured at mount and render in the old
  // language.
  componentDidUpdate = (prevProps: LoadedAppClassProps) => {
    if (prevProps.translate !== this.props.translate) {
      this.setState({ translate: this.props.translate });
    }
    this.publishWalletView();
  };

  foregroundGateBusy = false;

  // (PIN or TouchID or FaceID). Only a decline locks; a gate that cannot
  // run fails open with a notice (ADR 0007), because blocking would trap
  // the user out of the wallet.
  runForegroundGate = async () => {
    const foregroundGate: GateAnswer = await resolveTriggerGate(
      undefined,
      this.state.biometrics,
      { translate: this.state.translate },
    );
    const proceed = enactGateAnswer(
      foregroundGate,
      {
        // The narrowed answer is the gate outcome, whole; the locked
        // screen never reads mutable module state.
        lock: declined =>
          this.navigateToLoadingApp({
            startingApp: true,
            biometricGate: declined,
          }),
        notice: this.addLastSnackbar,
      },
      this.state.translate,
    );
    if (!proceed) {
      return;
    }
    // The gate is open: this, never the raw AppState event, is when a
    // real return may emit price traffic.
    priceFetcherStore.foregroundReturned();
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
      (this.state.backgroundError.title || this.state.backgroundError.error)
    ) {
      showConfirm({
        title: this.state.backgroundError.title,
        message: this.state.backgroundError.error,
        buttons: [{ text: this.state.translate('close') as string }],
      });
      this.setBackgroundError('', '');
    }
  };

  componentWillUnmount = async () => {
    // Close the async-unmount gap: bump the callback-boundary epoch
    // synchronously, before the awaits below, so a backend callback that fires
    // while teardown is in flight drops its write; it cannot reach this
    // dead instance.
    this.controllerStore.set(callbackEpochAtom, this.boundaryEpoch + 1);
    await this.rpc.clearTimers();
    this.rpc.stopMixnetPolling();
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
      const parsed = await parseZcashURI(url, this.state.server);

      // Audit Issue H — surface the parser error and abort before any
      // Send-state mutation. A failure result carries no target, so a
      // malformed URI cannot reach the state updates below.
      if (parsed.kind === 'error') {
        this.addLastSnackbar(
          Utils.renderErrorKeyed(parsed, this.state.translate),
        );
        return;
      }

      const target = parsed.target;
      if (target) {
        let update = false;
        if (
          this.state.sendPageState.toaddr.to &&
          target.address &&
          this.state.sendPageState.toaddr.to !== target.address
        ) {
          await ShowAddressAlertAsync(this.state.translate)
            .then(async () => {
              // fill the fields in the screen with the target data
              update = true;
            })
            .catch((e: unknown) => {
              // user cancelled the alert — expected, log unexpected errors
              if (e && (e as Error).message !== 'cancelled') {
                console.log('ShowAddressAlert unexpected error', e);
              }
            });
        } else if (target.address) {
          // fill the fields in the screen with the target data
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
    }
  };

  fetchBackgroundSyncInfo = async () => {
    const backgroundSyncInfoJson: BackgroundType =
      await BackgroundFileImpl.readBackground();
    this.commitPatch({ backgroundSyncInfo: backgroundSyncInfoJson });
  };

  setBackgroundSyncErrorInfo = async (error: string) => {
    const newBackgroundSyncInfo = { ...this.state.backgroundSyncInfo, error };
    this.setState({ backgroundSyncInfo: newBackgroundSyncInfo });
    await BackgroundFileImpl.writeBackground(newBackgroundSyncInfo);
  };

  // Run a backend-callback write through the boundary guard: it lands only while
  // this instance's wiring epoch is still current, so a callback resolving after
  // teardown drops; it cannot setState a dead instance.
  private commit = (write: () => void) => {
    this.controllerStore.set(boundaryDispatchAtom, {
      issuedEpoch: this.boundaryEpoch,
      write,
    });
  };

  // Commits the patch through the boundary guard when it alters container state.
  private commitPatch = <K extends keyof LoadedAppClassState>(
    patch: Pick<LoadedAppClassState, K>,
  ) => {
    this.commit(() => {
      if (changes(this.state, patch)) {
        this.setState(patch);
      }
    });
  };

  setShieldingAmount = (value: number) => {
    //const start = Date.now();
    this.setState({ shieldingAmount: value });
  };

  setShowSwipeableIcons = (value: boolean) => {
    this.setState({ showSwipeableIcons: value });
  };

  setTotalBalance = (totalBalance: TotalBalanceClass) => {
    this.commitPatch({ totalBalance });
  };

  setSyncingStatus = (syncingStatus: RPCSyncStatusType) => {
    // here is a good place to fetch the background task info
    this.fetchBackgroundSyncInfo();
    const store = this.controllerStore;
    if (isEqual(store.get(syncStatusAtom), syncingStatus)) {
      return;
    }
    // The sync slice, isolated: publish the detailed snapshot the two sync
    // consumers read, and route it through reconcile so the held machine tracks
    // the live scan. Neither wakes the wider context tree.
    store.set(syncStatusAtom, syncingStatus);
    const machine = store.get(syncMachineAtom);
    store.set(
      observeAtom,
      snapshotObservation(machine.epoch, machine.saveRequired, syncingStatus),
    );
  };

  setIsSeedViewModalOpen = (value: boolean) => {
    this.controllerStore.set(seedModalOpenAtom, value);
  };

  setMixnetView = (mixnetView: MixnetView) => {
    this.commitPatch({ mixnetView });
  };

  reenableMixnet = async (): Promise<void> => {
    await this.rpc.reenableMixnet();
  };

  setValueTransfersList = async (
    valueTransfers: ValueTransferType[],
    valueTransfersTotal: number,
  ) => {
    if (changes(this.state, { valueTransfers, valueTransfersTotal })) {
      // set somePending as well here when I know there is something new in ValueTransfers
      const pending: number =
        valueTransfersTotal > 0
          ? valueTransfers
              .filter(
                (vt: ValueTransferType) =>
                  vt.status !== RPCValueTransfersStatusEnum.failed,
              )
              .filter(
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
              } else if (vtNew[0].kind === ValueTransferKindEnum.Migration) {
                // Orchard -> Ironwood migration: report the migrated amount
                // (surfaced via the value-transfer `value`) plus the fee paid.
                message =
                  (this.state.translate(
                    'loadedapp.valuetransfer-confirmed',
                  ) as string) +
                  (this.state.translate('history.migration') as string) +
                  (vtNew[0].amount > 0
                    ? ' ' +
                      Utils.parseNumberFloatToStringLocale(vtNew[0].amount, 8) +
                      ' ' +
                      this.state.info.currencyName
                    : '') +
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
          this.commit(() =>
            this.setState({
              valueTransfers,
              somePending: pending > 0,
              valueTransfersTotal,
            }),
          );
        },
        pending === 0 ? 250 : 0,
      );
      //  '=========================================== > VALUE TRANSFERS STORED SETSTATE - ',
      //  Date.now() - start,
      //);
    }
  };

  setMessagesList = (messages: ValueTransferType[], messagesTotal: number) => {
    this.commitPatch({ messages, messagesTotal });
  };

  setAllAddresses = (
    addresses: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => {
    this.commitPatch({
      addresses,
      defaultUnifiedAddress: lastUnified(addresses),
    });
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
    this.commitPatch({ zecPrice });
  };

  setInfo = (newInfo: InfoType) => {
    // Offline (or any info-fetch failure) leaves chainName/currencyName empty.
    // Derive them from the WALLET's own chain (walletChainName) — reliable
    // even Offline — rather than the server's chain, which in Offline mode is
    // only the user's onboarding pick and may not match the wallet (e.g. a
    // mainnet wallet opened while Testnet was left selected showed TAZ).
    // noneChainName is '' (falsy), so `|| server.chainName` covers the
    // unknown-wallet-chain case without an explicit noneChainName check.
    const fallbackChain =
      this.state.walletChainName || this.state.server.chainName;
    // if currencyName is empty,
    // I need to rescue the last value from the state,
    // or rescue the value from the wallet/server chain.
    if (!newInfo.currencyName) {
      if (this.state.info.currencyName) {
        newInfo.currencyName = this.state.info.currencyName;
      } else {
        newInfo.currencyName =
          fallbackChain === ChainNameEnum.mainChainName
            ? CurrencyNameEnum.ZEC
            : CurrencyNameEnum.TAZ;
      }
    }
    if (!newInfo.chainName) {
      newInfo.chainName = fallbackChain;
    }
    if (!newInfo.serverUri) {
      newInfo.serverUri = nativeUri(this.state.server);
    }
    this.commitPatch({ info: newInfo });
  };

  setZingolibVersion = (newZingolibVersion: string) => {
    this.commitPatch({
      zingolibVersion: this.state.zingolibVersion || newZingolibVersion,
    });
  };

  sendTransaction = async (
    sendPageState: SendPageStateClass,
    sendAll: boolean = false,
  ): Promise<String> => {
    try {
      // Construct a sendJson from the sendPage state
      const { defaultUnifiedAddress } = this.state;
      const sendJson = await Utils.getSendManyJSON(
        sendPageState,
        defaultUnifiedAddress,
      );
      //const start = Date.now();
      const txid = await this.rpc.sendTransaction(sendJson, sendAll);

      return txid;
    } catch (err) {
      throw err;
    }
  };

  doRefresh = (screen: ScreenEnum) => {
    if (screen === ScreenEnum.History) {
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
    this.commitPatch({ birthday });
  };

  onMenuItemSelected = async (item: MenuItemEnum) => {
    // Depending on the menu item, open the appropriate screen
    if (item === MenuItemEnum.About) {
      this.drawerNav?.navigate(RouteEnum.About);
      return;
    } else if (item === MenuItemEnum.Rescan) {
      this.drawerNav?.navigate(RouteEnum.Rescan);
      return;
    } else if (item === MenuItemEnum.SyncReport) {
      this.drawerNav?.navigate(RouteEnum.SyncReport);
      return;
    } else if (item === MenuItemEnum.FundPools) {
      this.drawerNav?.navigate(RouteEnum.Pools);
      return;
    } else if (item === MenuItemEnum.Insight) {
      this.drawerNav?.navigate(RouteEnum.Insight);
      return;
    } else if (item === MenuItemEnum.WalletSeedUfvk) {
      if (this.state.readOnly) {
        this.drawerNav?.navigate(RouteEnum.Ufvk, {
          action: UfvkActionEnum.view,
        });
      } else {
        this.drawerNav?.navigate(RouteEnum.Seed, {
          action: SeedActionEnum.view,
        });
      }
      return;
    } else if (item === MenuItemEnum.ChangeWallet) {
      if (this.state.readOnly) {
        this.drawerNav?.navigate(RouteEnum.Ufvk, {
          action: UfvkActionEnum.change,
        });
      } else {
        this.drawerNav?.navigate(RouteEnum.Seed, {
          action: SeedActionEnum.change,
        });
      }
      return;
    } else if (item === MenuItemEnum.RestoreWalletBackup) {
      if (this.state.readOnly) {
        this.drawerNav?.navigate(RouteEnum.Ufvk, {
          action: UfvkActionEnum.backup,
        });
      } else {
        this.drawerNav?.navigate(RouteEnum.Seed, {
          action: SeedActionEnum.backup,
        });
      }
      return;
    } else if (item === MenuItemEnum.Settings) {
      // Bio gate for settingsScreen lives at the Settings screen entry
      // (screens/Settings/Settings.tsx).
      this.drawerNav?.navigate(RouteEnum.Settings);
      return;
    } else if (item === MenuItemEnum.AddressBook) {
      this.drawerNav?.navigate(RouteEnum.AddressBook);
      return;
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
  ): Promise<SetServerResult> => {
    // The server is changing — stop the ongoing sync tasks before touching
    // anything else.
    await this.rpc.clearTimers();
    this.setSyncingStatus({} as RPCSyncStatusType);
    this.keepAwake(false);

    // Caller pre-detected a chain change (`sameServerChainName === false`).
    // We can't open the existing wallet against a different chain; stash
    // the desired server in state so the recovery screen can pick it up,
    // restore the previous server, and signal `chain-changed` so the
    // caller navigates to Seed/Ufvk recovery. We deliberately do NOT
    // navigate from here — navigation policy lives in the caller now.
    if (!sameServerChainName) {
      const oldSettings = await SettingsFileImpl.readSettings();
      await changeServer(nativeUri(oldSettings.server));
      this.setState({
        pendingServer: { kind: 'pending', server: value, selectServer },
        server: oldSettings.server,
        selectServer: oldSettings.selectServer,
      });
      if (toast) {
        this.addLastSnackbar(
          `${this.state.translate('loadedapp.readingwallet-error')} ${nativeUri(value)}`,
        );
      }
      return { kind: 'chain-changed' };
    }

    // Same chain — try to open the wallet on the new server.
    const result = await loadExistingWallet(
      nativeUri(value),
      value.chainName,
      this.state.performanceLevel,
      GlobalConst.minConfirmations.toString(),
    );

    let openError: string | null = null;
    if (!result.ok) {
      openError = result.error.message;
    } else if (!result.value) {
      openError = 'loadExistingWallet returned empty';
    } else {
      try {
        // `resultJson` may carry an `error` field for watch-only wallets,
        // which is actually fine — we treat it as success.
        const resultJson: RPCSeedType & RPCUfvkType = JSON.parse(result.value);
        if (resultJson.error) {
          openError = String(resultJson.error);
        }
      } catch (e) {
        openError = (e as Error).message ?? 'JSON parse error';
      }
    }

    if (openError === null) {
      // Success path.
      if (toast && value.kind === 'remote') {
        this.addLastSnackbar(
          `${this.state.translate('loadedapp.readingwallet')} ${value.uri}`,
        );
      }
      await SettingsFileImpl.writeServer(value, selectServer);
      this.setState({
        server: value,
        selectServer: selectServer,
      });
      // Propagate the new server into WalletBackend so sub-services
      // (DataService etc.) stop using the URI captured at construction.
      this.rpc.setServer(value);
      await this.rpc.clearTimers();
      await this.rpc.configure();
      return { kind: 'ok' };
    }

    // Same chain but wallet open failed (RPC blip, network, JSON parse).
    // Restore the previous server and surface the error to the caller via
    // the result. NO navigation — the previous heavy-handed jump to
    // Seed/Ufvk on any RPC blip was the root cause of the "Settings save
    // sometimes doesn't apply" reports.
    const oldSettings = await SettingsFileImpl.readSettings();
    await changeServer(nativeUri(oldSettings.server));
    this.setState({
      server: oldSettings.server,
      selectServer: oldSettings.selectServer,
    });
    if (toast) {
      this.addLastSnackbar(
        `${this.state.translate('loadedapp.readingwallet-error')} ${nativeUri(value)}`,
      );
    }
    return {
      kind: 'error',
      message: Utils.humanizeChainTokens(openError, this.state.translate),
    };
  };

  // Dials each candidate in order and activates the first that connects.
  activateReachableServer = async (
    candidates: ServerUrisType[],
  ): Promise<boolean> => {
    for (const candidate of candidates) {
      if (!candidate.uri) {
        continue;
      }
      const next = remoteServer(candidate.uri, candidate.chainName);
      // Cap each dial: a dead candidate's changeServer can otherwise block for
      // minutes (see checkServerURI), stalling the whole rotation.
      const changed = await Promise.race([
        changeServer(candidate.uri).then(result => result.ok),
        new Promise<boolean>(resolve =>
          setTimeout(() => resolve(false), 15_000),
        ),
      ]);
      if (!changed) {
        continue;
      }
      await SettingsFileImpl.writeServer(next, this.state.selectServer);
      this.setState({ server: next });
      this.rpc.setServer(next);
      this.addLastSnackbar(
        `${this.state.translate('loadedapp.selectingserverbest') as string} ${candidate.uri}`,
        SnackbarDurationEnum.long,
      );
      return true;
    }
    return false;
  };

  // The runtime half of the old boot-time server rescue: after repeated
  // sync-launch failures, silently activate a working server (live registry
  // first, then the static list by latency) and reattach the client to it.
  // Custom and offline modes are exempt: custom users opted out of automatic
  // selection (Audit Issue S) and offline has no server at all.
  recoverServer = async (): Promise<void> => {
    const current = this.state.server;
    if (
      this.recoveringServer ||
      !this.state.netInfo.isConnected ||
      current.kind === 'offline' ||
      (this.state.selectServer !== SelectServerEnum.auto &&
        this.state.selectServer !== SelectServerEnum.list)
    ) {
      return;
    }
    this.recoveringServer = true;
    try {
      const live = (await fetchServerList(current.chainName)).filter(
        (s: ServerUrisType) => s.uri !== current.uri,
      );
      if (await this.activateReachableServer(live)) {
        return;
      }
      const fallback = await selectingServer(
        serverUris(this.state.translate).filter(
          (s: ServerUrisType) =>
            !s.obsolete &&
            s.chainName === current.chainName &&
            s.uri !== current.uri,
        ),
      );
      if (fallback) {
        await this.activateReachableServer([fallback]);
      }
    } finally {
      this.recoveringServer = false;
    }
  };

  setLanguageOption = async (value: string): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.language, value);
    this.setState({
      language: value as LanguageEnum,
    });
    // The shared i18n instance is mutated AND the outer LoadedApp's
    // `language` state is bumped (see setI18nLocale wiring), which
    // rebuilds the memoized `translate`. Memoized children with
    // `translate` in their deps then re-evaluate with the new locale —
    // no full remount needed.
    this.props.setI18nLocale(value);
  };

  setPrivacyOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.privacy, value);
    this.setState({
      privacy: value as boolean,
    });
  };

  setBiometricsOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.biometrics, value);
    this.setState({ biometrics: value });
  };

  setSelectServerOption = async (value: SelectServerEnum): Promise<void> => {
    await SettingsFileImpl.writeServer(this.state.server, value);
    this.setState({ selectServer: value });
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
    // Propagate the new performance level into the shared WalletBackend
    // config so SyncCoordinator's runTaskPromises doesn't see a diff
    // between zingolib (which we set below) and the stale config and
    // silently revert the user's choice on the next poll.
    this.rpc.setPerformanceLevel(value);

    // change it in zingolib as well. Use `value` directly — `setState`
    // above is async, so `this.state.performanceLevel` here is still the
    // OLD value at this point in the same event handler.
    const setConfigWallet = await setConfigWalletToProd(
      value,
      GlobalConst.minConfirmations.toString(),
    );
    // Audit Issue K — do not log the setConfigWallet response; on actual
    // failure it is propagated via setLastError below.
    if (!setConfigWallet.ok) {
      this.setLastError(
        `Set performance level error: ${setConfigWallet.error.message}`,
      );
    }
  };

  setBlockExplorerOption = async (value: BlockExplorerEnum): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.blockExplorer, value);
    this.setState({
      blockExplorer: value as BlockExplorerEnum,
    });
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
    // Back up any MAINNET wallet being abandoned. The decision keys on the
    // WALLET's own chain (walletChainName), not the server's — Offline has no
    // server chain, yet a mainnet wallet must still be backed up when it is
    // left. Testnet/regtest are never backed up.
    const changed =
      this.state.walletChainName === ChainNameEnum.mainChainName
        ? await this.rpc.changeWallet() // backup
        : await this.rpc.changeWalletNoBackup(); // no backup

    if (changed.kind === 'error') {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadedapp.changingwallet-label') as string,
        this.state.translate(changed.errorKey) as string,
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
    const restored = await this.rpc.restoreBackup();

    if (restored.kind === 'error') {
      createAlert(
        this.setBackgroundError,
        this.addLastSnackbar,
        this.state.translate('loadedapp.restoringwallet-label') as string,
        this.state.translate(restored.errorKey) as string,
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
    const { pendingServer } = this.state;
    if (pendingServer.kind === 'pending') {
      // No `await` here so Promise.race can actually enforce the 15s cap.
      // With `await` the RPC call resolves before the race starts and the
      // timer becomes a no-op (a failing server then blocks ~minutes).
      const resultServerPromise = changeServer(nativeUri(pendingServer.server));
      const timeoutServerPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Promise changeserver Timeout 15 seconds'));
        }, 15 * 1000);
      });

      const resultServer = await Promise.race([
        resultServerPromise,
        timeoutServerPromise,
      ]);

      if (!resultServer.ok) {
        this.addLastSnackbar(
          `${this.state.translate('loadedapp.changeservernew-error')} ${resultServer.error.message}`,
        );
        return;
      }

      await SettingsFileImpl.writeServer(
        pendingServer.server,
        pendingServer.selectServer,
      );
      this.setState({
        server: pendingServer.server,
        selectServer: pendingServer.selectServer,
        pendingServer: { kind: 'none' },
      });
      // Propagate to WalletBackend's shared config so sub-services pick up
      // the new URI without needing the instance to be recreated.
      this.rpc.setServer(pendingServer.server);

      await this.rpc.fetchInfoAndServerHeight();

      // Back up any MAINNET wallet being abandoned — keyed on the WALLET's own
      // chain (walletChainName), not the server's, so a mainnet wallet left
      // while Offline still gets backed up. Testnet/regtest are not backed up.
      const changed =
        this.state.walletChainName === ChainNameEnum.mainChainName
          ? await this.rpc.changeWallet() // backup
          : await this.rpc.changeWalletNoBackup(); // no backup

      if (changed.kind === 'error') {
        createAlert(
          this.setBackgroundError,
          this.addLastSnackbar,
          this.state.translate('loadedapp.changingwallet-label') as string,
          this.state.translate(changed.errorKey) as string,
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
    this.commit(() => this.setState({ lastError: error }));
  };

  // Determines `own` via RPC, then opens the shared modal so the user can
  // attach a label without leaving their current screen. Used from AddressItem
  // anywhere an address is displayed with a tappable "+ contact" icon.
  launchAddTagModal = (
    address: string,
    swapChain: string = GlobalConst.zecSwapChain,
    initialLabel?: string,
  ) => {
    // Every launcher (Send, address rows) saves a recipient/destination,
    // i.e. a contact — never a label for one of the wallet's own addresses.
    // Tagging an own address is the Receive flow, which renders NewAddressTag
    // with own={true} directly. So this modal is always a contact (own=false),
    // "Add contact", not "Add tag".
    const prior = this.controllerStore.get(addTagModalAtom);
    this.controllerStore.set(addTagModalAtom, {
      kind: 'shown',
      launch: prior.kind === 'shown' ? prior.launch + 1 : 1,
      address,
      own: false,
      swapChain,
      initialLabel,
    });
    this.addTagModalRef.current?.present();
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
    navigationHome: NativeStackNavigationProp<AppDrawerParamList>,
  ) => {
    if (!this.drawerNav) {
      this.drawerNav = navigationHome;
    }
  };

  private publishWalletView = () => {
    const source: WalletViewSource = {
      readOnly: this.state.readOnly,
      server: this.state.server,
    };
    this.controllerStore.set(walletViewSourceAtom, source);
  };

  render() {
    const { scrollToTop, scrollToBottom } = this.state;

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
      launchAddTagModal: this.state.launchAddTagModal,
      shieldingAmount: this.state.shieldingAmount,
      restartApp: this.state.restartApp,
      somePending: this.state.somePending,
      showSwipeableIcons: this.state.showSwipeableIcons,
      doRefresh: this.state.doRefresh,
      setZecPrice: this.state.setZecPrice,
      zingolibVersion: this.state.zingolibVersion,
      setPrivacyOption: this.setPrivacyOption,

      // context settings
      server: this.state.server,
      language: this.state.language,
      privacy: this.state.privacy,
      biometrics: this.state.biometrics,
      selectServer: this.state.selectServer,
      walletChainName: this.state.walletChainName,
      performanceLevel: this.state.performanceLevel,
      blockExplorer: this.state.blockExplorer,
      mixnetView: this.state.mixnetView,
      reenableMixnet: this.reenableMixnet,
    };

    return (
      <Provider store={this.controllerStore}>
        <ContextAppLoadedProvider value={context}>
          <PriceTrafficDriver />
          <GestureHandlerRootView>
            <BottomSheetModalProvider>
              <BottomSheetBackHandler />
              <ConfirmBottomSheet />
              <OptionsPanelProvider>
                <LoadedAppOptionsPanelHost
                  onMenuItemSelected={this.onMenuItemSelected}
                  zingolibVersion={this.state.zingolibVersion}
                >
                  <RootNavigator initialRouteName={RouteEnum.HomeStack}>
                    <RootNavigator.Screen name={RouteEnum.HomeStack}>
                      {props => (
                        <HomeStackBody
                          navigation={props.navigation}
                          onHomeNavigation={this.setNavigationHome}
                          scrollToTop={scrollToTop}
                          setShieldingAmount={this.setShieldingAmount}
                          setScrollToTop={this.setScrollToTop}
                          setScrollToBottom={this.setScrollToBottom}
                          sendTransaction={this.sendTransaction}
                          setServerOption={this.setServerOption}
                          clearToAddr={this.clearToAddr}
                          setAddressBook={this.setAddressBook}
                        />
                      )}
                    </RootNavigator.Screen>
                    <RootNavigator.Screen name={RouteEnum.Settings}>
                      {props => (
                        <Settings
                          {...props}
                          setServerOption={this.setServerOption}
                          setLanguageOption={this.setLanguageOption}
                          setBiometricsOption={this.setBiometricsOption}
                          setSelectServerOption={this.setSelectServerOption}
                          setPerformanceLevelOption={
                            this.setPerformanceLevelOption
                          }
                          setBlockExplorerOption={this.setBlockExplorerOption}
                          toggleMenuDrawer={
                            () => toggleOptionsPanel() /* header */
                          }
                        />
                      )}
                    </RootNavigator.Screen>
                    <RootNavigator.Screen
                      name={RouteEnum.About}
                      component={About}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MixnetDoctor}
                      component={MixnetDoctor}
                    />
                    <RootNavigator.Screen name={RouteEnum.Rescan}>
                      {props => <Rescan {...props} doRescan={this.doRescan} />}
                    </RootNavigator.Screen>
                    <RootNavigator.Screen
                      name={RouteEnum.Insight}
                      component={Insight}
                    />
                    <RootNavigator.Screen name={RouteEnum.Ufvk}>
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
                    </RootNavigator.Screen>
                    <RootNavigator.Screen name={RouteEnum.Seed}>
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
                              setIsSeedViewModalOpen={
                                this.setIsSeedViewModalOpen
                              }
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
                    </RootNavigator.Screen>
                    <RootNavigator.Screen
                      name={RouteEnum.SyncReport}
                      component={SyncReport}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.Pools}
                      component={Pools}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MeetIronwood}
                      component={MeetIronwood}
                      // One-way onboarding: no swipe-back to the screen behind
                      // it; the screen closes by resetting the stack to Home.
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationStrategy}
                      component={MigrationStrategy}
                      // Continues the one-way onboarding flow; back is handled
                      // in-screen, not by swipe.
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationTransactions}
                      component={MigrationTransactions}
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationSending}
                      component={MigrationSending}
                      // The drain broadcasts here and can't be interrupted;
                      // swipe-back is off and hardware-back is blocked in-screen.
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationSplitPlan}
                      component={MigrationSplitPlan}
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationSplitting}
                      component={MigrationSplitting}
                      // Splitting rounds broadcast here and can't be
                      // interrupted; swipe-back off, hardware-back blocked
                      // in-screen.
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationCadence}
                      component={MigrationCadence}
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationSchedule}
                      component={MigrationSchedule}
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationStatus}
                      component={MigrationStatus}
                      // Reached by reset (post-confirm) and by the banner; its
                      // own "Back to wallet" resets home, so swipe-back off.
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.MigrationBatchSending}
                      component={MigrationBatchSending}
                      // The batch broadcasts here and can't be interrupted;
                      // swipe-back is off and hardware-back is blocked in-screen.
                      options={{ gestureEnabled: false }}
                    />
                    <RootNavigator.Screen name={RouteEnum.AddressBook}>
                      {props => (
                        <AddressBook
                          {...props}
                          setAddressBook={this.setAddressBook}
                        />
                      )}
                    </RootNavigator.Screen>
                    <RootNavigator.Screen
                      name={RouteEnum.ValueTransferDetail}
                      component={ValueTransferDetail}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.AddressList}
                      component={AddressList}
                    />
                    <RootNavigator.Screen name={RouteEnum.Messages}>
                      {props => (
                        <MessageList
                          {...props}
                          toggleMenuDrawer={() => toggleOptionsPanel()}
                          closeScreen={() => props.navigation.goBack()}
                          setScrollToBottom={this.setScrollToBottom}
                          scrollToBottom={scrollToBottom}
                        />
                      )}
                    </RootNavigator.Screen>
                    <RootNavigator.Screen
                      name={RouteEnum.Confirm}
                      component={Confirm}
                    />
                    <RootNavigator.Screen
                      name={RouteEnum.Computing}
                      component={ComputingTxContent}
                    />
                  </RootNavigator>
                </LoadedAppOptionsPanelHost>
              </OptionsPanelProvider>
              <AddTagModalSlice
                ref={this.addTagModalRef}
                setAddressBook={this.setAddressBook}
                translate={this.state.translate}
              />
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </ContextAppLoadedProvider>
        <Toast config={toastConfig} />
      </Provider>
    );
  }
}

type AddTagModalSliceProps = Omit<
  React.ComponentProps<typeof AddTagModalHost>,
  'target'
>;

// The add-tag modal, isolated. It reads its target from addTagModalAtom, so
// launchAddTagModal writes the atom and opening the sheet wakes only that atom's
// readers, without committing container state or re-rendering the context tree.
// The ref forwards to the underlying modal, and the container presents it.
const AddTagModalSlice = forwardRef<
  React.ComponentRef<typeof BottomSheetModal>,
  AddTagModalSliceProps
>(function AddTagModalSlice({ setAddressBook, translate }, ref) {
  const modal = useAtomValue(addTagModalAtom);
  return (
    <AddTagModalHost
      ref={ref}
      target={modal}
      setAddressBook={setAddressBook}
      translate={translate}
    />
  );
});

type HomeStackBodyProps = {
  navigation: NativeStackNavigationProp<AppDrawerParamList>;
  onHomeNavigation: LoadedAppClass['setNavigationHome'];
  scrollToTop: boolean;
} & Pick<
  LoadedAppClass,
  | 'setShieldingAmount'
  | 'setScrollToTop'
  | 'setScrollToBottom'
  | 'sendTransaction'
  | 'setServerOption'
  | 'clearToAddr'
  | 'setAddressBook'
>;

// The view slice, isolated. It reads its outcome from walletViewAtom, so a
// change to an unread container field wakes no re-render here; a memo boundary
// over stable props stops the container's own commit from cascading in. The
// setNavigationHome effect keys on `navigation`, so it runs once, not on every
// commit.
const HomeStackBody = memo(function HomeStackBody({
  navigation,
  onHomeNavigation,
  scrollToTop,
  setShieldingAmount,
  setScrollToTop,
  setScrollToBottom,
  sendTransaction,
  setServerOption,
  clearToAddr,
  setAddressBook,
}: HomeStackBodyProps) {
  const view = useAtomValue(walletViewAtom);

  useEffect(() => {
    onHomeNavigation(navigation);
  }, [navigation, onHomeNavigation]);

  const showSend = view === 'fullWithSend';
  return (
    <Tab.Navigator
      detachInactiveScreens={true}
      initialRouteName={RouteEnum.History}
      backBehavior="initialRoute"
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name={RouteEnum.History}>
        {propsTab => (
          <History
            {...propsTab}
            toggleMenuDrawer={() => toggleOptionsPanel() /* header */}
            setShieldingAmount={setShieldingAmount /* header */}
            setScrollToTop={setScrollToTop /* header & history */}
            scrollToTop={scrollToTop /* history */}
            setScrollToBottom={setScrollToBottom /* header & messages */}
          />
        )}
      </Tab.Screen>
      {showSend && (
        <Tab.Screen name={RouteEnum.Send}>
          {propsTab => (
            <Send
              {...propsTab}
              toggleMenuDrawer={() => toggleOptionsPanel() /* header */}
              setShieldingAmount={setShieldingAmount /* header */}
              setScrollToTop={setScrollToTop /* header & send */}
              setScrollToBottom={setScrollToBottom /* header & send */}
              sendTransaction={sendTransaction /* send */}
              setServerOption={setServerOption /* send */}
              clearToAddr={clearToAddr /* send */}
            />
          )}
        </Tab.Screen>
      )}
      <Tab.Screen name={RouteEnum.Receive}>
        {propsTab => (
          <Receive
            {...propsTab}
            toggleMenuDrawer={() => toggleOptionsPanel() /* header */}
            alone={false /* receive */}
            setAddressBook={setAddressBook}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
});
