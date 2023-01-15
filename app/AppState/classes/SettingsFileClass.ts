import backgroundType from '../types/backgroundType';

export default class SettingsFileClass {
  server: string;
  currency: 'USD' | '';
  language: 'en' | 'es';
  sendAll: boolean;
  background: backgroundType;

  constructor(
    server: string,
    currency: 'USD' | '',
    language: 'en' | 'es',
    sendAll: boolean,
    background: backgroundType,
  ) {
    this.server = server;
    this.currency = currency;
    this.language = language;
    this.sendAll = sendAll;
    this.background = background;
  }
}
