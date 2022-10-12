// new class with all the information about the sync process
export class SyncStatusReport {
  // sync ID
  syncID: number;

  // total of batches to process (usually 1000 blocks per batch)
  totalBatches: number;

  // batch that is processing now
  currentBatch: number;

  // total blocks per batch
  blocksPerBatch: number;

  // last block of the wallet
  lastBlockWallet: number;

  // block that is processing
  currentBlock: number;

  inProgress: boolean;

  lastError: string;

  secondsPerBatch: number;

  percent: number;

  message: string;

  process_end_block: number;

  lastBlockServer: number;

  constructor() {
    this.syncID = 0;
    this.totalBatches = 0;
    this.currentBatch = 0;
    this.blocksPerBatch = 1000; // this is set in zingolib
    this.lastBlockWallet = 0;
    this.currentBlock = 0;
    this.inProgress = false;
    this.lastError = '';
    this.secondsPerBatch = 0;
    this.percent = 0;
    this.message = '';
    this.process_end_block = 0;
    this.lastBlockServer = 0;
  }

}

export class TotalBalance {
  // Total t address, confirmed and spendable
  transparentBal: number;

  // Total private, confirmed + unconfirmed
  privateBal: number;

  // Total orchard, confirmed + unconfirmed
  orchardBal: number;

  // Total private, confirmed funds that are spendable
  spendablePrivate: number;

  // Total orchard, confirmed funds that are spendable
  spendableOrchard: number;

  // Total unconfirmed + spendable
  total: number;

  constructor() {
    this.transparentBal = 0;
    this.privateBal = 0;
    this.spendablePrivate = 0;
    this.orchardBal = 0;
    this.spendableOrchard = 0;
    this.total = 0;
  }
}

export class AddressBalance {
  address: string;
  balance: number;
  containsPending: boolean;

  constructor(address: string, balance: number) {
    this.address = address;
    this.balance = balance;
    this.containsPending = false;
  }
}

export class AddressBookEntry {
  label: string;

  address: string;

  constructor(label: string, address: string) {
    this.label = label;
    this.address = address;
  }
}

export class SettingsFileEntry {
  server: string;

  constructor(server: string) {
    this.server = server;
  }
}

export interface TxDetail {
  address: string;
  amount: number;
  memo: string | null;
}

// List of transactions.
export interface Transaction {
  type: string;
  address: string;
  amount: number;
  position: string;
  confirmations: number;
  txid: string;
  time: number;
  zec_price: number | null;
  detailedTxns: TxDetail[];
}

// This is the type that the RPC interface expects for sending
export interface SendJsonToType {
  address: string;
  amount: number;
  memo?: string;
}

export class ToAddr {
  id: number;
  to: string;
  amount: string;
  amountUSD: string;
  memo: string;

  constructor(id: number) {
    this.id = id;

    this.to = '';
    this.amount = '';
    this.amountUSD = '';
    this.memo = '';
  }
}

export class SendPageState {
  fromaddr: string;

  toaddrs: ToAddr[];

  constructor() {
    this.fromaddr = '';
    this.toaddrs = [];
  }
}

export class ReceivePageState {
  // A newly created address to show by default
  newAddress: string;

  // The key used for the receive page component.
  // Increment to force re-render
  rerenderKey: number;

  constructor() {
    this.newAddress = '';
    this.rerenderKey = 0;
  }
}

export interface Info {
  chain_name: boolean;
  serverUri: string;
  latestBlock: number;
  connections: number;
  version: string;
  verificationProgress: number;
  currencyName: string;
  solps: number;
  zecPrice: number | null;
  defaultFee: number;
  encrypted: boolean;
  locked: boolean;
}

export class SendProgress {
  sendInProgress: boolean;
  progress: number;
  total: number;
  etaSeconds: number;

  constructor() {
    this.sendInProgress = false;
    this.progress = 0;
    this.total = 0;
    this.etaSeconds = 0;
  }
}

export interface ServerSelectState {
  modalIsOpen: boolean;
}

export class PasswordState {
  showPassword: boolean;

  confirmNeeded: boolean;

  passwordCallback: ((password: string) => void) | null;

  closeCallback: (() => void) | null;

  helpText: string | null;

  constructor() {
    this.showPassword = false;
    this.confirmNeeded = false;
    this.passwordCallback = null;
    this.closeCallback = null;
    this.helpText = null;
  }
}

export class ErrorModalData {
  title: string;
  body: string;

  modalIsOpen: boolean;

  constructor() {
    this.modalIsOpen = false;
    this.title = '';
    this.body = '';
  }
}

export interface ConnectedCompanionApp {
  name: string;
  lastSeen: number;
}

export interface WalletSeed {
  seed: string;
  birthday: number;
}

export interface SyncStatus {
  inProgress: boolean;
  progress: number;
  blocks: string;
}

export class WalletSettings {
  download_memos: string;
  transaction_filter_threshold: string;

  constructor() {
    this.download_memos = 'none';
    this.transaction_filter_threshold = '500';
  }
}

export default interface AppState {
  // Info about the current sync process
  syncStatusReport: SyncStatusReport;

  // The total confirmed and unconfirmed balance in this wallet
  totalBalance: TotalBalance;

  // The list of all t and z and o addresses that have a current balance. That is, the list of
  // addresses that have a (confirmed or unconfirmed) UTXO or note pending.
  addressesWithBalance: AddressBalance[];

  // A map type that contains address -> privatekey mapping, for display on the receive page
  // This mapping is ephemeral, and will disappear when the user navigates away.
  addressPrivateKeys: Map<string, string>;

  // List of all addresses in the wallet, including change addresses and addresses
  // that don't have any balance or are unused
  addresses: string[];

  // List of Address / Label pairs
  addressBook: AddressBookEntry[];

  // List of all T and Z and O transactions
  transactions: Transaction[] | null;

  // The state of the send page, as the user constructs a transaction
  sendPageState: SendPageState;

  // Any state for the receive page
  receivePageState: ReceivePageState;

  // getinfo and getblockchaininfo result
  info: Info | null;

  // Is the app rescanning?
  rescanning: boolean;

  // Callbacks for the password dialog box
  //passwordState: PasswordState;

  wallet_settings: WalletSettings;

  syncingStatus: SyncStatus | null;

  // Data for any error or info modal
  errorModalData: ErrorModalData;

  // Build progress from Tx
  txBuildProgress: SendProgress;

  walletSeed: WalletSeed | null;

  isMenuDrawerOpen: boolean;

  selectedMenuDrawerItem: string;

  aboutModalVisible: boolean;

  computingModalVisible: boolean;

  settingsModalVisible: boolean;

  infoModalVisible: boolean;

  rescanModalVisible: boolean;

  seedModalVisible: boolean;
  // eslint-disable-next-line semi
}
