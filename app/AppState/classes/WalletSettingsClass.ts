import { DownloadMemosEnum } from '../enums/DownloadMemosEnum';

export default class WalletSettingsClass {
  download_memos: string;
  transaction_filter_threshold: string;

  constructor() {
    this.download_memos = DownloadMemosEnum.wallet;
    this.transaction_filter_threshold = '500';
  }
}
