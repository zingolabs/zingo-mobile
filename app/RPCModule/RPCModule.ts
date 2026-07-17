import { NativeModules } from 'react-native';

// One-to-one mirror of the @ReactMethod functions exposed by the native
// modules (Android: org.ZingoLabs.Zingo.RPCModule; iOS: RPCModule.swift).
// Every method returns a Promise<string>: either a JSON payload from zingolib
// or the literal "error: ..." prefix that callers check before parsing.
// Parameter names here are documentation only — the bridge uses positional
// arguments — but they're kept close to the native side so cross-platform
// diffs are easy to spot.
interface RPCModuleAPI {
  // Wallet lifecycle
  walletExists(): Promise<string>;
  walletBackupExists(): Promise<string>;
  createNewWallet(
    serverUri: string,
    birthday: string,
    chainHint: string,
    performanceLevel: string,
    minConfirmations: string,
  ): Promise<string>;
  restoreWalletFromSeed(
    seed: string,
    birthday: string,
    serverUri: string,
    chainHint: string,
    performanceLevel: string,
    minConfirmations: string,
  ): Promise<string>;
  restoreWalletFromUfvk(
    ufvk: string,
    birthday: string,
    serverUri: string,
    chainHint: string,
    performanceLevel: string,
    minConfirmations: string,
  ): Promise<string>;
  loadExistingWallet(
    serverUri: string,
    chainHint: string,
    performanceLevel: string,
    minConfirmations: string,
  ): Promise<string>;
  restoreExistingWalletBackup(): Promise<string>;
  deleteExistingWallet(): Promise<string>;
  deleteExistingWalletBackup(): Promise<string>;
  doSave(): Promise<string>;
  doSaveBackup(): Promise<string>;

  // Server / network
  getLatestBlockServerInfo(serverUri: string): Promise<string>;
  getLatestBlockWalletInfo(): Promise<string>;
  changeServerProcess(serverUri: string): Promise<string>;
  infoServerInfo(): Promise<string>;

  // Sync
  pollSyncInfo(): Promise<string>;
  runSyncProcess(): Promise<string>;
  pauseSyncProcess(): Promise<string>;
  statusSyncInfo(): Promise<string>;
  runRescanProcess(): Promise<string>;

  // Addresses
  getDonationAddress(): Promise<string>;
  getZenniesDonationAddress(): Promise<string>;
  getUnifiedAddressesInfo(): Promise<string>;
  getTransparentAddressesInfo(): Promise<string>;
  createNewUnifiedAddressProcess(receivers: string): Promise<string>;
  createNewTransparentAddressProcess(): Promise<string>;
  checkMyAddressInfo(address: string): Promise<string>;
  parseAddressInfo(address: string): Promise<string>;
  parseUfvkInfo(ufvk: string): Promise<string>;

  // Wallet identity / metadata
  walletKindInfo(): Promise<string>;
  getSeedInfo(): Promise<string>;
  getUfvkInfo(): Promise<string>;
  getVersionInfo(): Promise<string>;
  getWalletVersionInfo(): Promise<string>;
  getWalletSaveRequiredInfo(): Promise<string>;

  // Balances
  getBalanceInfo(): Promise<string>;
  getSpendableBalanceWithAddressInfo(
    address: string,
    zennies: string,
  ): Promise<string>;
  getSpendableBalanceTotalInfo(): Promise<string>;
  getTotalValueToAddressInfo(): Promise<string>;
  getTotalMemobytesToAddressInfo(): Promise<string>;
  getTotalSpendsToAddressInfo(): Promise<string>;
  zecPriceInfo(): Promise<string>;

  // Value transfers / messages
  getValueTransfersList(): Promise<string>;
  getMessagesInfo(address: string): Promise<string>;
  removeTransactionProcess(txid: string): Promise<string>;

  // Send / shield / confirm
  sendProcess(sendJson: string): Promise<string>;
  shieldProcess(): Promise<string>;
  confirmProcess(): Promise<string>;
  drainOrchardToIronwoodProcess(): Promise<string>;

  // Wallet options / configuration
  getOptionWalletInfo(): Promise<string>;
  setOptionWalletProcess(): Promise<string>;
  getConfigWalletPerformanceInfo(): Promise<string>;
  setConfigWalletToProdProcess(
    performanceLevel: string,
    minConfirmations: string,
  ): Promise<string>;
  setCryptoDefaultProvider(): Promise<string>;
}

export default NativeModules.RPCModule as RPCModuleAPI;
