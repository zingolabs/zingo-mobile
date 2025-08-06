import TotalBalanceClass from './classes/TotalBalanceClass';
import UnifiedAddressClass from './classes/UnifiedAddressClass';
import SendPageStateClass from './classes/SendPageStateClass';
import WalletSettingsClass from './classes/WalletSettingsClass';
import AddressBookFileClass from './classes/AddressBookFileClass';

import InfoType from './types/InfoType';
import WalletType from './types/WalletType';
import ZecPriceType from './types/ZecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';
import BackgroundErrorType from './types/BackgroundErrorType';
import ServerType from './types/ServerType';
import SnackbarType from './types/SnackbarType';
import SecurityType from './types/SecurityType';

import { LanguageEnum } from './enums/LanguageEnum';
import { CurrencyEnum } from './enums/CurrencyEnum';
import { ModeEnum } from './enums/ModeEnum';
import { SelectServerEnum } from './enums/SelectServerEnum';
import { LoadedAppNavigationState } from '../types';
import ValueTransferType from './types/ValueTransferType';
import { HideReturn } from 'react-native-magic-modal';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { RPCSyncStatusType } from '../rpc/types/RPCSyncStatusType';
import TransparentAddressClass from './classes/TransparentAddressClass';
import { ScreenEnum } from './enums/ScreenEnum';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';

export default interface AppContextLoaded {
  navigationHome: DrawerContentComponentProps['navigation'] | null;
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

  // internal wallet settings from blockchain
  walletSettings: WalletSettingsClass;

  // syncing Info about the status of the process
  syncingStatus: RPCSyncStatusType;

  // wallet recovery info
  wallet: WalletType;

  // active UA in the wallet
  defaultUnifiedAddress: string;

  // zec price in USD from internet
  zecPrice: ZecPriceType;

  // info about background syncing
  background: BackgroundType;

  // helper to get text tranalated to the active language
  translate: (key: string) => TranslateType;

  // Error from the App when is in background
  backgroundError: BackgroundErrorType;
  setBackgroundError: (title: string, error: string) => void;

  // this wallet is watch-only (Readonly)
  readOnly: boolean;

  // pools available
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;

  // snackbar queue
  snackbars: SnackbarType[];
  addLastSnackbar: (snackbar: SnackbarType) => void;
  removeFirstSnackbar: (s: ScreenEnum) => void;

  // if the App is stalled - restart is fired
  restartApp: (s: LoadedAppNavigationState) => void;

  // some ValueTransfer is pending?
  somePending: boolean;

  // List of our contacts - Address book
  addressBook: AddressBookFileClass[];

  // helpers to open the address book modal from different places in the App
  launchAddressBook: (add: string) => Promise<HideReturn<unknown>>;
  addressBookCurrentAddress: string;

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

  // modals
  setComputingModalShow: () => Promise<HideReturn<unknown>>;
  closeAllModals: () => void;
  setUfvkViewModalShow: () => Promise<HideReturn<unknown>>;
  setSyncReportModalShow: () => Promise<HideReturn<unknown>>;
  setPoolsModalShow: () => Promise<HideReturn<unknown>>;

  // eslint-disable-next-line semi
}
