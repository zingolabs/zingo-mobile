export default class SettingsFileClass {
  server: string;
  currency: 'USD' | '';
  language: 'en' | 'es';
  sendAll: boolean;

  constructor(server: string, currency: 'USD' | '', language: 'en' | 'es', sendAll: boolean) {
    this.server = server;
    this.currency = currency;
    this.language = language;
    this.sendAll = sendAll;
  }
}
