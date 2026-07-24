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
  // The save results are trimodal across the bridges: Android resolves a
  // boolean, iOS resolves "true"/"false", and both resolve "Error: ..."
  // prose from their catch blocks (zingo-mobile#1151). Classify with
  // nativeSaveSucceeded, never by inspecting content ad hoc.
  doSave(): Promise<boolean | string>;
  doSaveBackup(): Promise<boolean | string>;

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

  // Ironwood migration (Orchard -> Ironwood drain)
  planOrchardDrainProcess(): Promise<string>;
  drainOrchardProcess(): Promise<string>;
  // Live progress of the in-flight drain; safe to poll concurrently with
  // drainOrchardProcess (reads a native side channel, not the lightclient lock).
  drainStatusProcess(): Promise<string>;

  // Ironwood private migration (ZIP 318 note splitting + scheduled parts).
  // Numeric arguments cross the bridge as strings; empty perBucket keeps
  // zingolib's default cadence.
  planIronwoodMigrationProcess(): Promise<string>;
  startIronwoodMigrationProcess(
    planHashHex: string,
    perBucket: string,
  ): Promise<string>;
  continueNoteSplittingProcess(): Promise<string>;
  // Phase 1 splitting, stateless and send-shaped (ADR 0016). One call per
  // round; loop until the outcome is `complete`, then startIronwoodMigration.
  quickSplitProcess(): Promise<string>;
  // Live progress of the in-flight splitting round; safe to poll concurrently
  // with quickSplitProcess (reads a native side channel, not the lightclient
  // lock).
  splitStatusProcess(): Promise<string>;
  reschedulePartsProcess(perBucket: string): Promise<string>;
  migrationStatusProcess(): Promise<string>;
  // The window calendar (past, current, future) for a schedule grid, valid
  // with or without a migration; null before the wallet has ever synced.
  windowTimelineProcess(): Promise<string>;
  reconcileMigrationProcess(): Promise<string>;
  // Phase-2 execute tap: sends a scheduled window's due batch. spacingMs (the
  // delay sequenced between the batch's sends) crosses as a string.
  executeDuePartsProcess(spacingMs: string): Promise<string>;
  // Live progress of the in-flight batch; safe to poll concurrently with
  // executeDuePartsProcess (reads a native side channel, not the lightclient
  // lock).
  executeDuePartsStatusProcess(): Promise<string>;
  cancelIronwoodMigrationProcess(): Promise<string>;

  // Wallet options / configuration
  getOptionWalletInfo(): Promise<string>;
  setOptionWalletProcess(): Promise<string>;
  getConfigWalletPerformanceInfo(): Promise<string>;
  setConfigWalletToProdProcess(
    performanceLevel: string,
    minConfirmations: string,
  ): Promise<string>;
  setCryptoDefaultProvider(): Promise<string>;

  // Mixnet Mode (send-over-nym). The Android native module implements these
  // today; the iOS methods land with the Mac-gated iOS step.
  attachMixnet(socks5Addr: string): Promise<string>;
  enableMixnet(proxyPath: string): Promise<string>;
  disableMixnet(): Promise<string>;
  mixnetModeInfo(): Promise<string>;
  mixnetBootstrapDetailInfo(): Promise<string>;
  mixnetIpCorrelationDisclaimerInfo(): Promise<string>;
}

export default NativeModules.RPCModule as RPCModuleAPI;
