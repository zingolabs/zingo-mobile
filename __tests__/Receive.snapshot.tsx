/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Receive from '../components/Receive';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): DrawerScreenProps<AppDrawerParamList, RouteEnum.Receive> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Receive,
      params: undefined,
    },
  };
}
// test suite
describe('Component Receive - test', () => {
  //snapshot test
  test('Receive - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.addresses = mockAddresses;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onFunction = jest.fn();
    const props = makeDrawerProps();
    const receive = render(
      <ContextAppLoadedProvider value={state}>
        <Receive {...props}
          toggleMenuDrawer={onFunction} 
          alone={false} 
          setSecurityOption={onFunction} 
        />
      </ContextAppLoadedProvider>,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
