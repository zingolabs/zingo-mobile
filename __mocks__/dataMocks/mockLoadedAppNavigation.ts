import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../app/types';
import { RouteEnums } from '../../app/AppState';

export const mockLoadedAppNavigation: StackNavigationProp<RootStackParamList, RouteEnums.LoadedApp> = {
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
  navigateDeprecated: jest.fn(),
  replaceParams: jest.fn(),
};
