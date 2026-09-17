/**
 * Public API for the wallet backend layer: WalletBackend (default) drives
 * the wallet from a component, and the named exports serve one-off calls
 * that need no running instance.
 */
import WalletBackend from './WalletBackend';

export type { FfiError, FfiResult, FfiTag } from './ffi';
export { toFfiError } from './ffi';
export type { WalletHandle } from './wallet';
export { openWallet } from './wallet';
export { subscribeWalletEvents } from './events';
export type { WalletEventListener } from './events';
export type {
  CadencePlanRoute,
  ReschedulePartsRoute,
  StartMigrationRoute,
} from './utils/migrationRouting';
export {
  routeCadencePlan,
  routeRescheduleParts,
  routeStartMigration,
} from './utils/migrationRouting';
export {
  IDLE_SYNC_STATUS,
  hasSyncStatus,
  scanInProgress,
} from './utils/syncProgress';
export {
  ffiErrorText,
  fillParams,
} from './transforms/ffiErrorTransform';
export type { FfiErrorKey, FfiErrorText } from './transforms/ffiErrorTransform';
export type {
  BroadcastWindowType,
  DrainPlanType,
  DrainTransactionType,
  DueBatchType,
  MigrationPhaseType,
  MigrationPlanType,
  MigrationStatusType,
  SplitTransactionType,
  WindowReportType,
} from './types/MigrationTypes';
export type {
  DrainReportType,
  SendProposalType,
  ShieldProposalType,
  WalletProfile,
} from './utils/walletUtils';
export {
  cancelIronwoodMigration,
  changeServer,
  checkMyAddress,
  confirmSend,
  continueNoteSplitting,
  createNewTransparentAddress,
  createNewUnifiedAddress,
  createNewWallet,
  doSave,
  doSaveBackup,
  drainOrchard,
  executeDueParts,
  fetchWallet,
  getBalanceInfo,
  getDonationAddress,
  getLatestBlockServerInfo,
  getServerInfo,
  getSpendableBalanceWithAddress,
  getTotalMemobytesToAddress,
  getTotalSpendsToAddress,
  getTotalValueToAddress,
  getVersionInfo,
  getZecPrice,
  getZenniesDonationAddress,
  installCryptoProvider,
  isWalletAddress,
  loadExistingWallet,
  migrationStatus,
  parseAddress,
  planIronwoodMigration,
  planOrchardDrain,
  quickSplit,
  reconcileMigration,
  removeTransaction,
  rescheduleParts,
  restoreExistingWalletBackup,
  restoreWalletFromSeed,
  restoreWalletFromUfvk,
  sendPropose,
  setWalletSettings,
  shieldConfirm,
  shieldPropose,
  startIronwoodMigration,
  walletBackupExists,
  walletExists,
  walletProfile,
  windowTimeline,
} from './utils/walletUtils';
export {
  hasRepairableWalletFile,
  repairDoubleWrappedWallet,
  repairSucceeded,
  walletFileDiagnosis,
  walletSeedSalvage,
  WALLET_FILE_NAME,
  WALLET_BACKUP_FILE_NAME,
} from './utils/walletFileRepair';
export type {
  WalletFileDiagnosis,
  WalletFileDiagnosisReport,
  WalletFileRepairOutcome,
  WalletFileState,
  WalletSeedSalvage,
} from './utils/walletFileRepair';
export default WalletBackend;
