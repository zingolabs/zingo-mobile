import { StackScreenProps } from '@react-navigation/stack';

import TotalBalanceClass from './classes/TotalBalanceClass';

import InfoType from './types/InfoType';
import WalletType from './types/WalletType';
import DimensionsType from './types/DimensionsType';
import zecPriceType from './types/zecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';
import BackgroundErrorType from './types/BackgroundErrorType';
import ServerType from './types/ServerType';

export default interface AppStateLoading {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  dimensions: DimensionsType;
  appState: string;
  netInfo: NetInfoType;

  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  wallet: WalletType;
  totalBalance: TotalBalanceClass;
  info: InfoType;

  server: ServerType;
  currency: 'USD' | '';
  language: 'en' | 'es';

  zecPrice: zecPriceType;
  sendAll: boolean;
  background: BackgroundType;

  translate: (key: string) => TranslateType;
  backgroundError: BackgroundErrorType;

  privacy: boolean;
  customServerShow: boolean;
  customServerUri: string;
  customServerChainName: 'main' | 'test' | 'regtest';

  // eslint-disable-next-line semi
}
