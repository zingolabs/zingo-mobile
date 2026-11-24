import type {
  CompositeNavigationProp,
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { SwapPrefillType } from '@app/swap/types/SwapPrefillType';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RevealOrigin } from '@ui/widgets/CircularReveal';
import type { Request } from '@app/navigation/results';
import {
  ChainNameEnum,
  ValueTransferKindEnum,
  LaunchingModeEnum,
  Route,
  SendPageStateClass,
  ValueTransferType,
  ProposalPoolsType,
} from '@app/AppState';
import type { ComputingParams } from '@app/walletBackend/transforms/sendSettlement';
import { RPCDrainTxType } from '@app/walletBackend/types/RPCDrainPlanType';
import type { SwapReview } from '@screens/Swap/useSwapForm';
import type { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';

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
  [Route.FoundWallets]: undefined;
  // `chain`: the network the screen opens on, when the wallet's network is
  // not the server's.
  [Route.Server]: { chain?: ChainNameEnum } | undefined;
  [Route.ServerList]: { chain: ChainNameEnum };
  [Route.Progress]: { kind: 'import' | 'importAll' | 'create' };
  // `from`: what the first wallet is made from, for its mark and its button.
  [Route.NameWallet]: { from: 'create' | 'seed' | 'key' };
  [Route.OpenError]: undefined;
};

export type OnboardingRoute = keyof OnboardingParamList;

export type HomeTabParamList = {
  [Route.History]: undefined;
  [Route.Send]: undefined;
  [Route.Receive]: undefined;
  [Route.Swap]: { prefill?: SwapPrefillType } | undefined;
};

// What the loading section hands the wallet section when a wallet opens.
export type LoadedAppNavigationState = {
  /** The open wallet: a new id remounts the wallet section, as a switch does. */
  walletId: string;
  /** Opened at launch, or picked in Wallets while another was open. */
  arrival: 'boot' | 'switch';
  /** Where the wallet goes once open: Home, straight to backing up its new seed, or the Wallets sheet. */
  next: 'home' | 'backup' | 'wallets';
  /** A note to show once it is open: the toast of a wallet just added. */
  notice: string;
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
  [Route.Swap]: { prefill?: SwapPrefillType } | undefined;
  [Route.Messages]: undefined;
  [Route.Settings]: undefined;
  // `walletId`: the wallet whose server changes; none is the open one.
  // `draft`: the wallet being added, which has no id yet.
  [Route.Server]: { walletId: string } | { draft: true } | undefined;
  [Route.About]: undefined;
  [Route.MixnetDoctor]: undefined;
  [Route.Insight]: undefined;
  [Route.Computing]: ComputingParams | undefined;
  [Route.SyncReport]: undefined;
  [Route.Pools]: undefined;
  [Route.MeetIronwood]: undefined;
  [Route.SeedBackup]: { entry: SeedBackupEntry };
  [Route.AddWallet]: undefined;
  [Route.NewWallet]: undefined;
  // `mode`: what the user said they restore from; the field takes either.
  [Route.RestoreWallet]: { mode: 'seed' | 'key' };
  [Route.FoundWallets]: undefined;
  /** A wallet that failed to open in place, with why. */
  [Route.WalletOpenError]: { walletId: string; details: string };
  // Absent for the plain view; set when the seed is shown before leaving
  // this wallet or its server.
  /** Another wallet's saved phrase, by its id, when it won't open; the open wallet's otherwise. */
  [Route.WalletSeed]: { walletId: string } | undefined;
  // `switchTo`: shown before a view-only wallet moves to a server on that
  // network.
  [Route.ViewingKey]: { entry: ViewingKeyEntry };
  [Route.MigrationStrategy]: undefined;
  [Route.MigrationTransactions]: undefined;
  // The immediate drain broadcasts here; `transactions` is the previewed plan,
  // so the list matches what the user accepted while the drain re-plans/sends.
  [Route.MigrationSending]: { transactions: RPCDrainTxType[] };

  // Drawer with params
  [Route.AddressBook]: AddressBookNavigationState | undefined;
  [Route.AddressList]: AddressListNavigationState | undefined;
  [Route.ValueTransferDetail]: ValueTransferDetailNavigationState | undefined;
  [Route.Confirm]: ConfirmNavigationState;
  [Route.SwapReview]: SwapReviewNavigationState;
  [Route.SwapDeposit]: SwapRecordNavigationState;
  [Route.SwapTracking]: SwapRecordNavigationState;
  [Route.SwapResult]: SwapRecordNavigationState;
  [Route.SwapDetail]: SwapRecordNavigationState;
  [Route.SwapTransaction]: SwapTransactionNavigationState;
};

export type AddressBookNavigationState = {
  // Opens the book as a picker; the chosen address is delivered under this
  // request.
  pick: Request;
  /** SwapKit chain code of the contacts offered; Zcash when absent. */
  chain?: string;
};

/** The address Receive shows, marked in the list; the pick returns as 'receive.pick'. */
export type AddressListNavigationState = {
  current?: string;
};

// Which codes the scanner takes: any, a Zcash address or URI on a chain, or
// an address of a swap chain.
export type ScanAccepts =
  | { kind: 'any' }
  | { kind: 'zcash'; chain: ChainNameEnum }
  | { kind: 'chain'; chain: string; network: ChainNameEnum };

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

// What the swap form agreed to, copied when Continue was pressed so a
// refresh behind the review cannot move it.
export type SwapReviewNavigationState = {
  review: SwapReview;
  direction: SwapDirectionEnum;
};

// One of a swap's Zcash transactions: its txid and kind, since a send to
// self lists the same txid twice.
export type SwapTransactionNavigationState = {
  recordId: string;
  txid: string;
  kind: ValueTransferKindEnum;
  /** Which of the transaction's transfers of that kind (`legSlot`). */
  slot: number;
};

/** Why the wallet's own broadcast of an outbound deposit did not go out: another sale holds its deposit, or the backend failed. */
export type DepositFailure =
  { kind: 'none' } | { kind: 'heldByOther' } | { kind: 'failed'; text: string };

// A swap by its local record id; the screen reads the live record.
export type SwapRecordNavigationState = {
  recordId: string;
  broadcastFailure?: DepositFailure;
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
