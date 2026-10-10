import { AppStateStatus } from 'react-native';
import { LaunchingModeEnum } from './enums/LaunchingModeEnum';
import { RouteEnum } from './enums/RouteEnum';
import WalletType from './types/WalletType';
import { GateFailure } from './types/GateFailure';
import { WalletErrorInfo } from './types/WalletErrorInfo';
import { DeleteWalletContext } from './types/DeleteWalletContext';
import { ServerStatus } from './types/ServerStatus';
import ServerUrisType from './types/ServerUrisType';
import { ChainNameEnum } from './enums/ChainNameEnum';

/** The launch gate's outcome, carried whole so the locked screen renders the reason it was locked for. */
export type BiometricGateOutcome =
  { kind: 'passed' } | { kind: 'declined'; failure: GateFailure };

export default interface AppStateLoading {
  wallet: WalletType;
  // state
  appStateStatus: AppStateStatus;
  screen: RouteEnum;
  actionButtonsDisabled: boolean;
  progressKind: 'import' | 'create';
  walletExists: boolean;
  // One field for one outcome: `declined` and its failure travel together,
  // so a locked screen without a reason is unrepresentable.
  biometricGate: BiometricGateOutcome;
  startingApp: boolean;
  firstLaunchingMessage: LaunchingModeEnum;
  hasRecoveryWalletInfoSaved: boolean;
  recoveryWallet: WalletType | null;
  walletError: WalletErrorInfo | null;
  retrying: boolean;
  errorShake: number;
  deleteContext: DeleteWalletContext;
  serverStatus: ServerStatus;
  serverBlockHeight: string;
  // uri → latency in ms, null when the server did not answer the probe.
  serverLatencies: Record<string, number | null>;
  // chain → servers under Other servers; absent until its list has loaded.
  serverLists: Record<string, ServerUrisType[]>;
  // The network Other servers lists.
  serverListChain: ChainNameEnum;
  // Where Done on the Server screen goes back to.
  serverReturn: RouteEnum;
  // The network the Server screen opens on, when it is not the server's.
  serverTab: ChainNameEnum | null;
  // A retry from the error screen worked: its badge shrinks before Home.
  errorResolved: boolean;
}
