import { AppStateStatus } from 'react-native';
import { LaunchingModeEnum } from './enums/LaunchingModeEnum';

export default interface AppStateLoading {
  // state
  appStateStatus: AppStateStatus;
  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  biometricsFailed: boolean;
  startingApp: boolean;
  serverErrorTries: number;
  firstLaunchingMessage: LaunchingModeEnum;
  hasRecoveryWalletInfoSaved: boolean;
}
