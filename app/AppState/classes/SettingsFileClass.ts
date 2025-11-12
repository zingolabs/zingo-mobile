import { RPCPerformanceLevelEnum } from '../../rpc/enums/RPCPerformanceLevelEnum';
import { CurrencyEnum } from '../enums/CurrencyEnum';
import { LanguageEnum } from '../enums/LanguageEnum';
import { ModeEnum } from '../enums/ModeEnum';
import { SelectServerEnum } from '../enums/SelectServerEnum';
import SecurityType from '../types/SecurityType';
import ServerType from '../types/ServerType';

export default class SettingsFileClass {
  lightWalletServer: ServerType;
  selectLightWalletServer: SelectServerEnum;
  validatorServer: ServerType;
  selectValidatorServer: SelectServerEnum;
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
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  performanceLevel: RPCPerformanceLevelEnum;

  constructor(
    lightWalletServer: ServerType,
    selectLightWalletServer: SelectServerEnum,
    validatorServer: ServerType,
    selectValidatorServer: SelectServerEnum,
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
    rescanMenu: boolean,
    recoveryWalletInfoOnDevice: boolean,
    performanceLevel: RPCPerformanceLevelEnum,
  ) {
    this.lightWalletServer = lightWalletServer;
    this.selectLightWalletServer = selectLightWalletServer;
    this.validatorServer = validatorServer;
    this.selectValidatorServer = selectValidatorServer;
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
    this.rescanMenu = rescanMenu;
    this.recoveryWalletInfoOnDevice = recoveryWalletInfoOnDevice;
    this.performanceLevel = performanceLevel;
  }
}
