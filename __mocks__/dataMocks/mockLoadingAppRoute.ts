import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../app/types';
import { RouteEnum } from '../../app/AppState';

export const mockLoadingAppRoute: RouteProp<
  AppStackParamList,
  RouteEnum.LoadingApp
> = {
  key: 'LoadingApp-test',
  name: RouteEnum.LoadingApp,
  params: {
    screen: 0,
    startingApp: true,
    biometricsFailed: false,
    newWallet: false,
  },
};
