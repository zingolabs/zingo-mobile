import { StackScreenProps } from '@react-navigation/stack';

import TotalBalanceClass from './classes/TotalBalanceClass';
import AddressClass from './classes/AddressClass';
import ErrorModalDataClass from './classes/ErrorModalDataClass';
import SendPageStateClass from './classes/SendPageStateClass';
import SendProgressClass from './classes/SendProgressClass';
import ReceivePageStateClass from './classes/ReceivePageStateClass';
import WalletSettingsClass from './classes/WalletSettingsClass';

import TransactionType from './types/TransactionType';
import InfoType from './types/InfoType';
import WalletType from './types/WalletType';
import SyncingStatusClass from './classes/SyncingStatusClass';
import ZecPriceType from './types/ZecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';
import BackgroundErrorType from './types/BackgroundErrorType';
import ServerType from './types/ServerType';
import SnackbarType from './types/SnackbarType';
import AddressBookFileClass from './classes/AddressBookFileClass';

export default interface AppStateLoaded {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  appState: string;
  netInfo: NetInfoType;

  // The total confirmed and unconfirmed balance in this wallet
  totalBalance: TotalBalanceClass;

  // A map type that contains address -> privatekey mapping, for display on the receive page
  // This mapping is ephemeral, and will disappear when the user navigates away.
  addressPrivateKeys: Map<string, string>;

  // List of all addresses in the wallet, including change addresses and addresses
  // that don't have any balance or are unused
  addresses: AddressClass[];

  // List of all T and Z and O transactions
  transactions: TransactionType[];

  // The state of the send page, as the user constructs a transaction
  sendPageState: SendPageStateClass;

  // Any state for the receive page
  receivePageState: ReceivePageStateClass;

  // getinfo and getblockchaininfo result
  info: InfoType;

  // Callbacks for the password dialog box
  //passwordState: PasswordState;

  walletSettings: WalletSettingsClass;

  syncingStatus: SyncingStatusClass;

  // Data for any error or info modal
  errorModalData: ErrorModalDataClass;

  // Build progress from Tx
  sendProgress: SendProgressClass;

  wallet: WalletType;

  isMenuDrawerOpen: boolean;

  selectedMenuDrawerItem: string;

  aboutModalVisible: boolean;

  computingModalVisible: boolean;

  settingsModalVisible: boolean;

  infoModalVisible: boolean;

  rescanModalVisible: boolean;

  seedViewModalVisible: boolean;
  seedChangeModalVisible: boolean;
  seedBackupModalVisible: boolean;
  seedServerModalVisible: boolean;

  ufvkViewModalVisible: boolean;
  ufvkChangeModalVisible: boolean;
  ufvkBackupModalVisible: boolean;
  ufvkServerModalVisible: boolean;

  syncReportModalVisible: boolean;
  poolsModalVisible: boolean;
  insightModalVisible: boolean;
  addressBookModalVisible: boolean;

  newServer: ServerType;

  uaAddress: string;

  server: ServerType;
  language: 'en' | 'es';
  currency: 'USD' | '';

  zecPrice: ZecPriceType;
  sendAll: boolean;
  background: BackgroundType;

  translate: (key: string) => TranslateType;
  backgroundError: BackgroundErrorType;
  setBackgroundError: (title: string, error: string) => void;

  privacy: boolean;
  readOnly: boolean;
  poolsToShieldSelectSapling: boolean;
  poolsToShieldSelectTransparent: boolean;

  mode: 'basic' | 'advanced';
  snackbars: SnackbarType[];
  addLastSnackbar: (snackbar: SnackbarType) => void;
  restartApp: (s: any) => void;
  someUnconfirmed: boolean;

  addressBook: AddressBookFileClass[];

  // eslint-disable-next-line semi
}
