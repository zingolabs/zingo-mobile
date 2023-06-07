import ServerType from '../types/ServerType';

export default class SettingsFileClass {
  server: ServerType;
  currency: 'USD' | '';
  language: 'en' | 'es';
  sendAll: boolean;
  privacy: boolean;

  constructor(server: ServerType, currency: 'USD' | '', language: 'en' | 'es', sendAll: boolean, privacy: boolean) {
    this.server = server;
    this.currency = currency;
    this.language = language;
    this.sendAll = sendAll;
    this.privacy = privacy;
  }
}
