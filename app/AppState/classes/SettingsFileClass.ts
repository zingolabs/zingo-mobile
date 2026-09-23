import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { BlockExplorerEnum } from '@app/AppState/enums/BlockExplorerEnum';
import { LanguageEnum } from '@app/AppState/enums/LanguageEnum';
import { ModeEnum } from '@app/AppState/enums/ModeEnum';
import { SelectServerEnum } from '@app/AppState/enums/SelectServerEnum';
import SecurityType from '@app/AppState/types/SecurityType';
import ServerType from '@app/AppState/types/ServerType';

export default class SettingsFileClass {
  server: ServerType;
  language: LanguageEnum;
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
  recoveryWalletInfoOnDevice: boolean;
  performanceLevel: RPCPerformanceLevelEnum;
  blockExplorer: BlockExplorerEnum;
  ironwoodOnboardSeen: boolean;

  constructor(
    server: ServerType,
    language: LanguageEnum,
    privacy: boolean,
    mode: ModeEnum,
    firstInstall: boolean,
    basicFirstViewSeed: boolean,
    version: string,
    security: SecurityType,
    selectServer: SelectServerEnum,
    recoveryWalletInfoOnDevice: boolean,
    performanceLevel: RPCPerformanceLevelEnum,
    blockExplorer: BlockExplorerEnum,
    ironwoodOnboardSeen: boolean,
  ) {
    this.server = server;
    this.language = language;
    this.privacy = privacy;
    this.mode = mode;
    this.firstInstall = firstInstall;
    this.basicFirstViewSeed = basicFirstViewSeed;
    this.version = version;
    this.security = security;
    this.selectServer = selectServer;
    this.recoveryWalletInfoOnDevice = recoveryWalletInfoOnDevice;
    this.performanceLevel = performanceLevel;
    this.blockExplorer = blockExplorer;
    this.ironwoodOnboardSeen = ironwoodOnboardSeen;
  }
}
