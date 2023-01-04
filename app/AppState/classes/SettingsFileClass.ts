export default class SettingsFileClass {
  server: string;
  currency: 'USD' | '';
  language: 'en' | 'es';

  constructor(server: string, currency: 'USD' | '', language: 'en' | 'es') {
    this.server = server;
    this.currency = currency;
    this.language = language;
  }
}
