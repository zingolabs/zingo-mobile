import React, { Component, useState, useMemo, useEffect } from 'react';
import {
  I18nManager,
  AppState,
  NativeEventSubscription,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@app/theme';
import { I18n } from 'i18n-js';
import * as RNLocalize from 'react-native-localize';
import { defaultTo, isEqual } from 'lodash';
import { LoadingSession, useSession } from '@app/navigation/session';
import {
  isOnTop,
  navigateWallet,
  popRoutes,
  resetWalletRoutes,
} from '@app/navigation/navigate';
import { walletErrorKind } from '@app/LoadingApp/walletErrorKind';
import { LoadedAppNavigationState } from '@app/types';
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
  claimClient,
  doSave,
  isWalletAddress,
  loadExistingWallet,
  loadWallet,
  deleteWallet,
  createNewWallet,
  restoreWalletFromSeed,
  restoreWalletFromUfvk,
  recordOpenFailed,
  updateWalletMeta,
  walletsOnDevice,
  parseAddress,
  cancelOldPrivateMigration,
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
  SetServerResult,
  AddressBookFileClass,
  LanguageEnum,
  SelectServerEnum,
  ChainNameEnum,
  SettingsNameEnum,
  Route,
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
  LaunchingModeEnum,
  BlockExplorerEnum,
  SnackbarDurationEnum,
  SnackbarActionType,
} from '@app/AppState';
import Utils from '@app/utils';
import {
  formatAmount,
  formatInteger,
  toAmountInput,
} from '@app/utils/formatAmount';
import {
  getZingoVersion,
  substituteCurrency,
  substituteZingoName,
} from '@app/utils/ZingoAppData';
import { AppTheme } from '@app/theme';
import { watchFaceDown } from '@app/services/faceDown';
import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import SwapExpiryNotice from '@screens/Swap/components/SwapExpiryNotice';
import { priceFetcherStore } from '@ui/widgets/priceFetcherStore';
import { ContextAppLoadedProvider, SwapServiceProvider } from '@app/context';
import { parseZcashURI, serverUris } from '@app/uris';
import BackgroundFileImpl from '@app/services/BackgroundFileImpl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAlert } from '@app/services/createAlert';
import Toast from 'react-native-toast-message';
import { FullWindowOverlay } from 'react-native-screens';
import { ACTION_SNACKBAR_MS, toastConfig } from '@ui/widgets/toastConfig';
import { MASK } from '@ui/widgets/PrivateAmount';
import { RPCSeedType } from '@app/walletBackend/types/RPCSeedType';
import Launching from '@screens/Launching';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import {
  GateAnswer,
  enactGateAnswer,
  resolveTriggerGate,
  withinForegroundGrace,
} from '@app/services/gateController';
import ShowAddressAlertAsync from '@app/services/showAddressAlertAsync';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AddTagModalHost from './components/AddTagModalHost';
import { showAddTag } from '@app/services/showAddTag';
import { BottomSheetBackHandler } from '@app/hooks/useBottomSheetBackHandler';
import ConfirmBottomSheet from '@ui/widgets/ConfirmBottomSheet';
import ServerHealthSheet from '@ui/widgets/ServerHealthSheet';
import WalletsSheet from '@screens/Wallets';
import FadeInOnMount from '@ui/widgets/FadeInOnMount';
import { showConfirm } from '@app/services/showConfirm';
import {
  INITIAL_SERVER_HEALTH_VIEW,
  ServerHealthMonitor,
  ServerHealthView,
} from '@app/services/serverHealthMonitor';
import { defaultServer, probeUri } from '@app/services/serverPicking';
import { spendInFlight } from '@app/walletBackend/utils/syncBracket';
import { WalletNavigator } from '@app/navigation/WalletNavigator';
import TooltipHost from '@ui/widgets/TooltipHost';
import {
  closeOptionsPanel,
  OptionsPanelProvider,
} from '@app/context/optionsPanel';
import type { SwapDepositArgs } from '@app/walletBackend';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { rescanStep } from '@app/walletBackend/utils/syncProgress';
import { RPCUfvkType } from '@app/walletBackend/types/RPCUfvkType';
import {
  INITIAL_MIXNET_VIEW,
  MixnetView,
} from '@app/walletBackend/transforms/mixnetView';
import {
  SendOutcome,
  SendPermit,
  sendPermit,
  sendWhenPermitted,
} from '@app/walletBackend/transforms/sendPermit';
import {
  startMixnetTransport,
  stopMixnetTransport,
  takeMixnetProxyDeath,
} from '@app/walletBackend/utils/nymTransport';
import { DEFAULT_PERFORMANCE_LEVEL } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { RootParamList } from '@app/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { publishReport } from '@app/services/reportDiagnostics';
import { finishWalletOpen, WalletOpen } from '@app/services/openWallet';
import { showWallets } from '@app/services/showWallets';
import { askDiskRetry, isDiskFull } from '@app/services/diskFull';
import { entryChain, entryServer } from '@app/services/recoveryImport';
import {
  RecoveryEntry,
  recoveryEntryFor,
  retireImportedEntry,
} from '@app/services/recoveryWalletInfo';
import { defaultWalletName } from '@screens/AddWallet/draftParts';
import { AddWalletDraft } from '@app/services/addWalletDraft';
import { isViewingKey } from '@app/utils/seedPhrase';
import type {
  AddWalletResult,
  ImportFoundFailed,
  ImportFoundResult,
  WalletSwitchOutcome,
  NewWalletSource,
} from '@app/AppState/AppContextLoaded';
import { forgetWallet } from '@app/services/WalletLocalData';
import type { FfiResult } from '@app/walletBackend';
import { writeSavedBalance } from '@app/services/savedBalance';
import {
  leaveHandoff,
  PendingHandoff,
  takeHandoff,
  WalletHandoff,
} from '@app/services/walletHandoff';
import { avatarCategoryOf } from '@ui/widgets/Avatar';
import type { WalletEntry } from '@app/walletBackend';

const en = require('@app/translations/en.json');
const es = require('@app/translations/es.json');
const pt = require('@app/translations/pt.json');
const ru = require('@app/translations/ru.json');
const tr = require('@app/translations/tr.json');

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

type LoadedAppProps = NativeStackScreenProps<RootParamList, 'Wallet'> & {
  wallet: LoadedAppNavigationState;
};

// The wallet fades in over the loading screen as it opens.
const HOME_FADE_MS = 300;

const FILL = { flex: 1 } as const;

type FaceDownProps = {
  enabled: boolean;
  onChange: (down: boolean) => void;
};

const FaceDown: React.FC<FaceDownProps> = ({ enabled, onChange }) => {
  useEffect(() => {
    if (!enabled) {
      onChange(false);
      return;
    }
    return watchFaceDown(onChange);
  }, [enabled, onChange]);
  return null;
};

/** How long Home waits faded for a wallet opened in place before it shows what it has. */
const OPENING_MAX_MS = 15 * 1000;

/** How long a switch waits for the open wallet's sync to stop before it saves. */
const SWITCH_STOP_WAIT_MS = 5 * 1000;

/** iOS gives a backgrounded app a few seconds; the save still has to fit. */
const BACKGROUND_STOP_WAIT_MS = 3 * 1000;

const SERVER_DEFAULT_0: ServerType = remoteServer(
  serverUris(() => {})[0].uri,
  serverUris(() => {})[0].chainName,
);

export default function LoadedApp(props: LoadedAppProps) {
  const theme = useTheme();
  const { setSession, pendingLink, clearLink } = useSession();
  const [handoff] = useState(() => takeHandoff(props.wallet.walletId));
  const carried = <T,>(
    pick: (c: WalletHandoff['settings']) => T,
    fallback: T,
  ) => (handoff.kind === 'handoff' ? pick(handoff.handoff.settings) : fallback);
  const [language, setLanguage] = useState<LanguageEnum>(() =>
    carried(c => c.language, LanguageEnum.en),
  );
  const [server, setServer] = useState<ServerType>(() =>
    carried(c => c.server, SERVER_DEFAULT_0),
  );
  const [privacy, setPrivacy] = useState<boolean>(() =>
    carried(c => c.privacy, false),
  );
  const [flipToHide, setFlipToHide] = useState<boolean>(() =>
    carried(c => c.flipToHide, false),
  );
  const [backgroundSyncInfo, setBackgroundSyncInfo] = useState<BackgroundType>(
    () =>
      carried(c => c.backgroundSyncInfo, {
        batches: 0,
        message: '',
        date: 0,
        dateEnd: 0,
      }),
  );
  const [addressBook, setAddressBook] = useState<AddressBookFileClass[]>(() =>
    carried(c => c.addressBook, []),
  );
  const [loading, setLoading] = useState<boolean>(handoff.kind === 'none');
  const [biometrics, setBiometrics] = useState<boolean>(() =>
    carried(c => c.biometrics, true),
  );
  const [seedBackedUp, setSeedBackedUp] = useState<boolean>(() =>
    carried(c => c.seedBackedUp, true),
  );
  const [seedBackedUpAt, setSeedBackedUpAt] = useState<number>(() =>
    carried(c => c.seedBackedUpAt, 0),
  );
  const [viewOnlyNoticeDismissed, setViewOnlyNoticeDismissed] =
    useState<boolean>(() => carried(c => c.viewOnlyNoticeDismissed, false));
  const [selectServer, setSelectServer] = useState<SelectServerEnum>(() =>
    carried(c => c.selectServer, SelectServerEnum.auto),
  );
  const [blockExplorer, setBlockExplorer] = useState<BlockExplorerEnum>(() =>
    carried(c => c.blockExplorer, BlockExplorerEnum.Zcashexplorer),
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
  const i18n = useMemo(() => {
    const instance = new I18n(file);
    /** A key missing in a locale shows the English text, never `[missing … translation]`. */
    instance.enableFallback = true;
    if (handoff.kind === 'handoff') {
      instance.locale = handoff.handoff.settings.language;
    }
    return instance;
  }, [file, handoff]);

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
    () => (key: string) =>
      substituteCurrency(
        substituteZingoName(i18n.t(key) as TranslateType),
        props.wallet.walletChainName === ChainNameEnum.mainChainName
          ? CurrencyNameEnum.ZEC
          : CurrencyNameEnum.TAZ,
      ),
    [i18n, language, props.wallet.walletChainName], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const {
    readOnly,
    orchardPool,
    saplingPool,
    transparentPool,
    newWallet,
    firstLaunchingMessage,
    // The opened wallet's own chain, resolved by LoadingApp at open time
    // (reliable even Offline).
    walletChainName,
  } = props.wallet;

  useEffect(() => {
    if (handoff.kind === 'handoff') {
      return;
    }
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
        // Offline carries the open wallet's chain, the one onboarding shows
        // next time.
        const stale =
          settings.server.kind === 'offline' &&
          !!walletChainName &&
          settings.server.chainName !== walletChainName;
        const normalizedServer = stale
          ? offlineServer(walletChainName)
          : settings.server;
        setServer(normalizedServer);
        setSelectServer(settings.selectServer);
        if (stale) {
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
      if (settings.flipToHide === true || settings.flipToHide === false) {
        setFlipToHide(settings.flipToHide);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.flipToHide,
          flipToHide,
        );
      }
      setSeedBackedUp(settings.seedBackedUp === true);
      setViewOnlyNoticeDismissed(settings.viewOnlyNoticeDismissed === true);
      setSeedBackedUpAt(
        typeof settings.seedBackedUpAt === 'number'
          ? settings.seedBackedUpAt
          : 0,
      );
      if (settings.biometrics === true || settings.biometrics === false) {
        setBiometrics(settings.biometrics);
      } else {
        await SettingsFileImpl.writeSettings(
          SettingsNameEnum.biometrics,
          biometrics,
        );
      }
      if (Object.values(BlockExplorerEnum).includes(settings.blockExplorer)) {
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

  if (loading && props.wallet.arrival === 'switch') {
    // Picked in Wallets: Home stayed while it opened, so no launch screen
    // now, only the canvas the new Home fades in over.
    return <View style={[FILL, { backgroundColor: theme.colors.bgCanvas }]} />;
  } else if (loading) {
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
        leaveWallet={setSession}
        openWallet={params => {
          /** The same render remounts the section, so the old screens never draw Home. */
          resetWalletRoutes();
          setSession({ kind: 'wallet', params });
        }}
        walletId={props.wallet.walletId}
        handoff={handoff}
        arrivalNext={props.wallet.next}
        arrivalNotice={props.wallet.notice}
        pendingLink={pendingLink}
        clearLink={clearLink}
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
        flipToHide={flipToHide}
        backgroundSyncInfo={backgroundSyncInfo}
        readOnly={readOnly}
        orchardPool={orchardPool}
        saplingPool={saplingPool}
        transparentPool={transparentPool}
        addressBook={addressBook}
        biometrics={biometrics}
        seedBackedUp={seedBackedUp}
        seedBackedUpAt={seedBackedUpAt}
        viewOnlyNoticeDismissed={viewOnlyNoticeDismissed}
        selectServer={selectServer}
        walletChainName={walletChainName}
        firstLaunchingMessage={firstLaunchingMessage}
        blockExplorer={blockExplorer}
      />
    );
  }
}

type LoadedAppClassProps = {
  leaveWallet: (session: LoadingSession) => void;
  /** Hands the wallet section to another open wallet, which remounts it. */
  openWallet: (params: LoadedAppNavigationState) => void;
  walletId: string;
  /** What the wallet replaced in place handed over: its figures, shown faded while this one opens. */
  handoff: PendingHandoff;
  /** A wallet just added opens on its seed backup when asked, and with its note. */
  arrivalNext: LoadedAppNavigationState['next'];
  arrivalNotice: string;
  // A `zcash:` link waiting for Send, from the session.
  pendingLink: string | undefined;
  clearLink: () => void;
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
  flipToHide: boolean;
  backgroundSyncInfo: BackgroundType;
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  addressBook: AddressBookFileClass[];
  biometrics: boolean;
  seedBackedUp: boolean;
  seedBackedUpAt: number;
  viewOnlyNoticeDismissed: boolean;
  selectServer: SelectServerEnum;
  walletChainName: ChainNameEnum;
  firstLaunchingMessage: LaunchingModeEnum;
  blockExplorer: BlockExplorerEnum;
};

type LoadedAppClassState = AppStateLoaded &
  AppContextLoaded & {
    faceDown: boolean;
  };

export class LoadedAppClass extends Component<
  LoadedAppClassProps,
  LoadedAppClassState
> {
  rpc: WalletBackend;
  health: ServerHealthMonitor;
  appstate: NativeEventSubscription;
  unsubscribeNetInfo: NetInfoSubscription;
  constructor(props: LoadedAppClassProps) {
    super(props);
    const shown: WalletHandoff['figures'] =
      props.handoff.kind === 'handoff'
        ? props.handoff.handoff.figures
        : { kind: 'none' };

    this.state = {
      //context
      netInfo: {} as NetInfoType,
      totalBalance: shown.kind === 'shown' ? shown.totalBalance : null,
      addresses: null,
      valueTransfers: shown.kind === 'shown' ? shown.valueTransfers : null,
      valueTransfersTotal:
        shown.kind === 'shown' ? shown.valueTransfersTotal : null,
      messages: null,
      messagesTotal: null,
      sendPageState: new SendPageStateClass(new ToAddrClass(0)),
      setSendPageState: this.setSendPageState,
      // The currency is the wallet's from the start: when no server answers
      // (no network) the info never arrives, and amounts read "---".
      info: {
        currencyName:
          (props.walletChainName || props.server.chainName) ===
          ChainNameEnum.mainChainName
            ? CurrencyNameEnum.ZEC
            : CurrencyNameEnum.TAZ,
      } as InfoType,
      syncingStatus: {} as RPCSyncStatusType,
      rescan: 'none',
      birthday: 0,
      defaultUnifiedAddress: '',
      zecPrice: {
        zecPrice: 0,
        date: 0,
      } as ZecPriceType,
      translate: props.translate,
      readOnly: props.readOnly,
      backgroundSyncInfo: props.backgroundSyncInfo,
      backgroundError: { title: '', error: '' },
      setBackgroundError: this.setBackgroundError,
      lastError: '',
      setLastError: this.setLastError,
      orchardPool: props.orchardPool,
      saplingPool: props.saplingPool,
      transparentPool: props.transparentPool,
      addLastSnackbar: this.addLastSnackbar,
      addActionSnackbar: this.addActionSnackbar,
      restartApp: () =>
        this.navigateToLoadingApp({
          kind: 'boot',
          startingApp: false,
          newWallet: false,
        }),
      setScrollToTop: this.setScrollToTop,
      setScrollToNewest: this.setScrollToNewest,
      setShieldingAmount: this.setShieldingAmount,
      sendTransaction: this.sendTransaction,
      sendSwapDeposit: this.sendSwapDeposit,
      resumeSwapDeposit: this.resumeSwapDeposit,
      setServerOption: this.setServerOption,
      clearToAddr: this.clearToAddr,
      doRescan: this.doRescan,
      setAddressBook: this.setAddressBook,
      setLanguageOption: this.setLanguageOption,
      setBiometricsOption: this.setBiometricsOption,
      setBlockExplorerOption: this.setBlockExplorerOption,
      switchWallet: this.switchWallet,
      restoreInPlace: this.restoreInPlace,
      deleteWallet: this.deleteWallet,
      addWallet: this.addWallet,
      enterAdded: this.enterAdded,
      importFound: this.importFound,
      refreshWallets: this.refreshWallets,
      somePending: false,
      addressBook: props.addressBook,
      launchAddTagModal: this.launchAddTagModal,
      shieldingAmount: 0,
      showSwipeableIcons: true,
      doRefresh: this.doRefresh,
      setZecPrice: this.setZecPrice,
      zingolibVersion: '',
      setPrivacyOption: this.setPrivacyOption,
      privacySetting: props.privacy,
      flipToHide: props.flipToHide,
      setFlipToHideOption: this.setFlipToHideOption,
      faceDown: false,
      seedBackedUp: props.seedBackedUp,
      seedBackedUpAt: props.seedBackedUpAt,
      setSeedBackedUp: this.setSeedBackedUp,
      viewOnlyNoticeDismissed: props.viewOnlyNoticeDismissed,
      dismissViewOnlyNotice: this.dismissViewOnlyNotice,

      // context settings
      server: props.server,
      language: props.language,
      privacy: props.privacy,
      biometrics: props.biometrics,
      selectServer: props.selectServer,
      walletChainName: props.walletChainName,
      blockExplorer: props.blockExplorer,

      mixnetView: INITIAL_MIXNET_VIEW,
      reenableMixnet: this.reenableMixnet,
      serverHealth: INITIAL_SERVER_HEALTH_VIEW,
      reportServerProbe: this.reportServerProbe,
      switchServerFromHealth: this.switchServerFromHealth,
      returnToDefaultServer: this.returnToDefaultServer,
      stayOnServer: this.stayOnServer,
      sendPermitNow: this.sendPermitNow,

      // state
      appStateStatus:
        Platform.OS === GlobalConst.platformOSios
          ? AppStateStatusEnum.active
          : AppState.currentState,
      walletId: props.walletId,
      switching:
        props.handoff.kind === 'handoff'
          ? { kind: 'opening', wallet: props.handoff.handoff.opening }
          : { kind: 'none' },
      wallets: [],
      scrollToTop: false,
      scrollToNewest: false,
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
      onBirthdayAdjusted: this.noticeBirthdayAdjusted,
      onError: this.setLastError,
      onSyncLaunch: launch => this.health.syncLaunch(launch),
      onServerAnswer: (uri, answer) => this.health.answer(uri, answer),
      onMixnetViewChanged: this.setMixnetView,
      startMixnetTransport: startMixnetTransport,
      stopMixnetTransport: stopMixnetTransport,
      takeMixnetProxyDeath: takeMixnetProxyDeath,
      mixnetSupported: true,
      readOnly: props.readOnly,
      server: props.server,
      performanceLevel: DEFAULT_PERFORMANCE_LEVEL,
    });

    this.health = new ServerHealthMonitor({
      probe: probeUri,
      spending: spendInFlight,
      onChange: this.setServerHealth,
    });

    this.appstate = {} as NativeEventSubscription;
    this.unsubscribeNetInfo = {} as NetInfoSubscription;
  }

  componentDidMount = async () => {
    this.publishReportState();
    await this.refreshWallets();
    this.arrive();
    if (this.state.switching.kind === 'opening') {
      this.openingTimer = setTimeout(
        () => this.setState({ switching: { kind: 'none' } }),
        OPENING_MAX_MS,
      );
    }
    const netInfoState = await NetInfo.fetch();
    this.setState({
      netInfo: {
        isConnected: netInfoState.isConnected,
        type: netInfoState.type,
        isConnectionExpensive:
          netInfoState.details && netInfoState.details.isConnectionExpensive,
      },
    });
    // A launch without network must not start drawing the mixnet.
    if (netInfoState.isConnected === false) {
      await this.rpc.networkChanged(false);
    }

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
    this.watchServer();
    await this.rpc.clearTimers();
    await this.rpc.configure();

    // The private migration is gone from the app: one an older build left in
    // flight is cancelled, silently, so the drain can move its notes.
    cancelOldPrivateMigration();

    this.clearToAddr();

    this.appstate = AppState.addEventListener(
      EventListenerEnum.change,
      async nextAppState => {
        // let's catch the prior value
        const priorAppState = this.state.appStateStatus;
        if (
          nextAppState === AppStateStatusEnum.background &&
          this.leftAt === undefined
        ) {
          this.leftAt = Date.now();
        }
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
            // A suspended app's connection dies, so the engine is stopped rather
            // than paused; the foreground tick launches a fresh session.
            await this.rpc.stopSyncProcess(BACKGROUND_STOP_WAIT_MS);
            this.setSyncingStatus({} as RPCSyncStatusType);
            // We need to save the wallet file here because
            // sometimes the App can lose the last synced chunk
            await doSave();
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
        } else if (
          priorAppState === AppStateStatusEnum.active &&
          (nextAppState === AppStateStatusEnum.inactive ||
            nextAppState === AppStateStatusEnum.background)
        ) {
          console.log('App LOADED is gone to the background!');
          // setting value for background task Android
          await AsyncStorage.setItem(GlobalConst.background, GlobalConst.yes);
          await this.rpc.clearTimers();
          // A suspended app's connection dies, so the engine is stopped rather
          // than paused; the foreground tick launches a fresh session.
          await this.rpc.stopSyncProcess(BACKGROUND_STOP_WAIT_MS);
          this.setSyncingStatus({} as RPCSyncStatusType);
          // We need to save the wallet file here because
          // sometimes the App can lose the last synced chunk
          await doSave();
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

    this.linkReady = true;
    this.deliverLink();

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
            // Only a definite answer counts: null is "not known yet".
            if (state.isConnected === false) {
              await this.rpc.networkChanged(false);
            } else if (state.isConnected) {
              await this.rpc.networkChanged(true);
              // restart the interval process again...
              await this.rpc.clearTimers();
              await this.rpc.configure();
            }
          }
        }
      },
    );
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
    if (this.props.pendingLink !== prevProps.pendingLink) {
      this.deliverLink();
    }
    this.health.setConditions({
      online: !!this.state.netInfo.isConnected,
      foreground: this.state.appStateStatus === AppStateStatusEnum.active,
      network: this.state.netInfo.type ?? '',
    });
    this.publishReportState();
  };

  publishReportState = (): void => {
    const {
      server,
      selectServer,
      readOnly,
      lastError,
      mixnetView,
      serverHealth,
    } = this.state;
    publishReport({
      served: { kind: 'chosen', server, selectServer },
      session: {
        kind: 'open',
        chain: this.state.walletChainName,
        readOnly,
        sync: this.state.syncingStatus,
        lastError,
        mixnetView,
        serverHealth,
      },
    });
  };

  linkReady = false;

  // Takes the session's `zcash:` link into Send.
  deliverLink = async () => {
    const url = this.props.pendingLink;
    // Until the mount has cleared Send, a link would be wiped with it; the
    // mount takes it once it is done.
    if (!url || !this.linkReady) {
      return;
    }
    this.props.clearLink();
    // The Send tab exists only for a spending wallet on a remote server;
    // anywhere else the user is told why the link does not open it.
    if (this.state.readOnly) {
      this.addLastSnackbar(this.state.translate('link-view-only') as string);
      return;
    }
    const filled = await this.readUrl(url);
    if (this.state.server.kind !== 'remote') {
      if (filled) {
        this.addLastSnackbar(this.state.translate('link-offline') as string);
      }
      return;
    }
    closeOptionsPanel();
    navigateWallet({
      screen: Route.Home,
      params: { screen: Route.Send },
    });
  };

  foregroundGateBusy = false;

  /** When the app last went to the background, cleared on its return. */
  leftAt: number | undefined;

  // (PIN or TouchID or FaceID). Only a decline locks; a gate that cannot
  // run fails open with a notice (ADR 0007), because blocking would trap
  // the user out of the wallet.
  runForegroundGate = async () => {
    const leftAt = this.leftAt;
    this.leftAt = undefined;
    const foregroundGate: GateAnswer = await resolveTriggerGate(
      undefined,
      this.state.biometrics && !withinForegroundGrace(leftAt, Date.now()),
      { translate: this.state.translate },
    );
    const proceed = enactGateAnswer(
      foregroundGate,
      {
        // The narrowed answer is the gate outcome, whole; the locked
        // screen never reads mutable module state.
        lock: declined =>
          this.navigateToLoadingApp({ kind: 'locked', gate: declined }),
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
    if (!(await this.reclaimClient())) {
      return;
    }
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

  /** Takes the client back from the nightly sync and reopens this wallet when it holds another one; false when it does not open and the app boots again. */
  reclaimClient = async (): Promise<boolean> => {
    const held = await claimClient();
    if (held.ok && held.value === this.state.walletId) {
      return true;
    }
    const opened = await loadWallet(
      this.state.walletId,
      nativeUri(this.state.server),
      this.state.server.chainName,
      DEFAULT_PERFORMANCE_LEVEL,
      GlobalConst.minConfirmations.toString(),
    );
    if (!opened.ok) {
      this.navigateToLoadingApp({
        kind: 'boot',
        startingApp: false,
        newWallet: false,
      });
      return false;
    }
    this.rpc.walletReopened();
    return true;
  };

  /** What a wallet opened in place still waits for before its own figures replace the faded ones. */
  awaiting = { balance: true, transfers: true };
  openingTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  /** Ends the opening once the balance and the history of this wallet arrived. */
  arrived = (part: 'balance' | 'transfers') => {
    if (this.state.switching.kind !== 'opening' || !this.awaiting[part]) {
      return;
    }
    this.awaiting = { ...this.awaiting, [part]: false };
    if (!this.awaiting.balance && !this.awaiting.transfers) {
      clearTimeout(this.openingTimer);
      this.setState({ switching: { kind: 'none' } });
    }
  };

  componentWillUnmount = async () => {
    clearTimeout(this.openingTimer);
    this.health.stop();
    publishReport({ session: { kind: 'closed' } });
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
    safeRemove(this.unsubscribeNetInfo, 'netInfo');
  };

  keepAwake = (keep: boolean): void => {
    if (keep) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  };

  // Fills Send from a `zcash:` link; true when Send now holds it.
  readUrl = async (url: string): Promise<boolean> => {
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
        return false;
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
            to.amount = tgt.amount ? toAmountInput(tgt.amount) : '';
            to.memo = tgt.memoString || '';

            uriToAddr = to;
          });

          newSendPageState.toaddr = uriToAddr;

          this.setSendPageState(newSendPageState);
          return true;
        }
      }
    }
    return false;
  };

  fetchBackgroundSyncInfo = async () => {
    const backgroundSyncInfoJson: BackgroundType =
      await BackgroundFileImpl.readBackground();
    if (!isEqual(this.state.backgroundSyncInfo, backgroundSyncInfoJson)) {
      this.setState({ backgroundSyncInfo: backgroundSyncInfoJson });
    }
  };

  setShieldingAmount = (value: number) => {
    //const start = Date.now();
    this.setState({ shieldingAmount: value });
  };

  setShowSwipeableIcons = (value: boolean) => {
    this.setState({ showSwipeableIcons: value });
  };

  setTotalBalance = (totalBalance: TotalBalanceClass) => {
    const opening = this.state.switching.kind === 'opening';
    if (opening || !isEqual(this.state.totalBalance, totalBalance)) {
      //const start = Date.now();
      this.setState({ totalBalance });
      writeSavedBalance(
        this.state.walletId,
        totalBalance.totalIronwoodBalance +
          totalBalance.totalOrchardBalance +
          totalBalance.totalSaplingBalance +
          totalBalance.totalTransparentBalance,
      ).catch(e => console.log(`saved balance not written: ${e}`));
    }
    this.arrived('balance');
  };

  setSyncingStatus = (syncingStatus: RPCSyncStatusType) => {
    // here is a good place to fetch the background task info
    this.fetchBackgroundSyncInfo();
    if (!isEqual(this.state.syncingStatus, syncingStatus)) {
      //const start = Date.now();
      this.setState({ syncingStatus });
    }
    const rescan = rescanStep(this.state.rescan, syncingStatus);
    if (rescan !== this.state.rescan) {
      this.setState({ rescan });
    }
  };

  setMixnetView = (mixnetView: MixnetView) => {
    if (!isEqual(this.state.mixnetView, mixnetView)) {
      this.setState({ mixnetView });
    }
  };

  reenableMixnet = async (): Promise<void> => {
    await this.rpc.reenableMixnet();
  };

  sendPermitNow = (): SendPermit => sendPermit(this.state);

  setValueTransfersList = async (
    valueTransfers: ValueTransferType[],
    valueTransfersTotal: number,
  ) => {
    const opening = this.state.switching.kind === 'opening';
    if (
      opening ||
      !isEqual(this.state.valueTransfers, valueTransfers) ||
      this.state.valueTransfersTotal !== valueTransfersTotal
    ) {
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
      !opening &&
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
              const amount = (zec: number) =>
                this.state.privacy ? MASK : formatAmount(zec);
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
                  amount(vtNew[0].amount) +
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
                      amount(vtNew[0].fee) +
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
                      amount(vtNew[0].fee) +
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
                      amount(vtNew[0].amount) +
                      ' ' +
                      this.state.info.currencyName
                    : '') +
                  (vtNew[0].fee
                    ? ((' ' + this.state.translate('send.fee')) as string) +
                      ' ' +
                      amount(vtNew[0].fee) +
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
                  amount(vtNew[0].amount) +
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
                  amount(vtNew[0].amount) +
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
                  amount(vtNew[0].amount) +
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
    this.arrived('transfers');
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

  sendTransaction = (
    sendPageState: SendPageStateClass,
    sendAll: boolean = false,
  ): Promise<SendOutcome<string>> =>
    sendWhenPermitted(this.sendPermitNow, async () => {
      const sendJson = await Utils.getSendManyJSON(
        sendPageState,
        this.state.defaultUnifiedAddress,
      );
      return this.rpc.sendTransaction(sendJson, sendAll);
    });

  sendSwapDeposit = (args: SwapDepositArgs): Promise<string[]> =>
    this.rpc.sendSwapDeposit(args);

  resumeSwapDeposit = (): Promise<string[]> => this.rpc.resumeSwapDeposit();

  doRefresh = (what: 'valueTransfers' | 'messages') => {
    if (what === 'valueTransfers') {
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
    this.setState({ rescan: 'started' });
    await this.rpc.refreshSync(true);
  };

  setBirthday = async (birthday: number) => {
    if (!isEqual(this.state.birthday, birthday)) {
      //const start = Date.now();
      this.setState({ birthday });
    }
  };

  noticeBirthdayAdjusted = (height: number) => {
    this.addLastSnackbar(
      (this.state.translate('loadedapp.birthday-adjusted') as string).replace(
        '{height}',
        formatInteger(height),
      ),
      SnackbarDurationEnum.longer,
    );
  };

  setServerOption = async (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
  ): Promise<SetServerResult> => {
    // The server is changing — stop the ongoing sync tasks before touching
    // anything else.
    await this.rpc.clearTimers();
    this.setSyncingStatus({} as RPCSyncStatusType);
    this.keepAwake(false);

    // The wallet's network never changes: open it on the new server.
    const result = await loadExistingWallet(
      nativeUri(value),
      value.chainName,
      DEFAULT_PERFORMANCE_LEVEL,
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
      this.rpc.walletReopened();
      this.watchServer(value, selectServer);
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

  setServerHealth = (serverHealth: ServerHealthView) => {
    if (!isEqual(this.state.serverHealth, serverHealth)) {
      this.setState({ serverHealth });
    }
  };

  /** Watches `server`, and the default too while the wallet is elsewhere in Automatic. */
  watchServer = (
    server: ServerType = this.state.server,
    mode: SelectServerEnum = this.state.selectServer,
  ) => {
    const home =
      mode === SelectServerEnum.auto
        ? defaultServer(this.state.translate, server.chainName)
        : null;
    this.health.watch(server, home?.uri ?? null);
  };

  /** A probe of the open wallet's server made elsewhere, as the options panel's. */
  reportServerProbe = (
    uri: string,
    probe: { latency: number | null; height: string },
  ) => {
    this.health.answer(
      uri,
      probe.latency === null
        ? { kind: 'failed', error: `${uri} did not answer` }
        : {
            kind: 'answered',
            latencyMs: probe.latency,
            height: Number(probe.height) || 0,
          },
    );
  };

  /**
   * The health sheet's switch: Automatic stays Automatic for this session,
   * any other mode keeps the server as a list choice. Nothing moves while a
   * transaction is on its way.
   */
  switchServerFromHealth = async (next: ServerType): Promise<boolean> => {
    if (spendInFlight()) {
      this.addLastSnackbar(
        this.state.translate('server-health.wait-send') as string,
      );
      return false;
    }
    const mode =
      this.state.selectServer === SelectServerEnum.auto
        ? SelectServerEnum.auto
        : SelectServerEnum.list;
    const result = await this.setServerOption(next, mode, true);
    return result.kind === 'ok';
  };

  /** Back on the default server in Automatic, once the user says so. */
  returnToDefaultServer = async (): Promise<void> => {
    const home = defaultServer(
      this.state.translate,
      this.state.walletChainName,
    );
    if (!home || spendInFlight()) {
      return;
    }
    await this.setServerOption(
      remoteServer(home.uri, home.chainName),
      SelectServerEnum.auto,
      true,
    );
  };

  stayOnServer = () => this.health.decline();

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
      privacySetting: value as boolean,
    });
  };

  setFlipToHideOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.flipToHide, value);
    this.setState({
      flipToHide: value,
    });
  };

  setFaceDown = (down: boolean): void => {
    if (down !== this.state.faceDown) {
      this.setState({ faceDown: down });
    }
  };

  setSeedBackedUp = async (value: boolean): Promise<void> => {
    const at = value ? Date.now() : 0;
    await SettingsFileImpl.writeSettings(SettingsNameEnum.seedBackedUp, value);
    await SettingsFileImpl.writeSettings(SettingsNameEnum.seedBackedUpAt, at);
    this.setState({ seedBackedUp: value, seedBackedUpAt: at });
  };

  dismissViewOnlyNotice = async (): Promise<void> => {
    await SettingsFileImpl.writeSettings(
      SettingsNameEnum.viewOnlyNoticeDismissed,
      true,
    );
    this.setState({ viewOnlyNoticeDismissed: true });
  };

  setBiometricsOption = async (value: boolean): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.biometrics, value);
    this.setState({ biometrics: value });
  };

  setBlockExplorerOption = async (value: BlockExplorerEnum): Promise<void> => {
    await SettingsFileImpl.writeSettings(SettingsNameEnum.blockExplorer, value);
    this.setState({
      blockExplorer: value as BlockExplorerEnum,
    });
  };

  navigateToLoadingApp = async (session: LoadingSession) => {
    await this.rpc.clearTimers();
    this.props.leaveWallet(session);
  };

  /** What a wallet just added does once open: its note, and its seed backup when asked. */
  arrive = () => {
    if (this.props.arrivalNotice) {
      setTimeout(
        () => this.addLastSnackbar(this.props.arrivalNotice),
        HOME_FADE_MS,
      );
    }
    if (this.props.arrivalNext === 'wallets') {
      setTimeout(showWallets, HOME_FADE_MS);
    }
    if (this.props.arrivalNext === 'backup') {
      setTimeout(
        () =>
          navigateWallet({
            screen: Route.SeedBackup,
            params: { entry: { kind: 'push' } },
          }),
        HOME_FADE_MS,
      );
    }
  };

  /** Reads the wallets on the device; one without a category gets the one its id gives, kept in its meta. */
  refreshWallets = async (): Promise<void> => {
    const result = await walletsOnDevice();
    if (!result.ok) {
      return;
    }
    const wallets: WalletEntry[] = [];
    for (const wallet of result.value.wallets) {
      if (wallet.meta.category) {
        wallets.push(wallet);
        continue;
      }
      const category = avatarCategoryOf(wallet.id);
      await updateWalletMeta(wallet.id, { category });
      wallets.push({ ...wallet, meta: { ...wallet.meta, category } });
    }
    this.setState({ wallets });
  };

  /**
   * Opens another wallet in place: Home stays, faded, while it opens, then
   * the wallet section remounts on it. One that does not open hands back to
   * the wallet that was open.
   */
  switchWallet = async (entry: WalletEntry): Promise<WalletSwitchOutcome> => {
    if (
      this.state.switching.kind === 'opening' ||
      entry.id === this.state.walletId
    ) {
      return { kind: 'failed' };
    }
    this.setState({ switching: { kind: 'opening', wallet: entry } });
    await this.rpc.stopSyncProcess(SWITCH_STOP_WAIT_MS);
    await doSave();
    await this.rpc.clearTimers();
    this.keepAwake(false);

    const opened = await this.openInPlace(entry);
    if (opened.kind === 'opened') {
      return { kind: 'opened' };
    }
    await loadWallet(
      this.state.walletId,
      nativeUri(this.state.server),
      this.state.server.chainName,
      DEFAULT_PERFORMANCE_LEVEL,
      GlobalConst.minConfirmations.toString(),
    );
    this.rpc.walletReopened();
    await this.rpc.configure();
    this.setState({ switching: { kind: 'none' } });
    const details = Utils.humanizeChainTokens(
      opened.error.message,
      this.state.translate,
    );
    if (walletErrorKind(details) === 'open') {
      await recordOpenFailed(entry, true);
    }
    await this.refreshWallets();
    if (!isOnTop(Route.WalletOpenError)) {
      navigateWallet({
        screen: Route.WalletOpenError,
        params: { walletId: entry.id, details },
      });
    }
    return { kind: 'failed' };
  };

  /**
   * Restores a wallet that won't open from the phrase its entry saved: the
   * new one takes its name, colour and place, the broken one leaves the
   * device, and the new one opens.
   */
  restoreInPlace = async (entry: WalletEntry): Promise<void> => {
    const found = await recoveryEntryFor(entry.id);
    if (found.kind === 'none') {
      this.addLastSnackbar(this.state.translate('wallets.no-entry') as string);
      return;
    }
    this.setState({ switching: { kind: 'opening', wallet: entry } });
    const choice = await SettingsFileImpl.serverOf(entry.meta);
    const result = await this.addWallet(
      {
        kind: 'restore',
        text: found.entry.seed || found.entry.ufvk || '',
        birthday: found.entry.birthday,
      },
      entry.meta.name,
      { ...choice, keyChain: { kind: 'none' } },
    );
    if (result.kind === 'diskFull') {
      this.setState({ switching: { kind: 'none' } });
      askDiskRetry(this.state.translate, () => this.restoreInPlace(entry));
      return;
    }
    if (result.kind === 'failed') {
      this.setState({ switching: { kind: 'none' } });
      this.addLastSnackbar(
        (this.state.translate('add.error') as string).replace(
          '{error}',
          result.message,
        ),
      );
      return;
    }
    await updateWalletMeta(result.params.walletId, {
      order: entry.meta.order,
      ...(entry.meta.fromPrevious ? { fromPrevious: true } : {}),
      ...(entry.meta.category ? { category: entry.meta.category } : {}),
    });
    await forgetWallet(entry.id).then(() => deleteWallet(entry.id));
    await this.enterAdded(
      result.params,
      'home',
      (this.state.translate('wallets.restored-place') as string).replace(
        '{name}',
        entry.meta.name,
      ),
    );
  };

  /** Opens a wallet with its own server and hands the wallet section to it; a failure is the caller's. */
  openInPlace = async (entry: WalletEntry): Promise<WalletOpen> => {
    const { server } = await SettingsFileImpl.serverOf(entry.meta);
    const opened = await finishWalletOpen(
      await loadWallet(
        entry.id,
        nativeUri(server),
        server.chainName,
        DEFAULT_PERFORMANCE_LEVEL,
        GlobalConst.minConfirmations.toString(),
      ),
      server.chainName,
    );
    if (opened.kind === 'opened') {
      await this.leaveHandoffFor(entry, true);
      this.props.openWallet({
        walletId: entry.id,
        arrival: 'switch',
        next: 'home',
        notice: '',
        readOnly: opened.readOnly,
        orchardPool: opened.orchardPool,
        saplingPool: opened.saplingPool,
        transparentPool: opened.transparentPool,
        newWallet: false,
        firstLaunchingMessage: LaunchingModeEnum.opening,
        walletChainName: opened.walletChainName,
      });
    }
    return opened;
  };

  /**
   * Adds a wallet beside the others, from a new seed or a restore, with the
   * network and server picked for it, and opens it. Its name, server and
   * seed backup state go to its meta. A wallet that cannot be added leaves the
   * open one as it was.
   */
  addWallet = async (
    source: NewWalletSource,
    name: string,
    draft: AddWalletDraft,
  ): Promise<AddWalletResult> => {
    await this.rpc.stopSyncProcess(SWITCH_STOP_WAIT_MS);
    await doSave();
    await this.rpc.clearTimers();
    this.keepAwake(false);

    const before = new Set(this.state.wallets.map(w => w.id));
    const chain =
      draft.keyChain.kind === 'key'
        ? draft.keyChain.chain
        : draft.server.chainName;
    const server =
      draft.server.kind === 'offline' ? offlineServer(chain) : draft.server;
    const args = [
      nativeUri(server),
      chain,
      DEFAULT_PERFORMANCE_LEVEL,
      GlobalConst.minConfirmations.toString(),
    ] as const;
    const text = source.kind === 'restore' ? source.text.toLowerCase() : '';
    const birthday =
      source.kind === 'restore' ? String(defaultTo(source.birthday, 0)) : '0';
    const result =
      source.kind === 'create'
        ? await createNewWallet(args[0], birthday, args[1], args[2], args[3])
        : isViewingKey(text)
          ? await restoreWalletFromUfvk(text, birthday, ...args)
          : await restoreWalletFromSeed(text, birthday, ...args);

    const listed = result.ok ? await walletsOnDevice() : null;
    const added =
      listed && listed.ok
        ? listed.value.wallets.find(w => !before.has(w.id))
        : undefined;
    const opened =
      added !== undefined
        ? await this.prepareAdded(added, source, name, server, draft, result)
        : null;
    if (added !== undefined && opened && opened.kind === 'opened') {
      return {
        kind: 'added',
        name: name || added.meta.name,
        params: {
          walletId: added.id,
          arrival: 'switch',
          next: 'home',
          notice: '',
          readOnly: opened.readOnly,
          orchardPool: opened.orchardPool,
          saplingPool: opened.saplingPool,
          transparentPool: opened.transparentPool,
          newWallet: true,
          firstLaunchingMessage: LaunchingModeEnum.opening,
          walletChainName: opened.walletChainName,
        },
      };
    }

    const diskFull = isDiskFull(result);
    const message = !result.ok
      ? result.error.message
      : opened && opened.kind === 'failed'
        ? opened.error.message
        : '';
    await loadWallet(
      this.state.walletId,
      nativeUri(this.state.server),
      this.state.server.chainName,
      DEFAULT_PERFORMANCE_LEVEL,
      GlobalConst.minConfirmations.toString(),
    );
    this.rpc.walletReopened();
    await this.rpc.configure();
    await this.refreshWallets();
    if (diskFull) {
      return { kind: 'diskFull' };
    }
    return {
      kind: 'failed',
      message: Utils.humanizeChainTokens(message, this.state.translate),
    };
  };

  /** A wallet just added: its name, server and backup state in its meta, then what opening it needs. */
  prepareAdded = async (
    added: WalletEntry,
    source: NewWalletSource,
    name: string,
    server: ServerType,
    draft: AddWalletDraft,
    result: FfiResult<string>,
  ): Promise<WalletOpen> => {
    await updateWalletMeta(added.id, {
      ...(name ? { name } : {}),
      seedBackedUp: source.kind !== 'create',
      seedBackedUpAt: 0,
      viewOnlyNoticeDismissed: false,
    });
    await SettingsFileImpl.writeWalletServer(
      added.id,
      server,
      draft.selectServer,
    );
    return finishWalletOpen(result, server.chainName);
  };

  /**
   * Imports the chosen wallets of a previous install beside the others, each
   * on its own network and server with its name, then opens the last one. Fails only when none could be added.
   */
  importFound = async (
    entries: RecoveryEntry[],
  ): Promise<ImportFoundResult> => {
    const added: LoadedAppNavigationState[] = [];
    let lastOpen = false;
    let diskFull = false;
    let message = '';
    for (const entry of entries) {
      const chain = entryChain(entry);
      const choice = entryServer(chain);
      const listed = await walletsOnDevice();
      const names = listed.ok ? listed.value.wallets.map(w => w.meta.name) : [];
      const name = entry.name || defaultWalletName(this.state.translate, names);
      const result = await this.addWallet(
        {
          kind: 'restore',
          text: entry.seed || entry.ufvk || '',
          birthday: entry.birthday,
        },
        name,
        { ...choice, keyChain: { kind: 'none' } },
      );
      lastOpen = result.kind === 'added';
      if (result.kind === 'diskFull') {
        diskFull = true;
        break;
      }
      if (result.kind === 'failed') {
        message = result.message;
        continue;
      }
      await updateWalletMeta(result.params.walletId, {
        fromPrevious: true,
        ...(entry.category ? { category: entry.category } : {}),
      });
      await retireImportedEntry(entry);
      added.push(result.params);
    }
    const last = added[added.length - 1];
    if (!last) {
      return diskFull ? { kind: 'diskFull' } : { kind: 'failed', message };
    }
    const opened = lastOpen
      ? { kind: 'reopened' as const, params: last }
      : await this.reopenAdded(last);
    if (opened.kind === 'failed') {
      return opened;
    }
    await this.enterAdded(
      opened.params,
      'home',
      added.length === 1
        ? (this.state.translate('found.imported-one') as string)
        : (this.state.translate('found.imported') as string).replace(
            '{n}',
            String(added.length),
          ),
    );
    return { kind: 'imported' };
  };

  /** Opens again a wallet added earlier in an import, after a later one failed and left the first wallet open. */
  reopenAdded = async (
    last: LoadedAppNavigationState,
  ): Promise<
    { kind: 'reopened'; params: LoadedAppNavigationState } | ImportFoundFailed
  > => {
    const listed = await walletsOnDevice();
    const entry = listed.ok
      ? listed.value.wallets.find(w => w.id === last.walletId)
      : undefined;
    if (!entry) {
      return { kind: 'failed', message: '' };
    }
    await this.rpc.stopSyncProcess(SWITCH_STOP_WAIT_MS);
    await doSave();
    await this.rpc.clearTimers();
    const { server } = await SettingsFileImpl.serverOf(entry.meta);
    const opened = await finishWalletOpen(
      await loadWallet(
        entry.id,
        nativeUri(server),
        server.chainName,
        DEFAULT_PERFORMANCE_LEVEL,
        GlobalConst.minConfirmations.toString(),
      ),
      server.chainName,
    );
    return opened.kind === 'opened'
      ? {
          kind: 'reopened',
          params: {
            ...last,
            readOnly: opened.readOnly,
            orchardPool: opened.orchardPool,
            saplingPool: opened.saplingPool,
            transparentPool: opened.transparentPool,
            walletChainName: opened.walletChainName,
          },
        }
      : { kind: 'failed', message: opened.error.message };
  };

  /** Opens the wallet just added on the screen the add flow started from, with what it shows on arrival. */
  enterAdded = async (
    params: LoadedAppNavigationState,
    next: 'home' | 'backup',
    notice: string,
  ) => {
    const listed = await walletsOnDevice();
    const added = listed.ok
      ? listed.value.wallets.find(w => w.id === params.walletId)
      : undefined;
    if (added) {
      await this.leaveHandoffFor(added, false);
    }
    popRoutes([
      Route.AddWallet,
      Route.NewWallet,
      Route.RestoreWallet,
      Route.FoundWallets,
    ]);
    this.props.openWallet({ ...params, next, notice });
  };

  /** Leaves what the next wallet section takes from this one: the app's settings, the next wallet's, and these figures when they belong on screen. */
  leaveHandoffFor = async (entry: WalletEntry, keepFigures: boolean) => {
    const settings = await SettingsFileImpl.readSettings();
    const { totalBalance, valueTransfers, valueTransfersTotal } = this.state;
    leaveHandoff({
      walletId: entry.id,
      opening: entry,
      settings: {
        language: this.state.language,
        privacy: this.state.privacy,
        flipToHide: this.state.flipToHide,
        biometrics: this.state.biometrics,
        blockExplorer: this.state.blockExplorer,
        addressBook: this.state.addressBook,
        backgroundSyncInfo: this.state.backgroundSyncInfo,
        server: settings.server,
        selectServer: settings.selectServer,
        seedBackedUp: settings.seedBackedUp === true,
        seedBackedUpAt: settings.seedBackedUpAt || 0,
        viewOnlyNoticeDismissed: settings.viewOnlyNoticeDismissed === true,
      },
      figures:
        keepFigures && totalBalance && valueTransfers
          ? {
              kind: 'shown',
              totalBalance,
              valueTransfers,
              valueTransfersTotal: valueTransfersTotal ?? 0,
            }
          : { kind: 'none' },
    });
  };

  /**
   * Deletes a wallet with what the app keeps beside it. The open one closes
   * first and the first wallet left opens in its place; with none left the
   * app goes back to the welcome.
   */
  deleteWallet = async (entry: WalletEntry): Promise<void> => {
    const open = entry.id === this.state.walletId;
    if (open) {
      await this.rpc.stopSyncProcess(SWITCH_STOP_WAIT_MS);
      await this.rpc.clearTimers();
      this.keepAwake(false);
    }
    const deleted = await forgetWallet(entry.id)
      .then(() => deleteWallet(entry.id))
      .catch((e): FfiResult<boolean> => ({
        ok: false,
        error: { code: 'Unknown', message: String(e) },
      }));
    if (!deleted.ok || !deleted.value) {
      if (open) {
        await this.rpc.configure();
      }
      this.addLastSnackbar(
        this.state.translate('rpc.deletewallet-error') as string,
      );
      return;
    }
    this.addLastSnackbar(
      (this.state.translate('wallets.deleted') as string).replace(
        '{name}',
        entry.meta.name,
      ),
    );
    const left = this.state.wallets.filter(w => w.id !== entry.id);
    if (!open) {
      await this.refreshWallets();
      return;
    }
    if (left.length === 0) {
      this.navigateToLoadingApp({ kind: 'onboarding', start: 'Welcome' });
      return;
    }
    this.setState({
      wallets: left,
      switching: { kind: 'opening', wallet: left[0] },
    });
    const opened = await this.openInPlace(left[0]);
    if (opened.kind === 'failed') {
      this.navigateToLoadingApp({
        kind: 'boot',
        startingApp: false,
        newWallet: false,
      });
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

  addActionSnackbar = (message: string, action: SnackbarActionType) => {
    Toast.show({
      type: 'appAction',
      text1: message,
      props: action,
      visibilityTime: ACTION_SNACKBAR_MS,
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

  // Determines `own` via RPC, then opens the shared modal so the user can
  // attach a label without leaving their current screen. Used from AddressItem
  // anywhere an address is displayed with a tappable "+ contact" icon.
  /**
   * The add button next to an address opens the New contact sheet, or the own
   * tag sheet when the address is one of this wallet's: a self-send shows one,
   * and the contact sheet refuses it.
   */
  launchAddTagModal = async (
    address: string,
    swapChain: string = GlobalConst.zecSwapChain,
    initialLabel?: string,
  ) => {
    const own = await isWalletAddress(address);
    showAddTag({ address, own, swapChain, initialLabel });
  };

  setScrollToTop = (value: boolean) => {
    this.setState({
      scrollToTop: value,
    });
  };

  setScrollToNewest = (value: boolean) => {
    this.setState({
      scrollToNewest: value,
    });
  };

  render() {
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
      rescan: this.state.rescan,
      info: this.state.info,
      zecPrice: this.state.zecPrice,
      defaultUnifiedAddress: this.state.defaultUnifiedAddress,
      sendPageState: this.state.sendPageState,
      setSendPageState: this.state.setSendPageState,
      translate: this.state.translate,
      backgroundSyncInfo: this.state.backgroundSyncInfo,
      backgroundError: this.state.backgroundError,
      setBackgroundError: this.state.setBackgroundError,
      readOnly: this.state.readOnly,
      lastError: this.state.lastError,
      setLastError: this.state.setLastError,
      orchardPool: this.state.orchardPool,
      saplingPool: this.state.saplingPool,
      transparentPool: this.state.transparentPool,
      addLastSnackbar: this.addLastSnackbar,
      addActionSnackbar: this.addActionSnackbar,
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
      setFlipToHideOption: this.setFlipToHideOption,
      seedBackedUp: this.state.seedBackedUp,
      seedBackedUpAt: this.state.seedBackedUpAt,
      setSeedBackedUp: this.setSeedBackedUp,
      viewOnlyNoticeDismissed: this.state.viewOnlyNoticeDismissed,
      dismissViewOnlyNotice: this.dismissViewOnlyNotice,

      // context settings
      server: this.state.server,
      language: this.state.language,
      privacy: this.state.privacy || this.state.faceDown,
      privacySetting: this.state.privacy,
      flipToHide: this.state.flipToHide,
      biometrics: this.state.biometrics,
      selectServer: this.state.selectServer,
      walletChainName: this.state.walletChainName,
      blockExplorer: this.state.blockExplorer,
      mixnetView: this.state.mixnetView,
      reenableMixnet: this.reenableMixnet,
      sendPermitNow: this.sendPermitNow,
      serverHealth: this.state.serverHealth,
      reportServerProbe: this.reportServerProbe,
      switchServerFromHealth: this.switchServerFromHealth,
      returnToDefaultServer: this.returnToDefaultServer,
      stayOnServer: this.stayOnServer,

      // scroll signals and wallet actions for the screens
      scrollToTop: this.state.scrollToTop,
      setScrollToTop: this.setScrollToTop,
      scrollToNewest: this.state.scrollToNewest,
      setScrollToNewest: this.setScrollToNewest,
      setShieldingAmount: this.setShieldingAmount,
      sendTransaction: this.sendTransaction,
      sendSwapDeposit: this.sendSwapDeposit,
      resumeSwapDeposit: this.resumeSwapDeposit,
      setServerOption: this.setServerOption,
      clearToAddr: this.clearToAddr,
      doRescan: this.doRescan,
      setAddressBook: this.setAddressBook,
      setLanguageOption: this.setLanguageOption,
      setBiometricsOption: this.setBiometricsOption,
      setBlockExplorerOption: this.setBlockExplorerOption,
      walletId: this.state.walletId,
      switchWallet: this.switchWallet,
      restoreInPlace: this.restoreInPlace,
      deleteWallet: this.deleteWallet,
      addWallet: this.addWallet,
      enterAdded: this.enterAdded,
      importFound: this.importFound,
      switching: this.state.switching,
      wallets: this.state.wallets,
      refreshWallets: this.refreshWallets,
    };

    return (
      <>
        <ContextAppLoadedProvider value={context}>
          <FaceDown
            enabled={this.state.flipToHide}
            onChange={this.setFaceDown}
          />
          <SwapServiceProvider chainName={this.state.walletChainName}>
            <PriceTrafficDriver />
            <SwapExpiryNotice />
            <GestureHandlerRootView>
              <BottomSheetModalProvider>
                <BottomSheetBackHandler />
                <ConfirmBottomSheet />
                <WalletsSheet />
                <ServerHealthSheet />
                <OptionsPanelProvider>
                  <FadeInOnMount
                    duration={
                      this.props.handoff.kind === 'handoff' ? 0 : HOME_FADE_MS
                    }
                  >
                    {/* The tooltip layer for screens outside any sheet or panel. */}
                    <TooltipHost>
                      <WalletNavigator />
                    </TooltipHost>
                  </FadeInOnMount>
                  {/* While another wallet opens, the screens still show the last one's figures: nothing on them answers a touch. */}
                  {this.state.switching.kind === 'opening' && (
                    <View
                      testID="wallets.opening-shield"
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                </OptionsPanelProvider>
                <AddTagModalHost />
              </BottomSheetModalProvider>
            </GestureHandlerRootView>
          </SwapServiceProvider>
        </ContextAppLoadedProvider>
        {Platform.OS === GlobalConst.platformOSios ? (
          /** Modal by default, the overlay hides the app below it from VoiceOver. */
          <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
            <Toast config={toastConfig} />
          </FullWindowOverlay>
        ) : (
          <Toast config={toastConfig} />
        )}
      </>
    );
  }
}
