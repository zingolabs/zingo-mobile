import { DownloadMemosEnum } from '../enums/DownloadMemosEnum';

export default class WalletSettingsClass {
  downloadMemos: string;
  transactionFilterThreshold: string;

  constructor() {
    this.downloadMemos = DownloadMemosEnum.walletMemos;
    this.transactionFilterThreshold = '500';
  }
}
