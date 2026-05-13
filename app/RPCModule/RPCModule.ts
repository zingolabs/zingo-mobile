import { NativeModules } from 'react-native';
import type {
  BalancesInfo,
  SpendableBalanceInfo,
  WalletHeightInfo,
  WalletVersionInfo,
  WalletSaveRequiredInfo,
  SeedInfo,
  UfvkInfo,
  PerformanceInfo,
} from '../walletBackend/types/rpcWalletTypes';
import type { ProposalInfo, ShieldProposalInfo, ConfirmInfo } from '../walletBackend/types/rpcTransactionTypes';

export interface RPCModuleInterface {
  // ── Wallet lifecycle ────────────────────────────────────────────────────────
  walletExists(): Promise<string>;
  walletBackupExists(): Promise<string>;
  createNewWallet(
    serveruri: string,
    chainhint: string,
    performancelevel: string,
    minconfirmations: string,
  ): Promise<SeedInfo>;
  restoreWalletFromSeed(
    seed: string,
    birthday: string,
    serveruri: string,
    chainhint: string,
    performancelevel: string,
    minconfirmations: string,
  ): Promise<SeedInfo>;
  restoreWalletFromUfvk(
    ufvk: string,
    birthday: string,
    serveruri: string,
    chainhint: string,
    performancelevel: string,
    minconfirmations: string,
  ): Promise<UfvkInfo>;
  loadExistingWallet(
    serveruri: string,
    chainhint: string,
    performancelevel: string,
    minconfirmations: string,
  ): Promise<string>;
  restoreExistingWalletBackup(): Promise<string>;
  deleteExistingWallet(): Promise<string>;

  // ── Persistence ─────────────────────────────────────────────────────────────
  doSave(): Promise<string>;
  doSaveBackup(): Promise<string>;

  // ── Sync ────────────────────────────────────────────────────────────────────
  runSyncProcess(): Promise<string>;
  pauseSyncProcess(): Promise<string>;
  runRescanProcess(): Promise<string>;
  pollSyncInfo(): Promise<string>;
  statusSyncInfo(): Promise<string>;

  // ── Balance & wallet state ───────────────────────────────────────────────────
  getBalanceInfo(): Promise<BalancesInfo>;
  getSpendableBalanceTotalInfo(): Promise<SpendableBalanceInfo>;
  getSpendableBalanceWithAddressInfo(address: string, zennies: string): Promise<string>;
  getLatestBlockServerInfo(serveruri: string): Promise<string>;
  getLatestBlockWalletInfo(): Promise<WalletHeightInfo>;
  getWalletSaveRequiredInfo(): Promise<WalletSaveRequiredInfo>;
  getWalletVersionInfo(): Promise<WalletVersionInfo>;

  // ── Addresses ───────────────────────────────────────────────────────────────
  getUnifiedAddressesInfo(): Promise<string>;
  getTransparentAddressesInfo(): Promise<string>;
  createNewUnifiedAddressProcess(receivers: string): Promise<string>;
  createNewTransparentAddressProcess(): Promise<string>;
  checkMyAddressInfo(address: string): Promise<string>;
  parseAddressInfo(address: string): Promise<string>;

  // ── Transactions ────────────────────────────────────────────────────────────
  getValueTransfersList(): Promise<string>;
  getMessagesInfo(address: string): Promise<string>;
  getTotalValueToAddressInfo(): Promise<string>;
  getTotalSpendsToAddressInfo(): Promise<string>;
  getTotalMemobytesToAddressInfo(): Promise<string>;
  removeTransactionProcess(txid: string): Promise<string>;
  sendProcess(sendJson: string): Promise<ProposalInfo>;
  shieldProcess(): Promise<ShieldProposalInfo>;
  confirmProcess(): Promise<ConfirmInfo>;

  // ── Wallet info ─────────────────────────────────────────────────────────────
  getSeedInfo(): Promise<SeedInfo>;
  getUfvkInfo(): Promise<UfvkInfo>;
  parseUfvkInfo(ufvk: string): Promise<string>;
  walletKindInfo(): Promise<string>;
  getVersionInfo(): Promise<string>;
  infoServerInfo(): Promise<string>;

  // ── Server & config ─────────────────────────────────────────────────────────
  changeServerProcess(serveruri: string): Promise<string>;
  setConfigWalletToProdProcess(
    performancelevel: string,
    minconfirmations: string,
  ): Promise<string>;
  getConfigWalletPerformanceInfo(): Promise<PerformanceInfo>;
  setCryptoDefaultProvider(): Promise<string>;

  // ── Donations / ZEC price ───────────────────────────────────────────────────
  getDonationAddress(): Promise<string>;
  getZenniesDonationAddress(): Promise<string>;
  zecPriceInfo(tor: string): Promise<string>;

  // ── Tor ─────────────────────────────────────────────────────────────────────
  createTorClientProcess(): Promise<string>;
  removeTorClientProcess(): Promise<string>;
}

export default NativeModules.RPCModule as RPCModuleInterface;
