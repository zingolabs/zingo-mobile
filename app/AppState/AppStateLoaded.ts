import { TranslateOptions } from 'i18n-js';
import { StackScreenProps } from '@react-navigation/stack';

import SyncingStatusReportClass from './classes/SyncingStatusReportClass';
import TotalBalanceClass from './classes/TotalBalanceClass';
import AddressClass from './classes/AddressClass';
import AddressBookClass from './classes/AddressBookClass';
import ErrorModalDataClass from './classes/ErrorModalDataClass';
import SendPageStateClass from './classes/SendPageStateClass';
import SendProgressClass from './classes/SendProgressClass';
import ReceivePageStateClass from './classes/ReceivePageStateClass';
import WalletSettingsClass from './classes/WalletSettingsClass';

import TransactionType from './types/TransactionType';
import InfoType from './types/InfoType';
import WalletSeedType from './types/WalletSeedType';
import SyncingStatusType from './types/SyncingStatusType';
import DimensionsType from './types/DimensionsType';

export default interface AppStateLoaded {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  dimensions: DimensionsType;

  // Info about the current sync process
  syncingStatusReport: SyncingStatusReportClass;

  // The total confirmed and unconfirmed balance in this wallet
  totalBalance: TotalBalanceClass;

  // A map type that contains address -> privatekey mapping, for display on the receive page
  // This mapping is ephemeral, and will disappear when the user navigates away.
  addressPrivateKeys: Map<string, string>;

  // List of all addresses in the wallet, including change addresses and addresses
  // that don't have any balance or are unused
  addresses: AddressClass[];

  // List of Address / Label pairs
  addressBook: AddressBookClass[];

  // List of all T and Z and O transactions
  transactions: TransactionType[];

  // The state of the send page, as the user constructs a transaction
  sendPageState: SendPageStateClass;

  // Any state for the receive page
  receivePageState: ReceivePageStateClass;

  // getinfo and getblockchaininfo result
  info: InfoType;

  // Is the app rescanning?
  rescanning: boolean;

  // Callbacks for the password dialog box
  //passwordState: PasswordState;

  walletSettings: WalletSettingsClass;

  syncingStatus: SyncingStatusType;

  // Data for any error or info modal
  errorModalData: ErrorModalDataClass;

  // Build progress from Tx
  sendProgress: SendProgressClass;

  walletSeed: WalletSeedType;

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

  syncReportModalVisible: boolean;
  poolsModalVisible: boolean;

  newServer: string;

  uaAddress: string;

  server: string;
  language: 'en' | 'es';
  currency: 'USD' | '';

  translate: (key: string, config?: TranslateOptions) => string;

  // eslint-disable-next-line semi
}
