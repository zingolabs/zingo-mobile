/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Drawer from '../components/Drawer';
import { RouteEnum, ScreenEnum } from '../app/AppState';

// test suite
describe('Drawer Component', () => {
  it('renders correctly with screens', () => {
    const onAction = jest.fn();
    const { toJSON } = render(
      <Drawer initialRouteName={RouteEnum.Home} onMenuItemSelected={onAction} screenName={ScreenEnum.LoadedApp}>
        <Drawer.Screen name={RouteEnum.Home} component={() => <></>} />
        <Drawer.Screen name={RouteEnum.Settings} component={() => <></>} />
      </Drawer>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
