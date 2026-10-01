import { ChainNameEnum } from './enums/ChainNameEnum';
import { AppStateStatus } from 'react-native';
import { LaunchingModeEnum } from './enums/LaunchingModeEnum';
import { RouteEnum } from './enums/RouteEnum';
import WalletType from './types/WalletType';
import { GateFailure } from './types/GateFailure';
import { WalletErrorInfo } from './types/WalletErrorInfo';
import { DeleteWalletContext } from './types/DeleteWalletContext';

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
  customServerUri: string;
  customServerChainName: ChainNameEnum;
  customServerOffline: boolean;
  customServerAuto: boolean;
  customServerCustom: boolean;
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
}
