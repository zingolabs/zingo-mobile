/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Drawer from '../components/Drawer';

// test suite
describe('Drawer Component', () => {
  it('renders correctly with screens', () => {
    const onAction = jest.fn();
    const { toJSON } = render(
      <Drawer initialRouteName="Home" onMenuItemSelected={onAction}>
        <Drawer.Screen name="Home" component={() => <></>} />
        <Drawer.Screen name="Settings" component={() => <></>} />
      </Drawer>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
