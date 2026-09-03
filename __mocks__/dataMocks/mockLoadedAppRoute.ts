import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '@app/types';
import { ChainNameEnum, LaunchingModeEnum, RouteEnum } from '@app/AppState';

export const mockLoadedAppRoute: RouteProp<
  AppStackParamList,
  RouteEnum.LoadedApp
> = {
  key: 'LoadedApp-test',
  name: RouteEnum.LoadedApp,
  params: {
    readOnly: false,
    orchardPool: true,
    saplingPool: true,
    transparentPool: true,
    newWallet: false,
    firstLaunchingMessage: LaunchingModeEnum.opening,
    walletChainName: ChainNameEnum.mainChainName,
  },
};
