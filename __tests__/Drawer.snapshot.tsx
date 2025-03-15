/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Drawer from '../components/Drawer';
import { RouteEnums } from '../app/AppState';

// test suite
describe('Drawer Component', () => {
  it('renders correctly with screens', () => {
    const onAction = jest.fn();
    const { toJSON } = render(
      <Drawer initialRouteName={RouteEnums.Home} onMenuItemSelected={onAction}>
        <Drawer.Screen name={RouteEnums.Home} component={() => <></>} />
        <Drawer.Screen name={RouteEnums.LoadingApp} component={() => <></>} />
      </Drawer>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
