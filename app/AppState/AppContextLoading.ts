import ZecPriceType from '@app/price/ZecPriceType';
import BackgroundType from '@app/lifecycle/BackgroundType';
import { TranslateType } from '@app/translations/TranslateType';
import NetInfoType from '@app/lifecycle/NetInfoType';
import BackgroundErrorType from '@app/lifecycle/BackgroundErrorType';
import ServerType from '@app/server/ServerType';

import { LanguageEnum } from '@app/settings/LanguageEnum';
import { SelectServerEnum } from '@app/server/SelectServerEnum';
import { SnackbarDurationEnum } from '@app/alert/SnackbarDurationEnum';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/RPCPerformanceLevelEnum';
import { BlockExplorerEnum } from '@app/settings/BlockExplorerEnum';
import { ChainNameEnum } from '@app/server/ChainNameEnum';
import WalletType from '@app/wallet/WalletType';
import { WalletErrorInfo } from '@app/wallet/WalletErrorInfo';
import { ServerStatus } from '@app/server/ServerStatus';
import ServerUrisType from '@app/server/ServerUrisType';
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
  // chain → servers under Other servers; absent until its list has loaded.
  serverLists: Record<string, ServerUrisType[]>;
  serverBackGuard: BackGuard;
  // `origin` is the screen the import started from; a failure returns there.
  importRecoveryWallet: (origin: 'Welcome' | 'ImportChooser') => void;
  viewRecoveryWallet: () => void;
  openServer: (chain?: ChainNameEnum) => void;
  closeServer: () => void;
  /** What back does on the onboarding step in front: Android's back, iOS's edge swipe. */
  stepBack: () => boolean;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  retryOpenWallet: () => void;
  // The hold-to-delete sheet, then the import or the create.
  deleteThenImport: () => void;
  deleteThenCreate: () => void;
  switchToWalletChain: (chain: ChainNameEnum) => void;
  chooseAutomatic: (chain: ChainNameEnum) => Promise<void>;
  pickServer: (server: ServerUrisType) => Promise<void>;
  saveCustomServer: (chain: ChainNameEnum, uri: string) => Promise<boolean>;
  setOffline: (on: boolean, chain: ChainNameEnum) => Promise<void>;
  probeServers: (chain: ChainNameEnum) => Promise<void>;
  serverUnreachable: () => void;
  serversFor: (chain: ChainNameEnum) => ServerUrisType[];
  doRestore: (seedUfvk: string, birthday: number) => Promise<void>;
}
