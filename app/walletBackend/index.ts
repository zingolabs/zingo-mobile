/**
 * Public API for the wallet backend layer.
 *
 * Import WalletBackend (default) to drive the wallet from a component.
 * Import the named utility functions for one-off operations that don't need
 * a running WalletBackend instance (price fetching, shielding, seed display).
 */
import WalletBackend from './WalletBackend';

export type { FfiError, FfiErrorCode, FfiResult } from './ffi';
export type { StartMigrationRoute } from './utils/migrationRouting';
export { routeStartMigration } from './utils/migrationRouting';
export {
  cancelIronwoodMigration,
  changeServer,
  checkMyAddress,
  continueNoteSplitting,
  createNewTransparentAddress,
  createNewUnifiedAddress,
  createNewWallet,
  doSave,
  doSaveBackup,
  drainOrchard,
  drainStatus,
  executeDueParts,
  executeDuePartsStatus,
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
