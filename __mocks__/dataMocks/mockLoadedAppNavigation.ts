import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '@app/types';
import { RouteEnum } from '@app/AppState';

export const mockLoadedAppNavigation: StackNavigationProp<
  AppStackParamList,
  RouteEnum.LoadedApp
> = {
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
