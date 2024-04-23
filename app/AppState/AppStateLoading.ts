import { StackScreenProps } from '@react-navigation/stack';

import TotalBalanceClass from './classes/TotalBalanceClass';

import InfoType from './types/InfoType';
import WalletType from './types/WalletType';
import ZecPriceType from './types/ZecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';
import BackgroundErrorType from './types/BackgroundErrorType';
import ServerType from './types/ServerType';
import SnackbarType from './types/SnackbarType';
import SecurityType from './types/SecurityType';
import { CurrencyEnum } from './enums/CurrencyEnum';
import { LanguageEnum } from './enums/LanguageEnum';
import { ModeEnum } from './enums/ModeEnum';

export default interface AppStateLoading {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  appState: string;
  netInfo: NetInfoType;

  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  wallet: WalletType;
  totalBalance: TotalBalanceClass;
  info: InfoType;

  server: ServerType;
  currency: CurrencyEnum;
  language: LanguageEnum;

  zecPrice: ZecPriceType;
  sendAll: boolean;
  donation: boolean;
  background: BackgroundType;

  translate: (key: string) => TranslateType;
  backgroundError: BackgroundErrorType;
  setBackgroundError: (title: string, error: string) => void;

  privacy: boolean;
  readOnly: boolean;

  customServerShow: boolean;
  customServerUri: string;
  customServerChainName: 'main' | 'test' | 'regtest';

  mode: ModeEnum;
  snackbars: SnackbarType[];
  addLastSnackbar: (snackbar: SnackbarType) => void;

  firstLaunchingMessage: boolean;
  biometricsFailed: boolean;
  startingApp: boolean;
  security: SecurityType;
  selectServer: 'auto' | 'list' | 'custom';
  serverErrorTries: number;
  donationAlert: boolean;

  // eslint-disable-next-line semi
}
