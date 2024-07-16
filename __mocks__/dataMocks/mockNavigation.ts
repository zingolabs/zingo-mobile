import { StackScreenProps } from '@react-navigation/stack';

export const mockNavigation: StackScreenProps<any>['navigation'] = {
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
  // Agrega cualquier otra propiedad o método necesario para tu caso
};
