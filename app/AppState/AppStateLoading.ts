import { ChainNameEnum } from './enums/ChainNameEnum';
import { AppStateStatus } from 'react-native';
import { LaunchingModeEnum } from './enums/LaunchingModeEnum';
import { RouteEnum } from './enums/RouteEnum';
import WalletType from './types/WalletType';
import type { GateFailure } from '../simpleBiometrics';

export default interface AppStateLoading {
  wallet: WalletType;
  // state
  appStateStatus: AppStateStatus;
  screen: RouteEnum;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  hasBackupWallet: boolean;
  customServerUri: string;
  customServerChainName: ChainNameEnum;
  customServerOffline: boolean;
  customServerAuto: boolean;
  customServerCustom: boolean;
  biometricsFailed: boolean;
  // Snapshotted at decline time so the locked screen's message cannot be
  // rewritten or wiped by a later gate run mutating the module global.
  gateFailure?: GateFailure;
  startingApp: boolean;
  serverErrorTries: number;
  donationAlert: boolean;
  firstLaunchingMessage: LaunchingModeEnum;
  hasRecoveryWalletInfoSaved: boolean;
}
