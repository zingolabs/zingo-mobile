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
      <Drawer initialRouteName={RouteEnum.History} onMenuItemSelected={onAction} screenName={ScreenEnum.LoadedApp}>
        <Drawer.Screen name={RouteEnum.History} component={() => <></>} />
        <Drawer.Screen name={RouteEnum.Send} component={() => <></>} />
      </Drawer>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
