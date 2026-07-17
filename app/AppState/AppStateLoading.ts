import { ChainNameEnum } from './enums/ChainNameEnum';
import { AppStateStatus } from 'react-native';
import { LaunchingModeEnum } from './enums/LaunchingModeEnum';
import { RouteEnum } from './enums/RouteEnum';
import WalletType from './types/WalletType';

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
  startingApp: boolean;
  serverErrorTries: number;
  donationAlert: boolean;
  firstLaunchingMessage: LaunchingModeEnum;
  hasRecoveryWalletInfoSaved: boolean;
}
