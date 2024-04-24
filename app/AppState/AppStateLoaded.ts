import { StackScreenProps } from '@react-navigation/stack';

import TotalBalanceClass from './classes/TotalBalanceClass';
import AddressClass from './classes/AddressClass';
import ErrorModalDataClass from './classes/ErrorModalDataClass';
import SendPageStateClass from './classes/SendPageStateClass';
import SendProgressClass from './classes/SendProgressClass';
import ReceivePageStateClass from './classes/ReceivePageStateClass';
import WalletSettingsClass from './classes/WalletSettingsClass';
import AddressBookFileClass from './classes/AddressBookFileClass';
import SyncingStatusClass from './classes/SyncingStatusClass';

import TransactionType from './types/TransactionType';
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

import { MenuItemEnum } from './enums/MenuItemEnum';
import { LanguageEnum } from './enums/LanguageEnum';
import { CurrencyEnum } from './enums/CurrencyEnum';
import { ModeEnum } from './enums/ModeEnum';
import { SelectServerEnum } from './enums/SelectServerEnum';
import { AppStateStatus } from 'react-native';

export default interface AppStateLoaded {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  appState: AppStateStatus;
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

  selectedMenuDrawerItem: MenuItemEnum | null;

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
  language: LanguageEnum;
  currency: CurrencyEnum;

  zecPrice: ZecPriceType;
  sendAll: boolean;
  donation: boolean;
  background: BackgroundType;

  translate: (key: string) => TranslateType;
  backgroundError: BackgroundErrorType;
  setBackgroundError: (title: string, error: string) => void;

  privacy: boolean;
  readOnly: boolean;
  poolsToShieldSelectSapling: boolean;
  poolsToShieldSelectTransparent: boolean;

  mode: ModeEnum;
  snackbars: SnackbarType[];
  addLastSnackbar: (snackbar: SnackbarType) => void;
  restartApp: (s: any) => void;
  someUnconfirmed: boolean;

  addressBook: AddressBookFileClass[];
  launchAddressBook: (add: string, close: () => void, open: () => void) => void;
  addressBookCurrentAddress: string;
  addressBookOpenPriorModal: () => void;
  security: SecurityType;
  selectServer: SelectServerEnum;

  // eslint-disable-next-line semi
}
