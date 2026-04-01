import React from 'react';

const mockNavigation = {
  navigate: jest.fn(),
  openDrawer: jest.fn(),
  closeDrawer: jest.fn(),
  dispatch: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(),
  isFocused: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
  setOptions: jest.fn(),
  reset: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  setParams: jest.fn(),
  jumpTo: jest.fn(),
  emit: jest.fn(),
  dangerouslyGetParent: jest.fn(),
  dangerouslyGetState: jest.fn(),
};
const MockNavigator = ({ children }) => children;
const MockScreen = ({ _name, children, component }) => {
  if (typeof children === 'function') {
    return children({ navigation: mockNavigation });
  }

  const Component = component;
  return Component ? <Component /> : <>{children}</>;
};

export const createDrawerNavigator = jest.fn(() => ({
  Navigator: MockNavigator,
  Screen: MockScreen,
}));
