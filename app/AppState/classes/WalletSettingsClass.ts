export default class WalletSettingsClass {
  download_memos: string;
  transaction_filter_threshold: string;
  server: string;
  currency: 'USD' | '';
  language: 'en' | 'es';
  sendAll: boolean;

  constructor() {
    this.download_memos = 'wallet';
    this.transaction_filter_threshold = '500';
    this.server = '';
    this.currency = '';
    this.language = 'en';
    this.sendAll = false;
  }
}
