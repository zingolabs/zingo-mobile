import { SendJsonToTypeType, ServerType } from '@app/AppState';
import { WalletBackendConfig } from './config/WalletBackendConfig';
import { RPCPerformanceLevelEnum } from './enums/RPCPerformanceLevelEnum';
import { DataService } from './modules/DataService';
import { MixnetCoordinator } from './modules/MixnetCoordinator';
import { SyncCoordinator } from './modules/SyncCoordinator';
import { TransactionService } from './modules/TransactionService';
import { WalletLifecycleService } from './modules/WalletLifecycleService';

// Wires the sub-services together and exposes one API to LoadedApp.
export default class WalletBackend {
  private config: WalletBackendConfig;
  private dataService: DataService;
  private syncCoordinator: SyncCoordinator;
  private transactionService: TransactionService;
  private walletLifecycle: WalletLifecycleService;
  private mixnetCoordinator: MixnetCoordinator;
  private mixnetArmed: boolean = false;

  constructor(config: WalletBackendConfig) {
    this.config = config;
    this.dataService = new DataService(config);
    this.syncCoordinator = new SyncCoordinator(config, this.dataService);
    this.mixnetCoordinator = new MixnetCoordinator(
      config.startMixnetTransport,
      config.onMixnetViewChanged,
    );
    this.dataService.onSyncError = async () => {
      await this.syncCoordinator.clearTimers();
      await this.syncCoordinator.configure();
    };
    this.transactionService = new TransactionService(
      config,
      this.syncCoordinator,
    );
    this.walletLifecycle = new WalletLifecycleService(this.syncCoordinator);
  }

  // The mixnet bootstrap is not awaited because it takes tens of seconds.
  async configure() {
    if (this.config.mixnetSupported && !this.mixnetArmed) {
      this.mixnetArmed = true;
      this.mixnetCoordinator.ensureForConnectedSession();
    }
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

  async fetchInfoAndServerHeight() {
    return this.dataService.fetchInfoAndServerHeight();
  }
  async fetchTandZandOValueTransfers() {
    return this.dataService.fetchTandZandOValueTransfers();
  }
  async fetchTandZandOMessages() {
    return this.dataService.fetchTandZandOMessages();
  }

  async sendTransaction(sendJson: Array<SendJsonToTypeType>): Promise<string> {
    return this.transactionService.sendTransaction(sendJson);
  }

  async reenableMixnet() {
    return this.mixnetCoordinator.reenable();
  }
  stopMixnetPolling() {
    this.mixnetCoordinator.stop();
  }

  async changeWallet() {
    return this.walletLifecycle.changeWallet();
  }
  async changeWalletNoBackup() {
    return this.walletLifecycle.changeWalletNoBackup();
  }
  async restoreBackup() {
    return this.walletLifecycle.restoreBackup();
  }

  async getWalletVersion() {
    return this.dataService.getWalletVersion();
  }

  setInSend(value: boolean) {
    this.transactionService.setInSend(value);
  }
  getInSend() {
    return this.transactionService.getInSend();
  }

  setReadOnly(value: boolean) {
    this.config.readOnly = value;
  }
  getReadOnly() {
    return this.config.readOnly;
  }

  // Mutates the shared config so every sub-service reads the new server.
  setServer(server: ServerType) {
    this.config.server = server;
  }

  setPerformanceLevel(performanceLevel: RPCPerformanceLevelEnum) {
    this.config.performanceLevel = performanceLevel;
  }
}
