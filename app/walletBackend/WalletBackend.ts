import { SendJsonToTypeType, ServerType } from '@app/AppState';
import { WalletBackendConfig, isOffline } from './config/WalletBackendConfig';
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
  // Whether the mixnet is currently armed for a connected session. Not a
  // one-shot latch: the transport follows connectivity in both directions.
  private mixnetOnline: boolean = false;

  constructor(config: WalletBackendConfig) {
    this.config = config;
    this.dataService = new DataService(config);
    this.syncCoordinator = new SyncCoordinator(config, this.dataService);
    this.mixnetCoordinator = new MixnetCoordinator(
      config.startMixnetTransport,
      config.onMixnetViewChanged,
      config.stopMixnetTransport,
    );
    this.transactionService = new TransactionService(
      config,
      this.syncCoordinator,
    );
    this.walletLifecycle = new WalletLifecycleService(this.syncCoordinator);
  }

  // The go-online / go-offline moment: the mixnet's lifetime follows the
  // session's connectivity, never the app's own. `configure` runs at launch
  // and after every server change, so both transitions land here, and it is
  // reentrant — flipping Offline <-> Online in Settings starts and stops the
  // tunnel then and there. zingo-cli gates its own driver call the same way,
  // on `Communications::Online`.
  async configure() {
    if (this.config.mixnetSupported) {
      await this.followConnectivity();
    }
    return this.syncCoordinator.configure();
  }

  private async followConnectivity(): Promise<void> {
    if (!isOffline(this.config)) {
      if (!this.mixnetOnline) {
        this.mixnetOnline = true;
        // The bootstrap is not awaited because it takes tens of seconds.
        this.mixnetCoordinator.ensureForConnectedSession();
      }
      return;
    }
    // Offline tears down on every configure, not only on the transition: a
    // session that launches Offline armed nothing to tear down, and the
    // header still has to report where nym stands.
    this.mixnetOnline = false;
    // Not awaited, and that is the fix rather than an oversight: the teardown
    // can wait behind a transport start that has not returned, and `configure`
    // runs on every server change and every foreground return, so awaiting it
    // parked the whole path behind a slow start. Neither call in this method
    // can reject — every await inside them settles through a report — so
    // there is nothing here to handle.
    this.mixnetCoordinator.goOffline();
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

  async sendTransaction(
    sendJson: Array<SendJsonToTypeType>,
    sendAll: boolean = false,
  ): Promise<string> {
    return this.transactionService.sendTransaction(sendJson, sendAll);
  }

  async reenableMixnet() {
    if (isOffline(this.config)) {
      // An Offline session has no transport to re-enable, and a re-enable
      // must never dial behind the mode's back: it settles back at off.
      return this.mixnetCoordinator.goOffline();
    }
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

  // Active server. Routes through the coordinator's changeServer so the switch
  // bumps the controller epoch (ADR 0017): a status read or poll begun under the
  // old server drops rather than applying its stale snapshot. It still
  // mutates the shared config reference, so every sub-service picks up the new
  // URI on its next call without recreating the WalletBackend instance.
  setServer(server: ServerType) {
    this.syncCoordinator.changeServer(server);
  }

  setPerformanceLevel(performanceLevel: RPCPerformanceLevelEnum) {
    this.config.performanceLevel = performanceLevel;
  }
}
