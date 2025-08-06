import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../app/types';
import { LaunchingModeEnum, RouteEnums } from '../../app/AppState';

export const mockLoadedAppRoute: RouteProp<RootStackParamList, RouteEnums.LoadedApp> = {
  key: 'LoadedApp-test',
  name: RouteEnums.LoadedApp,
  params: {
    readOnly: false,
    orchardPool: true,
    saplingPool: true,
    transparentPool: true,
    newWallet: false,
    firstLaunchingMessage: LaunchingModeEnum.opening,
  },
};
