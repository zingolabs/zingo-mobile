import { TranslateOptions } from 'i18n-js';
import { StackScreenProps } from '@react-navigation/stack';

import TotalBalance from './TotalBalance';
import InfoType from './InfoType';
import WalletSeed from './WalletSeed';
import DimensionsType from './DimensionsType';

export default interface AppStateLoading {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  dimensions: DimensionsType;

  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  walletSeed: WalletSeed;
  server: string;
  totalBalance: TotalBalance;
  info: InfoType;

  translate: (key: string, config?: TranslateOptions) => string;

  // eslint-disable-next-line semi
}
