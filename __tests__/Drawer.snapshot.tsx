/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Drawer from '../components/Drawer';

jest.mock('@react-navigation/drawer', () => {
  const MockNavigator = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const MockScreen = () => null; // No-op component

  return {
    createDrawerNavigator: jest.fn(() => ({
      Navigator: MockNavigator,
      Screen: MockScreen,
    })),
  };
});

// test suite
describe('Drawer Component', () => {
  it('renders correctly with screens', () => {
    const { toJSON } = render(
      <Drawer initialRouteName="Home">
        <Drawer.Screen name="Home" component={() => <></>} />
        <Drawer.Screen name="Settings" component={() => <></>} />
      </Drawer>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
