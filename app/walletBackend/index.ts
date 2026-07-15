/**
 * Public API for the wallet backend layer.
 *
 * Import WalletBackend (default) to drive the wallet from a component.
 * Import the named utility functions for one-off operations that don't need
 * a running WalletBackend instance (price fetching, shielding, seed display).
 */
import WalletBackend from './WalletBackend';

export {
  changeServer,
  checkMyAddress,
  createNewTransparentAddress,
  createNewUnifiedAddress,
  createNewWallet,
  doSave,
  doSaveBackup,
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
  parseAddress,
  removeTransaction,
  reserveEphemeralAddress,
  restoreExistingWalletBackup,
  restoreWalletFromSeed,
  restoreWalletFromUfvk,
  sendPropose,
  setConfigWalletToProd,
  setCryptoDefaultProvider,
  shieldConfirm,
  shieldPropose,
  walletBackupExists,
  walletExists,
} from './utils/walletUtils';
export default WalletBackend;
