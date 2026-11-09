import { AppStateStatus } from 'react-native';
import { LaunchingModeEnum } from '@app/lifecycle/LaunchingModeEnum';
import WalletType from '@app/wallet/WalletType';
import { GateFailure } from '@app/security/GateFailure';
import { WalletErrorInfo } from '@app/wallet/WalletErrorInfo';
import { DeleteWalletContext } from '@app/wallet/DeleteWalletContext';
import { ServerStatus } from '@app/server/ServerStatus';
import ServerUrisType from '@app/server/ServerUrisType';

/** The launch gate's outcome, carried whole so the locked screen renders the reason it was locked for. */
export type BiometricGateOutcome =
  { kind: 'passed' } | { kind: 'declined'; failure: GateFailure };

export default interface AppStateLoading {
  wallet: WalletType;
  // state
  appStateStatus: AppStateStatus;
  actionButtonsDisabled: boolean;
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
  // A retry from the error screen worked: its badge shrinks before Home.
  errorResolved: boolean;
}
