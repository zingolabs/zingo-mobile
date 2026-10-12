import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { BlockExplorerEnum } from '@app/AppState/enums/BlockExplorerEnum';
import { LanguageEnum } from '@app/AppState/enums/LanguageEnum';
import { SelectServerEnum } from '@app/AppState/enums/SelectServerEnum';
import ServerType from '@app/AppState/types/ServerType';

export default class SettingsFileClass {
  server: ServerType;
  language: LanguageEnum;
  privacy: boolean;
  firstInstall: boolean;
  version: string | null;
  // three values:
  // - '': means the prior version doesn't have this field in settings
  // - null: means is a fresh install
  // - string: means it have a normal value
  biometrics: boolean;
  selectServer: SelectServerEnum;
  performanceLevel: RPCPerformanceLevelEnum;
  blockExplorer: BlockExplorerEnum;
  ironwoodOnboardSeen: boolean;
  seedBackedUp: boolean;
  // ms since epoch of the last confirmed backup; 0 for a restored wallet
  seedBackedUpAt: number;
  // The user closed the view-only notice of this wallet.
  viewOnlyNoticeDismissed: boolean = false;

  constructor(
    server: ServerType,
    language: LanguageEnum,
    privacy: boolean,
    firstInstall: boolean,
    version: string,
    biometrics: boolean,
    selectServer: SelectServerEnum,
    performanceLevel: RPCPerformanceLevelEnum,
    blockExplorer: BlockExplorerEnum,
    ironwoodOnboardSeen: boolean,
    seedBackedUp: boolean,
    seedBackedUpAt: number,
  ) {
    this.server = server;
    this.language = language;
    this.privacy = privacy;
    this.firstInstall = firstInstall;
    this.version = version;
    this.biometrics = biometrics;
    this.selectServer = selectServer;
    this.performanceLevel = performanceLevel;
    this.blockExplorer = blockExplorer;
    this.ironwoodOnboardSeen = ironwoodOnboardSeen;
    this.seedBackedUp = seedBackedUp;
    this.seedBackedUpAt = seedBackedUpAt;
  }
}
