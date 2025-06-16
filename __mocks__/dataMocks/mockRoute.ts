import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../app/types';
import { RouteEnums } from '../../app/AppState';

export const mockRoute: StackScreenProps<RootStackParamList>['route'] = {
  // Propiedades necesarias para la ruta
  key: '',
  name: RouteEnums.LoadedApp,
};
