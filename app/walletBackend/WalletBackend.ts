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
import { SendJsonToTypeType, ServerType, TranslateType } from '../AppState';
import { WalletBackendConfig } from './config/WalletBackendConfig';
import { RPCPerformanceLevelEnum } from './enums/RPCPerformanceLevelEnum';
import { DataService } from './modules/DataService';
import { SyncCoordinator } from './modules/SyncCoordinator';
import { TransactionService } from './modules/TransactionService';
import { WalletLifecycleService } from './modules/WalletLifecycleService';

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

  /**
   * Send a swap deposit: a single-receiver transparent send that optionally
   * carries an OP_RETURN payload (Maya / THORChain memo) and optionally
   * forces a ZIP-320 ephemeral indirection (`routeViaEphemeral`).
   *
   * Hides the "magic op_return field on the first receiver" detail from
   * callers — the swap screen builds an object with `depositAddress`, `amount`
   * (atomic zatoshis), `memoBytes` (from `DepositInstructionsType`) and a
   * boolean flag; we marshal it into the shape that `sendTransaction` already
   * understands.
   *
   * `routeViaEphemeral` should be set for Mayachain / THORChain deposits so
   * the on-chain `from_address` is a wallet-controlled ephemeral t-addr the
   * provider can refund to. Without it, refunds from shielded sources are
   * unrecoverable. Has no effect for NEAR Intents / Flashnet deposits, which
   * derive refund routing from the per-quote deposit address itself.
   *
   * Returns the list of broadcast tx hashes in chronological order:
   *   - Single-hop send → one-element array `[txid]`.
   *   - 2-hop ZIP-320 send → `[txid0, txid1]` where `txid0` is the
   *     shielded → ephemeral hop and `txid1` is the ephemeral → deposit
   *     address tx (the one the provider observes).
   *
   * Order assumption: `LightWallet::calculate_transactions` in zingolib
   * builds the steps in the same order the proposal lists them (step 0 first,
   * step 1 last), and zingo-mobile's bridge surfaces them via
   * `TransactionService.sendTransaction` joined by `", "`. If that ordering
   * ever changes, callers that pick `[length - 1]` as the deposit tx
   * (`SwapService.markBroadcasted`) would silently track the wrong hash —
   * see the comment in `ReviewSheet.onConfirm`.
   */
  async sendSwapDeposit(args: {
    depositAddress: string;
    amountAtomic: number;
    memoBytes?: Uint8Array;
    routeViaEphemeral?: boolean;
  }): Promise<string[]> {
    const sendJson: Array<SendJsonToTypeType> = [
      {
        address: args.depositAddress,
        amount: args.amountAtomic,
        op_return:
          args.memoBytes && args.memoBytes.length > 0
            ? bytesToHex(args.memoBytes)
            : undefined,
        route_via_ephemeral: args.routeViaEphemeral || undefined,
      },
    ];
    const joined = await this.transactionService.sendTransaction(sendJson);
    // `TransactionService.sendTransaction` joins the rust-side `txids[]`
    // with `", "`. Split it back so the caller sees the array shape and can
    // pick the relevant txid by index without re-parsing the string.
    return joined
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
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

  // Active server. Mutates the shared config reference so all sub-services
  // (DataService etc.) pick up the new URI on their next call without having
  // to recreate the WalletBackend instance. Without this, switching server
  // without changing wallets left DataService.getLatestBlockServerInfo
  // talking to the stale URI captured at construction time.
  setServer(server: ServerType) {
    this.config.server = server;
  }

  // Active performance level. Same shared-reference pattern as setServer.
  // Without this, SyncCoordinator's runTaskPromises sees the stale config
  // value, diffs it against the wallet-current (already-changed) value,
  // and pushes the OLD level back to zingolib — silently reverting the
  // user's setting.
  setPerformanceLevel(performanceLevel: RPCPerformanceLevelEnum) {
    this.config.performanceLevel = performanceLevel;
  }

  // Active i18n helper. Same shared-reference pattern as setServer. The
  // outer LoadedApp rebuilds `translate` on every language change; without
  // this setter, sub-services (WalletLifecycleService etc.) keep returning
  // localized error strings in the language the user had at app mount.
  setTranslate(translate: (key: string) => TranslateType) {
    this.config.translate = translate;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
