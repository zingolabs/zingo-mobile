import {
  TotalBalanceClass,
  InfoType,
  SendJsonToTypeType,
  ValueTransferType,
  UnifiedAddressClass,
  TransparentAddressClass,
  TranslateType,
  ServerType,
} from '../AppState';
import { RPCSyncStatusType, RPCPerformanceLevelEnum } from './types/rpcSyncTypes';
import { WalletBackendConfig } from './config/WalletBackendConfig';
import { DataService } from './modules/DataService';
import { SyncCoordinator } from './modules/SyncCoordinator';
import { TransactionService } from './modules/TransactionService';
import { WalletLifecycleService } from './modules/WalletLifecycleService';
import { getZecPrice, shieldFunds, fetchWallet } from './utils/walletUtils';

export default class WalletBackend {
  private cfg: WalletBackendConfig;
  private data: DataService;
  private sync: SyncCoordinator;
  private tx: TransactionService;
  private lifecycle: WalletLifecycleService;

  constructor(
    fnSetTotalBalance: (totalBalance: TotalBalanceClass) => void,
    fnSetValueTransfersList: (
      vtList: ValueTransferType[],
      total: number,
    ) => void,
    fnSetMessagesList: (mList: ValueTransferType[], total: number) => void,
    fnSetAllAddresses: (
      addresses: (UnifiedAddressClass | TransparentAddressClass)[],
    ) => void,
    fnSetInfo: (info: InfoType) => void,
    fnSetSyncingStatus: (syncingStatus: RPCSyncStatusType) => void,
    translate: (key: string) => TranslateType,
    keepAwake: (keep: boolean) => void,
    fnSetZingolib: (zingolib: string) => void,
    fnSetBirthday: (birthday: number) => void,
    fnSetLastError: (error: string) => void,
    readOnly: boolean,
    server: ServerType,
    performanceLevel: RPCPerformanceLevelEnum,
  ) {
    this.cfg = {
      readOnly,
      server,
      performanceLevel,
      setTotalBalance: fnSetTotalBalance,
      setValueTransfersList: fnSetValueTransfersList,
      setMessagesList: fnSetMessagesList,
      setAllAddresses: fnSetAllAddresses,
      setInfo: fnSetInfo,
      setSyncingStatus: fnSetSyncingStatus,
      translate,
      keepAwake,
      setZingolibVersion: fnSetZingolib,
      setBirthday: fnSetBirthday,
      setLastError: fnSetLastError,
    };

    this.lifecycle = new WalletLifecycleService(this.cfg);
    this.data = new DataService(this.cfg, async () => {
      await this.sync.clearTimers();
      await this.sync.configure();
    });
    this.sync = new SyncCoordinator(this.cfg, this.data, this.lifecycle);
    this.tx = new TransactionService(this.cfg, this.sync);
  }

  // --- Sync & timer management ---

  async configure(): Promise<void> {
    return this.sync.configure();
  }

  async clearTimers(): Promise<void> {
    return this.sync.clearTimers();
  }

  async refreshSync(fullRescan?: boolean): Promise<void> {
    return this.sync.refreshSync(fullRescan);
  }

  // --- Data fetching (used by LoadedApp directly) ---

  async fetchInfoAndServerHeight(): Promise<void> {
    return this.data.fetchInfoAndServerHeight();
  }

  async fetchTandZandOValueTransfers(): Promise<void> {
    return this.data.fetchTandZandOValueTransfers();
  }

  async fetchTandZandOMessages(): Promise<void> {
    return this.data.fetchTandZandOMessages();
  }

  // --- Transactions ---

  async sendTransaction(
    sendJson: Array<SendJsonToTypeType>,
  ): Promise<string> {
    return this.tx.sendTransaction(sendJson);
  }

  // --- Wallet lifecycle ---

  async changeWallet() {
    return this.lifecycle.changeWallet();
  }

  async changeWalletNoBackup() {
    return this.lifecycle.changeWalletNoBackup();
  }

  async restoreBackup() {
    return this.lifecycle.restoreBackup();
  }

  async getWalletVersion(): Promise<number | undefined> {
    return this.lifecycle.getWalletVersion();
  }

  // --- State accessors ---

  getInSend(): boolean {
    return this.tx.getInSend();
  }

  getReadOnly(): boolean {
    return this.cfg.readOnly;
  }

  setReadOnly(value: boolean): void {
    this.cfg.readOnly = value;
  }

  // --- Static utilities (backward-compatible names) ---

  static rpcGetZecPrice = getZecPrice;
  static rpcShieldFunds = shieldFunds;
  static rpcFetchWallet = fetchWallet;
}
