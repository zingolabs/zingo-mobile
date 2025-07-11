import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../app/types';
import { RouteEnums } from '../../app/AppState';

export const mockLoadingAppRoute: RouteProp<RootStackParamList, RouteEnums.LoadingApp> = {
  key: 'LoadingApp-test',
  name: RouteEnums.LoadingApp,
  params: {
    screen: 0,
    startingApp: true,
    biometricsFailed: false,
    newWallet: false,
  },
};
