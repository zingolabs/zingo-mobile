import { TotalBalanceClass } from '@app/wallet/classes';
import { UnifiedAddressClass } from '@app/wallet/classes';
import { SendPageStateClass } from '@app/wallet/classes';
import AddressBookFileClass from './classes/AddressBookFileClass';

import InfoType from './types/InfoType';
import ZecPriceType from './types/ZecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';
import BackgroundErrorType from './types/BackgroundErrorType';
import ServerType from './types/ServerType';

import { LanguageEnum } from './enums/LanguageEnum';
import { SelectServerEnum } from './enums/SelectServerEnum';
import { ChainNameEnum } from './enums/ChainNameEnum';
import { SnackbarDurationEnum } from './enums/SnackbarDurationEnum';
import { SnackbarActionType } from './types/SnackbarActionType';
import type { ValueTransferType } from '@app/wallet/types';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RescanState } from '@app/walletBackend/utils/syncProgress';
import { TransparentAddressClass } from '@app/wallet/classes';
import { BlockExplorerEnum } from './enums/BlockExplorerEnum';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import { ServerHealthView } from '@app/services/serverHealthMonitor';
import type { SwapDepositArgs } from '@app/walletBackend/modules/TransactionService';
import type {
  SendOutcome,
  SendPermit,
} from '@app/walletBackend/transforms/sendPermit';
import { SetServerResult } from './types/SetServerResult';
import type { WalletEntry } from '@app/walletBackend/utils/walletStore';
import type { AddWalletDraft } from '@app/services/addWalletDraft';
import type { RecoveryEntry } from '@app/services/recoveryWalletInfo';
import type { LoadedAppNavigationState } from '@app/types/NavigationTypes';

/** What a wallet being added is made from. */
export type NewWalletSource =
  { kind: 'create' } | { kind: 'restore'; text: string; birthday: number };

export type AddWalletResult =
  | { kind: 'added'; name: string; params: LoadedAppNavigationState }
  | { kind: 'diskFull' }
  | { kind: 'failed'; message: string };

export type ImportFoundFailed = { kind: 'failed'; message: string };

export type ImportFoundResult =
  { kind: 'imported' } | { kind: 'diskFull' } | ImportFoundFailed;

export type WalletSwitchOutcome = { kind: 'opened' } | { kind: 'failed' };

export type WalletSwitch =
  { kind: 'none' } | { kind: 'opening'; wallet: WalletEntry };

export default interface AppContextLoaded {
  netInfo: NetInfoType;

  // The total confirmed and pending balance in this wallet
  totalBalance: TotalBalanceClass | null;

  // List of all diversified addresses of the wallet
  addresses: (UnifiedAddressClass | TransparentAddressClass)[] | null;

  // List of all T and Z and O value transfers
  valueTransfers: ValueTransferType[] | null;
  valueTransfersTotal: number | null;

  // List of messages
  messages: ValueTransferType[] | null;
  messagesTotal: number | null;

  // The state of the send page
  sendPageState: SendPageStateClass;
  setSendPageState: (s: SendPageStateClass) => void;

  // getinfo and getblockchaininfo result
  info: InfoType;

  // syncing Info about the status of the process
  syncingStatus: RPCSyncStatusType;

  // where a user rescan stands
  rescan: RescanState;

  // wallet birthday block height
  birthday: number;

  // active UA in the wallet
  defaultUnifiedAddress: string;

  // zec price in USD from internet
  zecPrice: ZecPriceType;

  // helper to get text tranalated to the active language
  translate: (key: string) => TranslateType;

  // info about background syncing
  backgroundSyncInfo: BackgroundType;

  // Error from the App when is in background
  backgroundError: BackgroundErrorType;
  setBackgroundError: (title: string, error: string) => void;

  // Last fetching error
  lastError: string;
  setLastError: (e: string) => void;

  // this wallet is watch-only (Readonly)
  readOnly: boolean;

  // pools available
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;

  addLastSnackbar: (message: string, duration?: SnackbarDurationEnum) => void;
  /** A short toast with one action beside the text, such as Undo. */
  addActionSnackbar: (message: string, action: SnackbarActionType) => void;

  // if the App is stalled - restart is fired
  restartApp: () => void;

  // The header asks the lists to scroll; a list clears the request.
  scrollToTop: boolean;
  setScrollToTop: (value: boolean) => void;
  scrollToNewest: boolean;
  setScrollToNewest: (value: boolean) => void;
  setShieldingAmount: (value: number) => void;

  // Wallet actions the screens run; the provider owns the wallet backend.
  sendTransaction: (
    s: SendPageStateClass,
    sendAll?: boolean,
  ) => Promise<SendOutcome<string>>;
  // A swap deposit: the txids in order, the vault payment last. The resume
  // transmits the OP_RETURN step of a deposit whose deshield already went out.
  sendSwapDeposit: (args: SwapDepositArgs) => Promise<string[]>;
  resumeSwapDeposit: () => Promise<string[]>;
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
  ) => Promise<SetServerResult>;
  clearToAddr: () => void;
  doRescan: () => Promise<void>;
  setAddressBook: (ab: AddressBookFileClass[]) => void;
  setLanguageOption: (value: LanguageEnum) => Promise<void>;
  setBiometricsOption: (value: boolean) => Promise<void>;
  setBlockExplorerOption: (value: BlockExplorerEnum) => Promise<void>;
  // The seed and viewing key screens confirm these; each leaves the wallet
  // section or its server.
  /** The open wallet's id. */
  walletId: string;
  /** Opens another wallet in place, Home staying until it is open. */
  switchWallet: (entry: WalletEntry) => Promise<WalletSwitchOutcome>;
  /** A wallet that won't open, restored from its saved phrase in its place, with its name. */
  restoreInPlace: (entry: WalletEntry) => Promise<void>;
  /** The wallet being opened in place, named on Home's sync line. */
  switching: WalletSwitch;
  /** The wallets on the device, in the order they were added. */
  wallets: WalletEntry[];
  /** Adds a wallet beside the others; the open one stays as it was when it fails. */
  addWallet: (
    source: NewWalletSource,
    name: string,
    draft: AddWalletDraft,
  ) => Promise<AddWalletResult>;
  /** Opens a wallet just added: Home, or its seed backup first, with a note. */
  enterAdded: (
    params: LoadedAppNavigationState,
    next: 'home' | 'backup',
    notice: string,
  ) => Promise<void>;
  /** Imports wallets a previous install left in the Keychain and opens the last one. */
  importFound: (entries: RecoveryEntry[]) => Promise<ImportFoundResult>;
  /** Deletes a wallet; the open one hands over to the first wallet left. */
  deleteWallet: (entry: WalletEntry) => Promise<void>;
  /** Reads the wallets again, after one is renamed or deleted. */
  refreshWallets: () => Promise<void>;

  // some ValueTransfer is pending?
  somePending: boolean;

  // List of our contacts - Address book
  addressBook: AddressBookFileClass[];

  // Opens the shared "Add Tag / Add Contact" BottomSheet modal in-place,
  // pre-filled with the given address. Used from any screen that displays an
  // address (AddressItem's + icon).
  launchAddTagModal: (
    address: string,
    swapChain?: string,
    initialLabel?: string,
  ) => void;

  // is calculated in the header & needed in the send screen
  shieldingAmount: number;

  // indicate if the swipeable icons are visible or not.
  showSwipeableIcons: boolean;

  // refresh the different list in the App: history & messages
  doRefresh: (what: 'valueTransfers' | 'messages') => void;

  // fetch the ZEC price in USD
  setZecPrice: (p: number, d: number) => void;

  // zingolib Version
  zingolibVersion: string;

  // Change the privacy everywhere
  setPrivacyOption: (value: boolean) => Promise<void>;

  // The user confirmed the seed phrase in the backup flow, or restored it.
  seedBackedUp: boolean;
  // When the last backup was confirmed (ms); 0 for a restored wallet.
  seedBackedUpAt: number;
  setSeedBackedUp: (value: boolean) => Promise<void>;
  // The user closed the view-only notice; it stays closed for this wallet.
  viewOnlyNoticeDismissed: boolean;
  dismissViewOnlyNotice: () => Promise<void>;

  // settings
  server: ServerType;
  language: LanguageEnum;
  privacy: boolean;
  biometrics: boolean;
  selectServer: SelectServerEnum;
  // The loaded wallet's OWN chain (main/test/regtest). Empty when no wallet /
  // unknown. Used to decide, on a server change, whether to open the wallet
  // directly or launch a chain switch.
  walletChainName: ChainNameEnum;
  blockExplorer: BlockExplorerEnum;
  // The persisted send-route preference; the transport runs either way.

  mixnetView: MixnetView;
  reenableMixnet: () => Promise<void>;
  // Reads the send permit from the state at call time.
  sendPermitNow: () => SendPermit;

  /** The open wallet's server health, as the monitor last saw it. */
  serverHealth: ServerHealthView;
  reportServerProbe: (
    uri: string,
    probe: { latency: number | null; height: string },
  ) => void;
  switchServerFromHealth: (server: ServerType) => Promise<boolean>;
  returnToDefaultServer: () => Promise<void>;
  stayOnServer: () => void;
}
