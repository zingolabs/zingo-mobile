import { TranslateOptions } from 'i18n-js';
import { StackScreenProps } from '@react-navigation/stack';

import TotalBalance from './TotalBalance';
import InfoType from './InfoType';
import WalletSeed from './WalletSeed';

export default interface AppStateLoading {
  navigation: StackScreenProps<any>['navigation'];
  route: StackScreenProps<any>['route'];
  dimensions: {
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
    deviceType: 'tablet' | 'phone';
    scale: number;
  };

  screen: number;
  actionButtonsDisabled: boolean;
  walletExists: boolean;
  walletSeed: WalletSeed;
  server: string;
  totalBalance: TotalBalance;
  info: InfoType;

  translate: (key: string, config?: TranslateOptions) => any;

  // eslint-disable-next-line semi
}
