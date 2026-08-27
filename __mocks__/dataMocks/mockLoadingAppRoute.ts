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
    screen: RouteEnum.Launching,
    startingApp: true,
    biometricGate: { kind: 'passed' as const },
    newWallet: false,
  },
};
