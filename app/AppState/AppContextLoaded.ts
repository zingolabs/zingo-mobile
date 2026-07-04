import TotalBalanceClass from './classes/TotalBalanceClass';
import UnifiedAddressClass from './classes/UnifiedAddressClass';
import SendPageStateClass from './classes/SendPageStateClass';
import AddressBookFileClass from './classes/AddressBookFileClass';

import InfoType from './types/InfoType';
import ZecPriceType from './types/ZecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';
import BackgroundErrorType from './types/BackgroundErrorType';
import ServerType from './types/ServerType';
import SecurityType from './types/SecurityType';

import { LanguageEnum } from './enums/LanguageEnum';
import { CurrencyEnum } from './enums/CurrencyEnum';
import { ModeEnum } from './enums/ModeEnum';
import { SelectServerEnum } from './enums/SelectServerEnum';
import { SnackbarDurationEnum } from './enums/SnackbarDurationEnum';
import { LoadedAppNavigationState } from '../types';
import ValueTransferType from './types/ValueTransferType';
import { RPCSyncStatusType } from '../walletBackend/types/RPCSyncStatusType';
import TransparentAddressClass from './classes/TransparentAddressClass';
import { ScreenEnum } from './enums/ScreenEnum';
import { RPCPerformanceLevelEnum } from '../walletBackend/enums/RPCPerformanceLevelEnum';
import { BlockExplorerEnum } from './enums/BlockExplorerEnum';
import { SwapRecordType } from '../swap';

export default interface AppContextLoaded {
  netInfo: NetInfoType;

  // The total confirmed and pending balance in this wallet
  totalBalance: TotalBalanceClass | null;

  // List of all diversified addresses of the wallet
  addresses: (UnifiedAddressClass | TransparentAddressClass)[] | null;

  // List of all T and Z and O value transfers
  valueTransfers: ValueTransferType[] | null;
  valueTransfersTotal: number | null;

  // Live mirror of `SwapStore` — every persistent swap record this wallet
  // has created. Populated on app load and kept in sync with the on-disk
  // store via `SwapStore.subscribe`. The history screen merges these with
  // `valueTransfers` to render swap rows alongside the zingolib-reported
  // transactions. May be `null` before the initial fetch resolves.
  swapRecords: SwapRecordType[] | null;

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
  setBackgroundSyncErrorInfo: (e: string) => void;

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

  // if the App is stalled - restart is fired
  restartApp: (s: LoadedAppNavigationState) => void;

  // some ValueTransfer is pending?
  somePending: boolean;

  // List of our contacts - Address book
  addressBook: AddressBookFileClass[];

  // Opens the shared "Add Tag / Add Contact" BottomSheet modal in-place,
  // pre-filled with the given address. Used from any screen that displays an
  // address (AddressItem's + icon).
  launchAddTagModal: (address: string) => void;

  // is calculated in the header & needed in the send screen
  shieldingAmount: number;

  // indicate if the swipeable icons are visible or not.
  showSwipeableIcons: boolean;

  // refresh the different list in the App: history & messages
  doRefresh: (s: ScreenEnum) => void;

  // fetch the ZEC price in USD
  setZecPrice: (p: number, d: number) => void;

  // donation address
  zenniesDonationAddress: string;

  // zingolib Version
  zingolibVersion: string;

  // Change the privacy everywhere
  setPrivacyOption: (value: boolean) => Promise<void>;

  // settings
  server: ServerType;
  currency: CurrencyEnum;
  language: LanguageEnum;
  sendAll: boolean;
  donation: boolean;
  privacy: boolean;
  mode: ModeEnum;
  security: SecurityType;
  selectServer: SelectServerEnum;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  performanceLevel: RPCPerformanceLevelEnum;
  blockExplorer: BlockExplorerEnum;
  nym: boolean;
  setNymOption: (value: boolean) => Promise<void>;
  setModeOption: (value: string) => Promise<void>;
  setCurrencyOption: (value: CurrencyEnum) => Promise<void>;

  // Monotonically increasing counter incremented every time the app
  // returns from background/inactive to active. Protected screens
  // (Seed, ShowUfvk, Settings, Rescan, Confirm) watch it to re-fire
  // their on-mount biometric gate when security.foregroundApp is OFF
  // and the screen is still mounted on resume — closing the gap where
  // a sensitive screen could be revealed without a fresh auth.
  foregroundEpoch: number;
}
