import ServerType from '../types/ServerType';

export default class SettingsFileClass {
  server: ServerType;
  currency: 'USD' | '';
  language: 'en' | 'es';
  sendAll: boolean;
  privacy: boolean;
  mode: 'basic' | 'expert';

  constructor(
    server: ServerType,
    currency: 'USD' | '',
    language: 'en' | 'es',
    sendAll: boolean,
    privacy: boolean,
    mode: 'basic' | 'expert',
  ) {
    this.server = server;
    this.currency = currency;
    this.language = language;
    this.sendAll = sendAll;
    this.privacy = privacy;
    this.mode = mode;
  }
}
