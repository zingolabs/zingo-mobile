import { StackScreenProps } from '@react-navigation/stack';

import TotalBalanceClass from './classes/TotalBalanceClass';

import InfoType from './types/InfoType';
import WalletSeedType from './types/WalletSeedType';
import DimensionsType from './types/DimensionsType';
import zecPriceType from './types/zecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';

export default interface AppStateLoading {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  dimensions: DimensionsType;
  appState: string;
  netInfo: NetInfoType;

  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  walletSeed: WalletSeedType;
  totalBalance: TotalBalanceClass;
  info: InfoType;

  server: string;
  currency: 'USD' | '';
  language: 'en' | 'es';

  zecPrice: zecPriceType;
  sendAll: boolean;
  background: BackgroundType;

  translate: (key: string) => TranslateType;

  // eslint-disable-next-line semi
}
