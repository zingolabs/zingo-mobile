import type { ScanTexts } from '@ui/widgets/ScanOverlay';
import type { RevealOrigin } from '@ui/widgets/CircularReveal';
import {
  AddressKindEnum,
  BiometricGateOutcome,
  ChainNameEnum,
  LaunchingModeEnum,
  RouteEnum,
  SendPageStateClass,
  ValueTransferType,
  ProposalPoolsType,
} from '@app/AppState';
import type { ComputingEnd } from '@app/walletBackend/transforms/sendSettlement';
import { RPCDrainTxType } from '@app/walletBackend/types/RPCDrainPlanType';
import { RPCMigrationPlanType } from '@app/walletBackend/types/RPCMigrationPlanType';

/**
 * Root navigation parameter list for the main stack navigator
 * This defines the structure of parameters passed between main app screens
 */
export type AppStackParamList = {
  // Stack
  [RouteEnum.LoadingApp]: LoadingAppNavigationState | undefined;
  [RouteEnum.LoadedApp]: LoadedAppNavigationState | undefined;
  // ScannerAddress is presented as a transparent modal at the
  // root Stack so they overlay everything (LoadedApp, LoadingApp, and any
  // open BottomSheet portals).
  [RouteEnum.ScannerAddress]: ScannerAddressNavigationState | undefined;
};

/**
 * Navigation state used for internal app navigation within LoadedApp
 * Used for methods like navigateToLoadingApp and onClickOKChangeWallet
 */
export type LoadingAppNavigationState = {
  screen?: RouteEnum;
  startingApp?: boolean;
  // The gate outcome rides with the navigation whole, so a declined gate
  // always carries its failure and the locked screen renders the reason it
  // was locked for.
  biometricGate?: BiometricGateOutcome;
  newWallet?: boolean;
};
/**
 * Navigation state used for internal app navigation within LoadedApp
 * Used for methods like navigateToLoadedApp
 */
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
  [RouteEnum.HomeStack]: undefined;
  [RouteEnum.History]: undefined;
  [RouteEnum.Send]: undefined;
  [RouteEnum.Receive]: undefined;
  [RouteEnum.Messages]: undefined;
  [RouteEnum.Settings]: undefined;
  [RouteEnum.Server]: undefined;
  [RouteEnum.About]: undefined;
  [RouteEnum.MixnetDoctor]: undefined;
  [RouteEnum.Rescan]: undefined;
  [RouteEnum.Insight]: undefined;
  [RouteEnum.Computing]: ComputingEnd | undefined;
  [RouteEnum.SyncReport]: undefined;
  [RouteEnum.Pools]: undefined;
  [RouteEnum.MeetIronwood]: undefined;
  [RouteEnum.SeedBackup]: { entry: SeedBackupEntry };
  // Absent for the plain view; set when the seed is shown before leaving
  // this wallet or its server.
  [RouteEnum.WalletSeed]: { action: WalletSeedAction } | undefined;
  // `switchTo`: shown before a view-only wallet moves to a server on that
  // network.
  [RouteEnum.ViewingKey]: { entry: ViewingKeyEntry; switchTo?: ChainNameEnum };
  [RouteEnum.MigrationStrategy]: undefined;
  [RouteEnum.MigrationTransactions]: undefined;
  // The immediate drain broadcasts here; `transactions` is the previewed plan,
  // so the list matches what the user accepted while the drain re-plans/sends.
  [RouteEnum.MigrationSending]: { transactions: RPCDrainTxType[] };
  [RouteEnum.MigrationSplitPlan]: undefined;
  // The splitting loop runs here; `plan` is the consented preview so the
  // transaction rows match what the user accepted. Absent on banner-rescue
  // re-entry, where the screen renders coarsely from migrationStatus.
  [RouteEnum.MigrationSplitting]: { plan?: RPCMigrationPlanType } | undefined;
  [RouteEnum.MigrationCadence]: undefined;
  // The cadence the user picked, so Back from the review screen can restore
  // the selection.
  [RouteEnum.MigrationSchedule]: { perBucket: number };
  // The in-flight "Migration underway" monitor: the landing after the schedule
  // is confirmed and the parts_scheduled banner's resume target. Reads
  // migrationStatus, so it needs no params.
  [RouteEnum.MigrationStatus]: undefined;
  // Broadcasts the open window's due batch (execute_due_parts) with live
  // progress. `denominations` is the window's batch, previewed while the send
  // runs; absent on a defensive re-entry, where the screen sends whatever is
  // due.
  [RouteEnum.MigrationBatchSending]: { denominations?: number[] } | undefined;

  // Drawer with params
  [RouteEnum.AddressBook]: AddressBookNavigationState | undefined;
  [RouteEnum.AddressList]: AddressListNavigationState | undefined;
  [RouteEnum.ValueTransferDetail]:
    ValueTransferDetailNavigationState | undefined;
  [RouteEnum.Confirm]: ConfirmNavigationState | undefined;
};

export type AddressBookNavigationState = {
  currentAddress: string;
  routeStack: RouteEnum;
};

export type AddressListNavigationState = {
  addressKind: AddressKindEnum;
  setIndex: (n: number) => void;
};

export type ScannerAddressNavigationState = {
  setAddress: (a: string) => void;
  // What the scan is for, and its words, set by the caller.
  accepts: (value: string) => boolean | Promise<boolean>;
  texts: ScanTexts;
  // The scan button's centre, where the camera opens from.
  origin?: RevealOrigin;
};

export type ValueTransferDetailNavigationState = {
  index: number;
  vt: ValueTransferType;
  valueTransfersSliced: ValueTransferType[];
  totalLength: number;
};

export type ConfirmNavigationState = {
  calculatedFee: number;
  proposalPools: ProposalPoolsType;
  confirmSend: (s: SendPageStateClass) => Promise<void>;
  sendAllAmount: boolean;
  calculateFeeWithPropose: (
    amount: string,
    address: string,
    memo: string,
    includeUAMemo: boolean,
  ) => Promise<void>;
  sendPageState: SendPageStateClass;
};
