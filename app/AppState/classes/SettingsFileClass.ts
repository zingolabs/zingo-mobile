import ServerType from '../types/ServerType';

export default class SettingsFileClass {
  server: ServerType;
  currency: 'USD' | '';
  language: 'en' | 'es';
  sendAll: boolean;
  privacy: boolean;
  mode: 'basic' | 'advanced';
  firstInstall: boolean;
  basicFirstViewSeed: boolean;
  customFee: number;

  constructor(
    server: ServerType,
    currency: 'USD' | '',
    language: 'en' | 'es',
    sendAll: boolean,
    privacy: boolean,
    mode: 'basic' | 'advanced',
    firstInstall: boolean,
    basicFirstViewSeed: boolean,
    customFee: number,
  ) {
    this.server = server;
    this.currency = currency;
    this.language = language;
    this.sendAll = sendAll;
    this.privacy = privacy;
    this.mode = mode;
    this.firstInstall = firstInstall;
    this.basicFirstViewSeed = basicFirstViewSeed;
    this.customFee = customFee;
  }
}
