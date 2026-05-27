/**
 * Thin coordinator for all wallet operations.
 *
 * WalletBackend owns no business logic itself — it wires the four sub-services
 * together and exposes a stable public API to LoadedApp. To add a new feature,
 * create or extend the relevant sub-service and add a delegation method here.
 *
 * Sub-service overview:
 *  - DataService       — fetches wallet state from the native layer (RPCModule)
 *  - SyncCoordinator   — drives the 5 s polling loop and sync/rescan lifecycle
 *  - TransactionService — propose → confirm send flow
 *  - WalletLifecycleService — wallet create/delete/restore operations
 *
 * RPCModule is the React Native native module that bridges to zingolib (Rust).
 * This class never calls RPCModule directly.
 */
import { SendJsonToTypeType } from '../AppState';
import { WalletBackendConfig } from './config/WalletBackendConfig';
import { DataService } from './modules/DataService';
import { SyncCoordinator } from './modules/SyncCoordinator';
import { TransactionService } from './modules/TransactionService';
import { WalletLifecycleService } from './modules/WalletLifecycleService';
import { fetchWallet, getZecPrice, shieldFunds } from './utils/walletUtils';

export default class WalletBackend {
  private config: WalletBackendConfig;
  private dataService: DataService;
  private syncCoordinator: SyncCoordinator;
  private transactionService: TransactionService;
  private walletLifecycle: WalletLifecycleService;

  constructor(config: WalletBackendConfig) {
    this.config = config;
    this.dataService = new DataService(config);
    this.syncCoordinator = new SyncCoordinator(config, this.dataService);
    // Wire the sync-restart callback after SyncCoordinator exists
    this.dataService.onSyncError = async () => {
      await this.syncCoordinator.clearTimers();
      await this.syncCoordinator.configure();
    };
    this.transactionService = new TransactionService(
      config,
      this.syncCoordinator,
    );
    this.walletLifecycle = new WalletLifecycleService(
      config,
      this.syncCoordinator,
    );
  }

  // Sync lifecycle
  async configure() {
    return this.syncCoordinator.configure();
  }
  async clearTimers() {
    return this.syncCoordinator.clearTimers();
  }
  async pauseSyncProcess() {
    return this.syncCoordinator.pauseSyncProcess();
  }
  async refreshSync(fullRescan?: boolean) {
    return this.syncCoordinator.refreshSync(fullRescan);
  }

  // Data fetching (called directly by LoadedApp)
  async fetchInfoAndServerHeight() {
    return this.dataService.fetchInfoAndServerHeight();
  }
  async fetchTandZandOValueTransfers() {
    return this.dataService.fetchTandZandOValueTransfers();
  }
  async fetchTandZandOMessages() {
    return this.dataService.fetchTandZandOMessages();
  }

  // Transactions
  async sendTransaction(sendJson: Array<SendJsonToTypeType>): Promise<string> {
    return this.transactionService.sendTransaction(sendJson);
  }

  // Wallet lifecycle
  async changeWallet() {
    return this.walletLifecycle.changeWallet();
  }
  async changeWalletNoBackup() {
    return this.walletLifecycle.changeWalletNoBackup();
  }
  async restoreBackup() {
    return this.walletLifecycle.restoreBackup();
  }

  // Wallet version (used by LoadedApp on mount)
  async getWalletVersion() {
    return this.dataService.getWalletVersion();
  }

  // Transaction in-flight flag
  setInSend(value: boolean) {
    this.transactionService.setInSend(value);
  }
  getInSend() {
    return this.transactionService.getInSend();
  }

  // Read-only mode
  setReadOnly(value: boolean) {
    this.config.readOnly = value;
  }
  getReadOnly() {
    return this.config.readOnly;
  }

  // Backward-compatible static delegates (bodies live in walletUtils.ts)
  static rpcGetZecPrice = getZecPrice;
  static rpcShieldFunds = shieldFunds;
  static rpcFetchWallet = fetchWallet;
}
