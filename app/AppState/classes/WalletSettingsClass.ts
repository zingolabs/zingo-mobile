export default class WalletSettingsClass {
  download_memos: string;
  transaction_filter_threshold: string;

  constructor() {
    this.download_memos = 'wallet';
    this.transaction_filter_threshold = '500';
  }
}
