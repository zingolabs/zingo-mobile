import { ThemeType } from '../types/ThemeType';
import { ChainNameEnum } from './enums/ChainNameEnum';
import { AppStateStatus } from 'react-native';
import { ModeEnum } from './enums/ModeEnum';

export default interface AppStateLoading {
  // state
  theme: ThemeType;
  toggleTheme: (mode: ModeEnum.basic | ModeEnum.advanced) => void;
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

  // eslint-disable-next-line semi
}
