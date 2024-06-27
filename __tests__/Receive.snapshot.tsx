/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Receive from '../components/Receive';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { AddressKindEnum, CurrencyNameEnum, ReceiverEnum } from '../app/AppState';

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
    state.uaAddress = 'UA-12345678901234567890';
    state.addresses = [
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'UA-12345678901234567890',
        addressKind: AddressKindEnum.u,
        containsPending: false,
        receivers: ReceiverEnum.o + ReceiverEnum.z + ReceiverEnum.t,
      },
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'sapling-12345678901234567890',
        addressKind: AddressKindEnum.z,
        containsPending: false,
        receivers: ReceiverEnum.z,
      },
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'transparent-12345678901234567890',
        addressKind: AddressKindEnum.t,
        containsPending: false,
        receivers: ReceiverEnum.t,
      },
    ];
    state.translate = () => 'text translated';
    state.info.currencyName = CurrencyNameEnum.ZEC;
    state.totalBalance.total = 1.12345678;
    const onFunction = jest.fn();
    const receive = render(
      <ContextAppLoadedProvider value={state}>
        <Receive
          setUaAddress={onFunction}
          toggleMenuDrawer={onFunction}
          setPrivacyOption={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
