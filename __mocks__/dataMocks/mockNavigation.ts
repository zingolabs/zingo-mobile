import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../app/types';

export const mockNavigation: StackScreenProps<RootStackParamList>['navigation'] = {
  // Propiedades y métodos necesarios para la navegación
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getParent: jest.fn(),
  getId: jest.fn(),
  getState: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  popTo: jest.fn(),
  preload: jest.fn(),
  setStateForNextRouteNamesChange: jest.fn(),
  navigateDeprecated: jest.fn(),
  // Agrega cualquier otra propiedad o método necesario para tu caso
};
