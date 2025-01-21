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

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native-tab-view', () => ({
  TabView: '',
  TabBar: '',
}));
jest.mock('react-native-option-menu', () => '');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});

// test suite
describe('Component Receive - test', () => {
  //snapshot test
  test('Receive - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.uOrchardAddress = mockAddresses[0].uOrchardAddress;
    state.addresses = mockAddresses;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onFunction = jest.fn();
    const receive = render(
      <ContextAppLoadedProvider value={state}>
        <Receive toggleMenuDrawer={onFunction} syncingStatusMoreInfoOnClick={onFunction} alone={false} />
      </ContextAppLoadedProvider>,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
