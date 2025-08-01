import { ChainNameEnum } from './enums/ChainNameEnum';
import { AppStateStatus } from 'react-native';
import { LaunchingModeEnum } from './enums/LaunchingModeEnum';

export default interface AppStateLoading {
  // state
  appStateStatus: AppStateStatus;
  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  customServerShow: boolean;
  customServerUri: string;
  customServerChainName: ChainNameEnum;
  customServerOffline: boolean;
  biometricsFailed: boolean;
  startingApp: boolean;
  serverErrorTries: number;
  donationAlert: boolean;
  firstLaunchingMessage: LaunchingModeEnum;
  hasRecoveryWalletInfoSaved: boolean;

  // eslint-disable-next-line semi
}
