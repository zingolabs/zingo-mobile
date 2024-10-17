import { ChainNameEnum } from './enums/ChainNameEnum';
import { AppStateStatus } from 'react-native';

export default interface AppStateLoading {
  // state
  appStateStatus: AppStateStatus;
  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  customServerShow: boolean;
  customServerUri: string;
  customServerChainName: ChainNameEnum;
  biometricsFailed: boolean;
  startingApp: boolean;
  serverErrorTries: number;
  donationAlert: boolean;
  firstLaunchingMessage: boolean;
  hasRecoveryWalletInfoSaved: boolean;

  // eslint-disable-next-line semi
}
