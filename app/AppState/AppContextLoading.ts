import ZecPriceType from './types/ZecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';
import BackgroundErrorType from './types/BackgroundErrorType';
import ServerType from './types/ServerType';

import { LanguageEnum } from './enums/LanguageEnum';
import { SelectServerEnum } from './enums/SelectServerEnum';
import { SnackbarDurationEnum } from './enums/SnackbarDurationEnum';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { BlockExplorerEnum } from './enums/BlockExplorerEnum';
import { ChainNameEnum } from './enums/ChainNameEnum';
import WalletType from './types/WalletType';
import { WalletErrorInfo } from './types/WalletErrorInfo';
import { ServerStatus } from './types/ServerStatus';
import type { BiometricGateOutcome } from './AppStateLoading';

// Asks the Server screen whether leaving it needs a confirmation first.
export type BackGuard = { current: (() => boolean) | null };

export default interface AppContextLoading extends OnboardingContext {
  // context
  netInfo: NetInfoType;
  zecPrice: ZecPriceType;
  translate: (key: string) => TranslateType;
  backgroundSyncInfo: BackgroundType;
  backgroundError: BackgroundErrorType;
  setBackgroundError: (title: string, error: string) => void;
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  addLastSnackbar: (message: string, duration?: SnackbarDurationEnum) => void;
  zingolibVersion: string;
  setPrivacyOption: (value: boolean) => Promise<void>;

  // context settings
  server: ServerType;
  language: LanguageEnum;
  privacy: boolean;
  biometrics: boolean;
  selectServer: SelectServerEnum;
  performanceLevel: RPCPerformanceLevelEnum;
  blockExplorer: BlockExplorerEnum;
}

// The onboarding stage: what its screens show and what they run. The
// provider owns the wallet backend and the stage's navigation.
export interface OnboardingContext {
  // The boot gate's outcome; the lock screen shows why it was locked.
  biometricGate: BiometricGateOutcome;
  retryGate: () => void;
  // A wallet that exists is being opened by a new version of the app.
  updating: boolean;
  busy: boolean;
  walletExists: boolean;
  recoveryWallet: WalletType | null;
  // The saved phrase outlived an uninstall.
  freshInstall: boolean;
  walletError: WalletErrorInfo | null;
  // A retry worked: the error badge shrinks before the wallet opens.
  errorResolved: boolean;
  retrying: boolean;
  // Changes on every failed retry; the error icon shakes once per change.
  errorShake: number;
  serverStatus: ServerStatus;
  serverBlockHeight: string;
  // uri → latency in ms, null when the server did not answer the probe.
  serverLatencies: Record<string, number | null>;
  // chain → its Default Indexer; absent until asked, null for a chain
  // without one.
  serverDefaults: Record<string, string | null>;
  serverBackGuard: BackGuard;
  // `origin` is the screen the import started from; a failure returns there.
  importRecoveryWallet: (origin: 'Welcome' | 'ImportChooser') => void;
  viewRecoveryWallet: () => void;
  openServer: (chain?: ChainNameEnum) => void;
  closeServer: () => void;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  retryOpenWallet: () => void;
  // The hold-to-delete sheet, then the import or the create.
  deleteThenImport: () => void;
  deleteThenCreate: () => void;
  switchToWalletChain: (chain: ChainNameEnum) => void;
  chooseAutomatic: (chain: ChainNameEnum) => Promise<void>;
  saveCustomServer: (chain: ChainNameEnum, uri: string) => Promise<boolean>;
  setOffline: (on: boolean, chain: ChainNameEnum) => Promise<void>;
  probeServers: (chain: ChainNameEnum) => Promise<void>;
  serverUnreachable: () => void;
  doRestore: (seedUfvk: string, birthday: number) => Promise<void>;
}
