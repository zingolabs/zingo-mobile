import backgroundType from '../types/backgroundType';

export default class WalletSettingsClass {
  download_memos: string;
  transaction_filter_threshold: string;
  server: string;
  currency: 'USD' | '';
  language: 'en' | 'es';
  sendAll: boolean;
  background: backgroundType;

  constructor() {
    this.download_memos = 'wallet';
    this.transaction_filter_threshold = '500';
    this.server = '';
    this.currency = '';
    this.language = 'en';
    this.sendAll = false;
    this.background = { batches: 0, date: 0 } as backgroundType;
  }
}
