import type {
  CompositeNavigationProp,
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RevealOrigin } from '@ui/widgets/CircularReveal';
import type { Request } from '@app/navigation/results';
import {
  AddressKindEnum,
  ChainNameEnum,
  LaunchingModeEnum,
  Route,
  SendPageStateClass,
  ValueTransferType,
  ProposalPoolsType,
} from '@app/AppState';
import type { ComputingEnd } from '@app/walletBackend/transforms/sendSettlement';
import { RPCDrainTxType } from '@app/walletBackend/types/RPCDrainPlanType';
import { RPCMigrationPlanType } from '@app/walletBackend/types/RPCMigrationPlanType';

// The root stack: one section, chosen by the session, plus the scanner,
// which sits above every section and its bottom-sheet portal.
export type RootParamList = {
  [Route.Loading]: NavigatorScreenParams<LoadingParamList> | undefined;
  [Route.Wallet]: NavigatorScreenParams<AppDrawerParamList> | undefined;
  [Route.Scanner]: ScannerNavigationState | undefined;
};

// The loading section: the boot gate, the lock, and the onboarding stage.
export type LoadingParamList = {
  [Route.Boot]: undefined;
  [Route.Lock]: undefined;
  [Route.Onboarding]: NavigatorScreenParams<OnboardingParamList> | undefined;
};

// The onboarding stage: no wallet, or one that failed to open.
export type OnboardingParamList = {
  [Route.Welcome]: undefined;
  [Route.ImportChooser]: undefined;
  [Route.ImportWallet]: undefined;
  // `chain`: the network the screen opens on, when the wallet's network is
  // not the server's.
  [Route.Server]: { chain?: ChainNameEnum } | undefined;
  [Route.ServerList]: { chain: ChainNameEnum };
  [Route.Progress]: { kind: 'import' | 'create' };
  [Route.OpenError]: undefined;
};

export type OnboardingRoute = keyof OnboardingParamList;

export type HomeTabParamList = {
  [Route.History]: undefined;
  [Route.Send]: undefined;
  [Route.Receive]: undefined;
};

// What the loading section hands the wallet section when a wallet opens.
export type LoadedAppNavigationState = {
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  newWallet: boolean;
  firstLaunchingMessage: LaunchingModeEnum;
  // The opened wallet's own chain, resolved at open time (reliable even
  // Offline). Threaded to LoadedApp so its context can hold it.
  walletChainName: ChainNameEnum;
};

// A card's rect in window coordinates.
export type CardRect = { x: number; y: number; width: number; height: number };

export type WalletSeedAction = 'change' | 'server';

// How the viewing key screen opens: a circle out of the header snowflake,
// the view-only card growing, or pushed from the menu.
export type ViewingKeyEntry =
  | { kind: 'circle'; origin: { x: number; y: number } }
  | { kind: 'card'; from: CardRect }
  | { kind: 'push' };

// How the backup flow opens: grown out of the History notice card, pushed
// from Wallet Seed, or straight to the three-word check from Wallet Seed.
export type SeedBackupEntry =
  { kind: 'card'; from: CardRect } | { kind: 'push' } | { kind: 'verify' };

/**
 * Root drawer parameter list for the main stack navigator
 * This defines the structure of parameters passed between main app screens
 */
export type AppDrawerParamList = {
  // Drawer no params
  [Route.Home]: NavigatorScreenParams<HomeTabParamList> | undefined;
  [Route.History]: undefined;
  [Route.Send]: undefined;
  [Route.Receive]: undefined;
  [Route.Messages]: undefined;
  [Route.Settings]: undefined;
  [Route.Server]: undefined;
  [Route.About]: undefined;
  [Route.MixnetDoctor]: undefined;
  [Route.Insight]: undefined;
  [Route.Computing]: ComputingEnd | undefined;
  [Route.SyncReport]: undefined;
  [Route.Pools]: undefined;
  [Route.MeetIronwood]: undefined;
  [Route.SeedBackup]: { entry: SeedBackupEntry };
  // Absent for the plain view; set when the seed is shown before leaving
  // this wallet or its server.
  [Route.WalletSeed]: { action: WalletSeedAction } | undefined;
  // `switchTo`: shown before a view-only wallet moves to a server on that
  // network.
  [Route.ViewingKey]: { entry: ViewingKeyEntry; switchTo?: ChainNameEnum };
  [Route.MigrationStrategy]: undefined;
  [Route.MigrationTransactions]: undefined;
  // The immediate drain broadcasts here; `transactions` is the previewed plan,
  // so the list matches what the user accepted while the drain re-plans/sends.
  [Route.MigrationSending]: { transactions: RPCDrainTxType[] };
  [Route.MigrationSplitPlan]: undefined;
  // The splitting loop runs here; `plan` is the consented preview so the
  // transaction rows match what the user accepted. Absent on banner-rescue
  // re-entry, where the screen renders coarsely from migrationStatus.
  [Route.MigrationSplitting]: { plan?: RPCMigrationPlanType } | undefined;
  [Route.MigrationCadence]: undefined;
  // The cadence the user picked, so Back from the review screen can restore
  // the selection.
  [Route.MigrationSchedule]: { perBucket: number };
  // The in-flight "Migration underway" monitor: the landing after the schedule
  // is confirmed and the parts_scheduled banner's resume target. Reads
  // migrationStatus, so it needs no params.
  [Route.MigrationStatus]: undefined;
  // Broadcasts the open window's due batch (execute_due_parts) with live
  // progress. `denominations` is the window's batch, previewed while the send
  // runs; absent on a defensive re-entry, where the screen sends whatever is
  // due.
  [Route.MigrationBatchSending]: { denominations?: number[] } | undefined;

  // Drawer with params
  [Route.AddressBook]: AddressBookNavigationState | undefined;
  [Route.AddressList]: AddressListNavigationState | undefined;
  [Route.ValueTransferDetail]: ValueTransferDetailNavigationState | undefined;
  [Route.Confirm]: ConfirmNavigationState | undefined;
};

export type AddressBookNavigationState = {
  // Opens the book as a picker; the chosen address is delivered under this
  // request.
  pick: Request;
};

export type AddressListNavigationState = {
  addressKind: AddressKindEnum;
  // The chosen index is delivered under this request.
  request: Request;
};

// Which codes the scanner takes: any, a Zcash address or URI on a chain, or
// an address of a swap chain.
export type ScanAccepts =
  | { kind: 'any' }
  | { kind: 'zcash'; chain: ChainNameEnum }
  | { kind: 'chain'; chain: string };

export type ScanRouteTexts = {
  title: string;
  hint: string;
  miss: string;
  found: string;
  back: string;
  torch: string;
};

export type ScannerNavigationState = {
  // The code read is delivered under this request.
  request: Request;
  accepts: ScanAccepts;
  texts: ScanRouteTexts;
  // The scan button's centre, where the camera opens from.
  origin?: RevealOrigin;
};

export type ValueTransferDetailNavigationState = {
  index: number;
  vt: ValueTransferType;
  valueTransfersSliced: ValueTransferType[];
  totalLength: number;
};

// The confirmation delivers `send.propose` on entry and `send.confirm` on
// the button; Send, beneath it, runs the proposal and the send.
export type ConfirmNavigationState = {
  calculatedFee: number;
  proposalPools: ProposalPoolsType;
  sendAllAmount: boolean;
  sendPageState: SendPageStateClass;
};

// What `useNavigation()` gives inside the wallet: the wallet stack and the
// root above it, so a screen or widget can reach any route of the two
// without a cast. A home tab's own navigation is a superset of this.
export type WalletNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<AppDrawerParamList>,
  NativeStackNavigationProp<RootParamList>
>;

type AppRootParamList = RootParamList;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AppRootParamList {}
  }
}

// The props of a home tab screen: the tabs, then the reach of
// `WalletNavigation`.
export type HomeTabScreenProps<T extends keyof HomeTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<HomeTabParamList, T>,
    CompositeScreenProps<
      NativeStackScreenProps<AppDrawerParamList>,
      NativeStackScreenProps<RootParamList>
    >
  >;

// What `useNavigation()` gives inside a home tab: the tab events too.
export type HomeTabNavigation<T extends keyof HomeTabParamList> =
  HomeTabScreenProps<T>['navigation'];
