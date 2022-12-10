import { TranslateOptions } from 'i18n-js';
import { NavigationScreenProp } from 'react-navigation';
import { RouteProp } from '@react-navigation/native';

import TotalBalance from './TotalBalance';
import InfoType from './InfoType';
import WalletSeed from './WalletSeed';

export default interface AppStateLoading {
  navigation: NavigationScreenProp<any> | null;
  route: RouteProp<any> | null;
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
  walletSeed: WalletSeed | null;
  server: string | null;
  totalBalance: TotalBalance;
  info: InfoType | null;

  translate: (key: string, config?: TranslateOptions) => any;

  // eslint-disable-next-line semi
}
