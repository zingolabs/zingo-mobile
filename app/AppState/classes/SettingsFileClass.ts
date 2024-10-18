import { CurrencyEnum } from '../enums/CurrencyEnum';
import { LanguageEnum } from '../enums/LanguageEnum';
import { ModeEnum } from '../enums/ModeEnum';
import { SelectServerEnum } from '../enums/SelectServerEnum';
import SecurityType from '../types/SecurityType';
import ServerType from '../types/ServerType';

export default class SettingsFileClass {
  server: ServerType;
  currency: CurrencyEnum;
  language: LanguageEnum;
  sendAll: boolean;
  donation: boolean;
  privacy: boolean;
  mode: ModeEnum;
  firstInstall: boolean;
  basicFirstViewSeed: boolean;
  version: string | null;
  // three values:
  // - '': means the prior version doesn't have this field in settings
  // - null: means is a fresh install
  // - string: means it have a normal value
  security: SecurityType;
  selectServer: SelectServerEnum;
  firstUpdateWithDonation: boolean;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;

  constructor(
    server: ServerType,
    currency: CurrencyEnum,
    language: LanguageEnum,
    sendAll: boolean,
    donation: boolean,
    privacy: boolean,
    mode: ModeEnum,
    firstInstall: boolean,
    basicFirstViewSeed: boolean,
    version: string,
    security: SecurityType,
    selectServer: SelectServerEnum,
    firstUpdateWithDonation: boolean,
    rescanMenu: boolean,
    recoveryWalletInfoOnDevice: boolean,
  ) {
    this.server = server;
    this.currency = currency;
    this.language = language;
    this.sendAll = sendAll;
    this.donation = donation;
    this.privacy = privacy;
    this.mode = mode;
    this.firstInstall = firstInstall;
    this.basicFirstViewSeed = basicFirstViewSeed;
    this.version = version;
    this.security = security;
    this.selectServer = selectServer;
    this.firstUpdateWithDonation = firstUpdateWithDonation;
    this.rescanMenu = rescanMenu;
    this.recoveryWalletInfoOnDevice = recoveryWalletInfoOnDevice;
  }
}
