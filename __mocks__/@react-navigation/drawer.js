import React from 'react';

const MockNavigator = ({ children }) => children;
const MockScreen = ({ _name, children, component }) => {
    if (typeof children === 'function') {
      return children({ navigation: {} });
    }

    const Component = component;
    return Component ? <Component /> : <>{children}</>;
};

export const createDrawerNavigator = jest.fn(() => ({
    Navigator: MockNavigator,
    Screen: MockScreen,
}));
