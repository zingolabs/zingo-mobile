import { DownloadMemosEnum, WalletSettingsClass } from '../../app/AppState';

export const mockWalletSettings: WalletSettingsClass = {
  downloadMemos: DownloadMemosEnum.walletMemos,
  transactionFilterThreshold: '500',
};
