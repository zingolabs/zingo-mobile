import { NativeModules } from 'react-native';

/**
 * The native wallet-file module: it owns the wallet file on disk and opens
 * it into the process-wide wallet slot that `currentWallet()` reads. Every
 * rejection is an Error whose `code` is a LoadError tag name or "Host" and
 * whose `message` is the detail.
 */
interface RPCModuleAPI {
  walletExists(): Promise<boolean>;
  walletBackupExists(): Promise<boolean>;
  loadExistingWallet(
    serverUri: string,
    chain: string,
    performanceLevel: string,
    minConfirmations: number,
  ): Promise<void>;
  saveWallet(): Promise<void>;
  saveWalletBackup(): Promise<void>;
  restoreExistingWalletBackup(): Promise<void>;
  deleteExistingWallet(): Promise<boolean>;
  deleteExistingWalletBackup(): Promise<boolean>;
  walletFileDiagnosisInfo(): Promise<string>;
  repairDoubleWrappedWalletProcess(): Promise<string>;
  walletFileRecoveryInfo(): Promise<string>;
}

export default NativeModules.RPCModule as RPCModuleAPI;
