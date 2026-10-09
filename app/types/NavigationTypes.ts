import type { NavigatorScreenParams } from '@react-navigation/native';
import {
  AddressKindEnum,
  ChainNameEnum,
  LaunchingModeEnum,
  RouteEnum,
  SeedActionEnum,
  SendPageStateClass,
  UfvkActionEnum,
  ValueTransferType,
  ProposalPoolsType,
} from '@app/AppState';
import type { ComputingEnd } from '@app/walletBackend/transforms/sendSettlement';
import { RPCDrainTxType } from '@app/walletBackend/types/RPCDrainPlanType';
import { RPCMigrationPlanType } from '@app/walletBackend/types/RPCMigrationPlanType';

// The root stack: one section, chosen by the session, plus the scanners,
// which sit above every section and its bottom-sheet portal.
export type RootParamList = {
  [RouteEnum.Loading]: undefined;
  [RouteEnum.Wallet]: NavigatorScreenParams<AppDrawerParamList> | undefined;
  [RouteEnum.ScannerAddress]: ScannerAddressNavigationState | undefined;
  [RouteEnum.ScannerUfvk]: ScannerUfvkNavigationState | undefined;
};

// The loading section: the boot gate, the lock, and the onboarding stage.
export type LoadingParamList = {
  [RouteEnum.Boot]: undefined;
  [RouteEnum.Lock]: undefined;
  [RouteEnum.Onboarding]: undefined;
};

export type HomeTabParamList = {
  [RouteEnum.History]: undefined;
  [RouteEnum.Send]: undefined;
  [RouteEnum.Receive]: undefined;
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

// How the backup flow opens: grown out of the History notice card, pushed
// from Wallet Seed, or straight to the three-word check from Wallet Seed.
export type SeedBackupEntry =
  { kind: 'card'; from: CardRect } | { kind: 'push' } | { kind: 'verify' };

// The wallet section's stack: the home tabs and every screen pushed over them.
export type AppDrawerParamList = {
  [RouteEnum.HomeStack]: NavigatorScreenParams<HomeTabParamList> | undefined;
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
  [RouteEnum.WalletSeed]: undefined;
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
  [RouteEnum.Ufvk]: UfvkNavigationState | undefined;
  [RouteEnum.Seed]: SeedNavigationState | undefined;
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
  active: boolean;
  // When true the scanner returns the scanned string verbatim — no `zcash:`
  // prefixing — for non-Zcash address fields (address book). The caller
  // validates it per its own chain.
  raw?: boolean;
};

export type ScannerUfvkNavigationState = {
  setUfvkText: (k: string) => void;
  active: boolean;
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

export type UfvkNavigationState = {
  action: UfvkActionEnum;
};

export type SeedNavigationState = {
  action: SeedActionEnum;
};
