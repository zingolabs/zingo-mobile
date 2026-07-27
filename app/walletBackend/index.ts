/**
 * Public API for the wallet backend layer.
 *
 * Import WalletBackend (default) to drive the wallet from a component.
 * Import the named utility functions for one-off operations that don't need
 * a running WalletBackend instance (price fetching, shielding, seed display).
 */
import WalletBackend from './WalletBackend';

export type { FfiResult } from './ffi';
export type { ZecPriceOutcome } from './utils/walletUtils';
export { matchZecPriceOutcome } from './utils/walletUtils';
export {
  PRICE_FAILURE_HEADLINE,
  zecPriceFailureReport,
} from './transforms/zecPriceFailureTransform';
export { routeStartMigration } from './utils/migrationRouting';
export { scanInProgress } from './utils/syncProgress';
export type { ServerProbeOutcome } from './utils/serverProbeOutcome';
export {
  interpretServerProbe,
  matchServerProbeOutcome,
} from './utils/serverProbeOutcome';
export { probeServer } from './utils/connectionProbe';
export type { DoctorRun } from './transforms/connectionDoctorReport';
export { connectionDoctorReport } from './transforms/connectionDoctorReport';
export {
  cancelIronwoodMigration,
  changeServer,
  checkMyAddress,
  continueNoteSplitting,
  createNewTransparentAddress,
  createNewUnifiedAddress,
  createNewWallet,
  doSave,
  drainOrchard,
  drainStatus,
  executeDueParts,
  executeDuePartsStatus,
  fetchWallet,
  fetchWalletOutcome,
  getBalanceInfo,
  getDonationAddress,
  getLatestBlockServerInfo,
  getServerInfo,
  getSpendableBalanceWithAddress,
  getTotalMemobytesToAddress,
  getTotalSpendsToAddress,
  getTotalValueToAddress,
  getVersionInfo,
  getWalletKind,
  getZecPrice,
  getZenniesDonationAddress,
  isWalletAddress,
  loadExistingWallet,
  migrationStatus,
  parseAddress,
  planIronwoodMigration,
  planOrchardDrain,
  quickSplit,
  reconcileMigration,
  removeTransaction,
  resolvedTrue,
  restoreExistingWalletBackup,
  restoreWalletFromSeed,
  restoreWalletFromUfvk,
  sendPropose,
  setConfigWalletToProd,
  setCryptoDefaultProvider,
  shieldConfirm,
  shieldPropose,
  splitStatus,
  startIronwoodMigration,
  walletBackupExists,
  walletExists,
  windowTimeline,
} from './utils/walletUtils';
export default WalletBackend;
