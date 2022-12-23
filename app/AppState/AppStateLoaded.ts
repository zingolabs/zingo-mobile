import { TranslateOptions } from 'i18n-js';
import { StackScreenProps } from '@react-navigation/stack';

import SyncStatusReport from './SyncStatusReport';
import TotalBalance from './TotalBalance';
import Address from './Address';
import AddressBookEntry from './AddressBookEntry';
import ErrorModalData from './ErrorModalData';
import Transaction from './Transaction';
import SendPageState from './SendPageState';
import SendProgress from './SendProgress';
import ReceivePageState from './ReceivePageState';
import InfoType from './InfoType';
import WalletSeed from './WalletSeed';
import WalletSettings from './WalletSettings';
import SyncStatus from './SyncStatus';

export default interface AppStateLoaded {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  dimensions: {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
    deviceType: 'tablet' | 'phone';
    scale: number;
  };

  // Info about the current sync process
  syncStatusReport: SyncStatusReport;

  // The total confirmed and unconfirmed balance in this wallet
  totalBalance: TotalBalance;

  // A map type that contains address -> privatekey mapping, for display on the receive page
  // This mapping is ephemeral, and will disappear when the user navigates away.
  addressPrivateKeys: Map<string, string>;

  // List of all addresses in the wallet, including change addresses and addresses
  // that don't have any balance or are unused
  addresses: Address[];

  // List of Address / Label pairs
  addressBook: AddressBookEntry[];

  // List of all T and Z and O transactions
  transactions: Transaction[];

  // The state of the send page, as the user constructs a transaction
  sendPageState: SendPageState;

  // Any state for the receive page
  receivePageState: ReceivePageState;

  // getinfo and getblockchaininfo result
  info: InfoType;

  // Is the app rescanning?
  rescanning: boolean;

  // Callbacks for the password dialog box
  //passwordState: PasswordState;

  wallet_settings: WalletSettings;

  syncingStatus: SyncStatus;

  // Data for any error or info modal
  errorModalData: ErrorModalData;

  // Build progress from Tx
  sendProgress: SendProgress;

  walletSeed: WalletSeed;

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

  translate: (key: string, config?: TranslateOptions) => any;

  // eslint-disable-next-line semi
}
